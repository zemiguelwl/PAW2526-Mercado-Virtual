const Order = require("../models/Order");
const Delivery = require("../models/Delivery");
const User = require("../models/User");
const emailService = require("./email.service");

// Define transições válidas de estado para o ciclo de vida da encomenda.
// O serviço centraliza a lógica para evitar alterações incoerentes diretas em controllers.
const VALID_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "in_delivery", "cancelled"],
  ready: ["delivered", "cancelled"],
  in_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: []
};

async function transitionOrderStatus(orderId, newStatus, changedByUserId, reason = null) {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Encomenda não encontrada");

  const allowed = VALID_TRANSITIONS[order.status] || [];
  if (!allowed.includes(newStatus)) throw new Error(`Transição inválida: ${order.status} → ${newStatus}`);

  if (newStatus === "cancelled" && changedByUserId) {
    const user = await User.findById(changedByUserId);
    if (user && user.role === "client" && order.confirmedAt) {
      const minutesElapsed = (Date.now() - order.confirmedAt.getTime()) / 1000 / 60;
      if (minutesElapsed > 5) throw new Error("O prazo de cancelamento de 5 minutos já expirou.");
    }
  }

  order.status = newStatus;
  order.statusHistory.push({ status: newStatus, changedBy: changedByUserId, reason });

  if (newStatus === "confirmed") order.confirmedAt = new Date();
  if (newStatus === "preparing" && order.deliveryMethod === "courier") {
    // Criar a delivery apenas quando a encomenda prepara para entrega por estafeta
    const existing = await Delivery.findOne({ order: order._id, status: { $ne: "cancelled" } });
    if (!existing) {
      await Delivery.create({
        order: order._id,
        supermarket: order.supermarket,
        status: "available",
        statusHistory: [{ status: "available", changedBy: changedByUserId }]
      });
    }
  }

  if (newStatus === "cancelled") {
    // Se houver uma delivery ligada a esta encomenda, cancelá-la também.
    const delivery = await Delivery.findOne({ order: order._id, status: { $in: ["available", "accepted", "picked_up"] } });
    if (delivery) {
      delivery.status = "cancelled";
      delivery.statusHistory.push({ status: "cancelled", changedBy: changedByUserId, reason: "Encomenda cancelada" });
      await delivery.save();
    }
  }

  await order.save();

  // uma falha não deve bloquear nem reverter a transição de estado.
  try {
    const cancelReason = newStatus === "cancelled" ? reason : null;
    await emailService.sendOrderStatusUpdate(order, newStatus, cancelReason);
  } catch (emailErr) {
    console.error("transitionOrderStatus: falha ao enviar email:", emailErr.message);
  }

  return order;
}

async function onCourierAcceptDelivery(orderId, courierId) {
  return transitionOrderStatus(orderId, "in_delivery", courierId, "Courier aceitou a entrega");
}

async function onCourierCancelDelivery(deliveryId, courierId, reason) {
  const delivery = await Delivery.findOne({ _id: deliveryId, courier: courierId });
  if (!delivery) throw new Error("Entrega não encontrada ou não pertence ao courier.");
  if (!["accepted", "picked_up"].includes(delivery.status)) {
    throw new Error("Só podes cancelar entregas aceites ou levantadas.");
  }

  delivery.status = "available";
  delivery.courier = null;
  delivery.acceptedAt = null;
  delivery.statusHistory.push({
    status: "cancelled",
    changedBy: courierId,
    reason: reason || "Cancelada pelo courier"
  });
  delivery.statusHistory.push({
    status: "available",
    changedBy: courierId,
    reason: "Entrega novamente disponível para atribuição"
  });
  await delivery.save();

  const order = await Order.findById(delivery.order);
  if (!order) throw new Error("Encomenda associada não encontrada.");
  order.status = "preparing";
  order.statusHistory.push({
    status: "preparing",
    changedBy: courierId,
    reason: "Courier cancelou entrega. Voltou a preparação."
  });
  await order.save();
  return { order, delivery };
}

async function onCourierDelivered(deliveryId, courierId) {
  const delivery = await Delivery.findOne({ _id: deliveryId, courier: courierId });
  if (!delivery) throw new Error("Entrega não encontrada ou não pertence ao courier.");
  if (delivery.status !== "picked_up") {
    throw new Error("Só podes marcar como entregue após levantar o pedido.");
  }

  delivery.status = "delivered";
  delivery.deliveredAt = new Date();
  delivery.statusHistory.push({ status: "delivered", changedBy: courierId });
  await delivery.save();

  const order = await transitionOrderStatus(delivery.order, "delivered", courierId, "Entregue pelo courier");
  return { order, delivery };
}

async function createPOSSale(orderData, cashierId) {
  const order = new Order({
    ...orderData,
    source: "pos",
    status: "delivered",
    confirmedAt: new Date(),
    statusHistory: [
      { status: "confirmed", changedBy: cashierId, reason: "Venda registada em caixa" },
      { status: "preparing", changedBy: cashierId, reason: "Preparação imediata (venda presencial)" },
      { status: "delivered", changedBy: cashierId, reason: "Entrega imediata (venda presencial)" }
    ]
  });
  await order.save();
  return order;
}

module.exports = {
  transitionOrderStatus,
  onCourierAcceptDelivery,
  onCourierCancelDelivery,
  onCourierDelivered,
  createPOSSale
};
