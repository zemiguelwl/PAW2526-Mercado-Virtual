const mongoose = require("mongoose");
const Delivery = require("../models/Delivery");
const Review = require("../models/Review");
const { onCourierAcceptDelivery, onCourierCancelDelivery, onCourierDelivered } = require("../services/order.service");

async function dashboard(req, res) {
  const courierId = req.session.user.id;
  const [activeDelivery, totalDeliveries, topSupermarkets] = await Promise.all([
    Delivery.findOne({ courier: courierId, status: { $in: ["accepted", "picked_up"] } }).populate("order").lean(),
    Delivery.countDocuments({ courier: courierId, status: "delivered" }),
    Delivery.aggregate([
      { $match: { courier: new mongoose.Types.ObjectId(req.session.user.id), status: "delivered" } },
      { $group: { _id: "$supermarket", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "supermarkets",
          localField: "_id",
          foreignField: "_id",
          as: "supermarket"
        }
      },
      { $unwind: { path: "$supermarket", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, supermarketName: "$supermarket.name", total: 1 } }
    ])
  ]);
  res.render("courier/dashboard", { title: "Dashboard Estafeta", activeDelivery, totalDeliveries, topSupermarkets });
}

async function available(req, res) {
  const deliveries = await Delivery.find({ status: "available" }).populate("order").populate("supermarket", "name location").lean();
  res.render("courier/available", { title: "Entregas Disponíveis", deliveries });
}

async function accept(req, res) {
  const courierId = req.session.user.id;
  const activeDelivery = await Delivery.findOne({ courier: courierId, status: { $in: ["accepted", "picked_up"] } });
  if (activeDelivery) {
    req.flash("error", "Já tens uma entrega ativa.");
    return res.redirect("/courier/available");
  }
  const delivery = await Delivery.findOneAndUpdate(
    { _id: req.params.id, status: "available" },
    { courier: courierId, status: "accepted", acceptedAt: new Date(), $push: { statusHistory: { status: "accepted", changedBy: courierId } } },
    { new: true }
  );
  if (!delivery) {
    req.flash("error", "Esta entrega já foi aceite por outro courier.");
    return res.redirect("/courier/available");
  }
   try {
    await onCourierAcceptDelivery(delivery.order, courierId);
    req.flash("success", "Entrega aceite.");
  } catch (err) {
    // Se a transição de estado falhar, reverter delivery para available
    // para que outro estafeta possa aceitar 
    await Delivery.findByIdAndUpdate(delivery._id, {
      courier: null,
      status: "available",
      acceptedAt: null
    });
    req.flash("error", `Erro ao aceitar entrega: ${err.message}`);
  }
  res.redirect("/courier/dashboard");
}

async function pickedUp(req, res) {
  const delivery = await Delivery.findOne({ _id: req.params.id, courier: req.session.user.id });
  if (!delivery || delivery.status !== "accepted") {
    req.flash("error", "Só podes marcar levantamento em entregas aceites.");
    return res.redirect("/courier/dashboard");
  }
  delivery.status = "picked_up";
  delivery.statusHistory.push({ status: "picked_up", changedBy: req.session.user.id });
  await delivery.save();
  req.flash("success", "Pedido levantado.");
  res.redirect("/courier/dashboard");
}

async function delivered(req, res) {
  try {
    await onCourierDelivered(req.params.id, req.session.user.id);
    req.flash("success", "Entrega concluída.");
  } catch (error) {
    req.flash("error", error.message);
  }
  res.redirect("/courier/history");
}

async function cancel(req, res) {
  try {
    await onCourierCancelDelivery(req.params.id, req.session.user.id, req.body.reason);
    req.flash("success", "Entrega cancelada e novamente disponível.");
  } catch (error) {
    req.flash("error", error.message);
  }
  return res.redirect("/courier/dashboard");
}

async function history(req, res) {
  const deliveries = await Delivery.find({ courier: req.session.user.id }).populate("order").sort({ createdAt: -1 }).lean();
  res.render("courier/history", { title: "Histórico", deliveries });
}

async function reviews(req, res) {
  const reviews = await Review.find({ targetType: "courier", targetId: req.session.user.id, isVisible: true }).lean();
  const averageRating = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : 0;
  res.render("courier/reviews/index", { title: "Avaliações", reviews, averageRating });
}

module.exports = { dashboard, available, accept, pickedUp, delivered, cancel, history, reviews };
