const mongoose = require("mongoose");
const Supermarket = require("../models/Supermarket");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Coupon = require("../models/Coupon");
const Review = require("../models/Review");
const Delivery = require("../models/Delivery");
const { transitionOrderStatus } = require("../services/order.service");
const { validateAndApply } = require("../services/coupon.service");

async function dashboard(req, res) {
  const supermarketId = req.session.user.supermarketId;
  const [pendingOrders, totalOrders, lowStockProducts, topProducts] = await Promise.all([
    Order.countDocuments({ supermarket: supermarketId, status: "pending" }),
    Order.countDocuments({ supermarket: supermarketId }),
    Product.find({ supermarket: supermarketId, isActive: true, stock: { $lte: 5 } }).lean(),
    Order.aggregate([
      { $match: { supermarket: new mongoose.Types.ObjectId(supermarketId), status: "delivered" } },
      { $unwind: "$items" },
      { $group: { _id: "$items.productName", totalSold: { $sum: "$items.quantity" } } },
      { $sort: { totalSold: -1 } },
      { $limit: 5 }
    ])
  ]);
  res.render("supermarket/dashboard", { title: "Dashboard Supermercado", pendingOrders, totalOrders, lowStockProducts, topProducts });
}

async function profile(req, res) {
  const supermarket = await Supermarket.findById(req.session.user.supermarketId).lean();
  res.render("supermarket/profile", { title: "Perfil", supermarket, categories: [] });
}
async function updateProfile(req, res) {
  const supermarket = await Supermarket.findById(req.session.user.supermarketId);
  if (!supermarket) return res.status(404).render("errors/404", { title: "Supermercado não encontrado" });
  Object.assign(supermarket, {
    name: req.body.name, description: req.body.description, location: req.body.location, phone: req.body.phone,
    isOpen: req.body.isOpen === "on",
    schedule: {
      monday: req.body.monday || "Fechado",
      tuesday: req.body.tuesday || "Fechado",
      wednesday: req.body.wednesday || "Fechado",
      thursday: req.body.thursday || "Fechado",
      friday: req.body.friday || "Fechado",
      saturday: req.body.saturday || "Fechado",
      sunday: req.body.sunday || "Fechado"
    },
    deliveryMethods: [
      { type: "pickup", label: "Levantamento em loja", cost: Number(req.body.pickupCost || 0), active: req.body.pickupActive === "on" },
      { type: "courier", label: "Entrega ao domicílio", cost: Number(req.body.courierCost || 0), active: req.body.courierActive === "on" },
      { type: "instore", label: "Venda presencial", cost: 0, active: true }
    ]
  });
  await supermarket.save();
  req.flash("success", "Perfil atualizado.");
  res.redirect("/supermarket/profile");
}

async function toggleOpen(req, res) {
  const supermarket = await Supermarket.findById(req.session.user.supermarketId);
  if (!supermarket) return res.redirect("/supermarket/profile");
  supermarket.isOpen = !supermarket.isOpen;
  await supermarket.save();
  req.flash("success", `Supermercado ${supermarket.isOpen ? "aberto" : "fechado"}.`);
  return res.redirect("/supermarket/profile");
}

async function orders(req, res) {
  const statusOrder = ["pending", "confirmed", "preparing", "ready", "in_delivery", "delivered", "cancelled"];
  const raw = await Order.find({ supermarket: req.session.user.supermarketId }).sort({ createdAt: -1 }).lean();
  const orders = raw.sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));
  res.render("supermarket/orders/index", { title: "Encomendas", orders });
}
async function orderDetail(req, res) {
  const order = await Order.findOne({ _id: req.params.id, supermarket: req.session.user.supermarketId }).lean();
  const delivery = await Delivery.findOne({ order: req.params.id }).lean();
  if (!order) return res.status(404).render("errors/404", { title: "Não encontrado" });
  res.render("supermarket/orders/detail", { title: "Detalhe", order, delivery });
}

async function changeOrderStatus(req, res, status, reason) {
  try {
    const order = await Order.findById(req.params.id).select("supermarket");
    if (!order || String(order.supermarket) !== String(req.session.user.supermarketId)) {
      return res.status(403).render("errors/403", { message: "Sem permissão para esta encomenda." });
    }
    await transitionOrderStatus(req.params.id, status, req.session.user.id, reason);
    req.flash("success", `Encomenda atualizada para ${status}.`);
  } catch (err) {
    req.flash("error", err.message);
  }
  res.redirect("/supermarket/orders");
}

const confirmOrder = (req, res) => changeOrderStatus(req, res, "confirmed", "Confirmada pelo supermercado");
const rejectOrder = (req, res) => changeOrderStatus(req, res, "cancelled", req.body.reason || "Rejeitada pelo supermercado");
const startPreparing = (req, res) => changeOrderStatus(req, res, "preparing", "Preparação iniciada");
const markReady = (req, res) => changeOrderStatus(req, res, "ready", "Pronta para levantamento");
const markDelivered = (req, res) => changeOrderStatus(req, res, "delivered", "Levantada pelo cliente");

async function coupons(req, res) {
  const coupons = await Coupon.find({ supermarket: req.session.user.supermarketId }).lean();
  res.render("supermarket/coupons/index", { title: "Cupões", coupons });
}

async function createCoupon(req, res) {
  try {
    await Coupon.create({
      code: String(req.body.code || "").toUpperCase().trim(),
      description: req.body.description || "",
      discountType: req.body.discountType,
      discountValue: Number(req.body.discountValue),
      minOrderValue: Number(req.body.minOrderValue || 0),
      maxUses: Number(req.body.maxUses) > 0 ? Number(req.body.maxUses) : null,
      validFrom: req.body.validFrom,
      validUntil: req.body.validUntil,
      supermarket: req.session.user.supermarketId,
      createdBy: req.session.user.id,
      sentToUsers: []
    });
    req.flash("success", "Cupão criado.");
  } catch (err) {
    if (err.code === 11000) {
      req.flash("error", "Já existe um cupão com este código para este supermercado.");
    } else {
      req.flash("error", "Erro ao criar cupão: " + err.message);
    }
  }
  res.redirect("/supermarket/coupons");
}

function createCouponForm(req, res) {
  return res.render("supermarket/coupons/create", { title: "Criar Cupão", errors: [] });
}

async function updateCoupon(req, res) {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) return res.redirect("/supermarket/coupons");
  if (String(coupon.supermarket) !== String(req.session.user.supermarketId)) {
    return res.status(403).render("errors/403", { message: "Sem permissão." });
  }
  coupon.description = req.body.description || coupon.description;
  coupon.discountType = req.body.discountType || coupon.discountType;
  coupon.discountValue = Number(req.body.discountValue || coupon.discountValue);
  coupon.minOrderValue = Number(req.body.minOrderValue || coupon.minOrderValue);
  coupon.maxUses = Number(req.body.maxUses) > 0 ? Number(req.body.maxUses) : null;
  coupon.validFrom = req.body.validFrom || coupon.validFrom;
  coupon.validUntil = req.body.validUntil || coupon.validUntil;
  await coupon.save();
  req.flash("success", "Cupão atualizado.");
  return res.redirect("/supermarket/coupons");
}
async function deleteCoupon(req, res) {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) return res.redirect("/supermarket/coupons");
  if (String(coupon.supermarket) !== String(req.session.user.supermarketId)) {
    return res.status(403).render("errors/403", { message: "Sem permissão." });
  }
  coupon.isActive = false;
  await coupon.save();
  req.flash("success", "Cupão desativado.");
  return res.redirect("/supermarket/coupons");
}

async function reviews(req, res) {
  const reviews = await Review.find({
    targetType: "supermarket",
    targetId: req.session.user.supermarketId,
    isVisible: true
  })
    .sort({ createdAt: -1 })
    .lean();
  const averageRating = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : 0;
  res.render("supermarket/reviews/index", { title: "Avaliações", reviews, averageRating });
}
async function replyReview(req, res) {
  const review = await Review.findById(req.params.id);
  if (!review || String(review.targetId) !== String(req.session.user.supermarketId)) {
    return res.status(403).render("errors/403", { message: "Sem permissão." });
  }
  await Review.findByIdAndUpdate(req.params.id, { "reply.text": req.body.reply, "reply.repliedAt": new Date() });
  req.flash("success", "Resposta publicada.");
  res.redirect("/supermarket/reviews");
}

async function reviewForm(req, res) {
  const order = await Order.findOne({ _id: req.params.id, supermarket: req.session.user.supermarketId }).lean();
  if (!order) return res.status(404).render("errors/404", { title: "Encomenda não encontrada" });
  if (order.status !== "delivered") {
    req.flash("error", "Só é possível avaliar encomendas entregues.");
    return res.redirect(`/supermarket/orders/${order._id}`);
  }
  if (order.reviewSubmitted) {
    req.flash("error", "A avaliação desta encomenda já foi registada.");
    return res.redirect(`/supermarket/orders/${order._id}`);
  }
  const delivery = await Delivery.findOne({ order: req.params.id }).lean();
  return res.render("supermarket/orders/review", { title: "Registar Avaliação", order, delivery });
}

module.exports = {
  dashboard, profile, updateProfile, orders, orderDetail, confirmOrder, rejectOrder, startPreparing, markReady, markDelivered,
  coupons, createCoupon, createCouponForm, updateCoupon, deleteCoupon, reviews, replyReview, toggleOpen, reviewForm
};
