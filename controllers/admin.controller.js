const User = require("../models/User");
const Supermarket = require("../models/Supermarket");
const Order = require("../models/Order");
const Category = require("../models/Category");
const Coupon = require("../models/Coupon");
const Review = require("../models/Review");
const { transitionOrderStatus } = require("../services/order.service");
const couponService = require("../services/coupon.service");

async function dashboard(req, res) {
  const [totalUsers, activeSupermarkets, totalOrders, pendingSupermarkets] = await Promise.all([
    User.countDocuments({ role: { $ne: "admin" } }),
    Supermarket.countDocuments({ status: "approved" }),
    Order.countDocuments(),
    Supermarket.find({ status: "pending" }).populate("user", "name email").limit(5).lean()
  ]);
  res.render("admin/dashboard", { title: "Dashboard Admin", totalUsers, activeSupermarkets, totalOrders, pendingSupermarkets });
}

async function supermarkets(req, res) {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const supermarkets = await Supermarket.find(filter).populate("user", "name email phone").lean();
  res.render("admin/supermarkets", { title: "Supermercados", supermarkets, currentStatus: req.query.status || "" });
}

async function approveSupermarket(req, res) {
  const supermarket = await Supermarket.findById(req.params.id);
  if (!supermarket) return res.redirect("/admin/supermarkets");
  supermarket.status = "approved";
  await supermarket.save();
  req.flash("success", "Supermercado aprovado.");
  return res.redirect("/admin/supermarkets");
}

async function rejectSupermarket(req, res) {
  await Supermarket.findByIdAndUpdate(req.params.id, { status: "rejected", rejectionReason: req.body.reason || "Sem motivo." });
  req.flash("success", "Supermercado rejeitado.");
  return res.redirect("/admin/supermarkets");
}

async function users(req, res) {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  const users = await User.find(filter).select("-password").lean();
  res.render("admin/users", { title: "Utilizadores", users, currentRole: req.query.role || "" });
}
async function deactivateUser(req, res) {
  await User.updateOne({ _id: req.params.id, role: { $ne: "admin" } }, { isActive: false });
  req.flash("success", "Utilizador desativado.");
  res.redirect("/admin/users");
}
async function activateUser(req, res) {
  await User.updateOne({ _id: req.params.id }, { isActive: true });
  req.flash("success", "Utilizador ativado.");
  res.redirect("/admin/users");
}

async function categories(req, res) {
  const categories = await Category.find().lean();
  res.render("admin/categories", { title: "Categorias", categories });
}
async function createCategory(req, res) {
  await Category.create({ name: req.body.name, description: req.body.description, createdBy: req.session.user.id });
  req.flash("success", "Categoria criada.");
  res.redirect("/admin/categories");
}
async function updateCategory(req, res) {
  await Category.findByIdAndUpdate(req.params.id, { name: req.body.name, description: req.body.description });
  req.flash("success", "Categoria atualizada.");
  res.redirect("/admin/categories");
}
async function deleteCategory(req, res) {
  await Category.findByIdAndUpdate(req.params.id, { isActive: false });
  req.flash("success", "Categoria desativada.");
  res.redirect("/admin/categories");
}

async function orders(req, res) {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const orders = await Order.find(filter).populate("supermarket").sort({ createdAt: -1 }).lean();
  res.render("admin/orders", { title: "Encomendas", orders, filters: req.query });
}
async function orderDetail(req, res) {
  const order = await Order.findById(req.params.id).populate("supermarket").lean();
  if (!order) return res.status(404).render("errors/404", { title: "Encomenda não encontrada" });
  res.render("admin/order-detail", { title: "Detalhe da Encomenda", order });
}
async function forceCancelOrder(req, res) {
  try {
    await transitionOrderStatus(req.params.id, "cancelled", req.session.user.id, req.body.reason || "Cancelado pelo admin");
    req.flash("success", "Encomenda cancelada.");
  } catch (err) {
    req.flash("error", `Não foi possível cancelar a encomenda: ${err.message}`);
  }
  res.redirect("/admin/orders");
}

async function coupons(req, res) {
  const coupons = await Coupon.find({ supermarket: null }).sort({ createdAt: -1 }).lean();
  const couponsWithStats = coupons.map((c) => ({
    ...c,
    sentCount: Array.isArray(c.sentToUsers) ? c.sentToUsers.length : 0
  }));
  res.render("admin/coupons", {
    title: "Cupões Globais",
    coupons: couponsWithStats
  });
}
function createCouponForm(req, res) {
  return res.render("admin/coupon-create", { title: "Criar Cupão Global" });
}

async function createCoupon(req, res) {
  const code = String(req.body.code || "").toUpperCase().trim();
  const discountValue = parseFloat(req.body.discountValue);
  const minOrderValue = parseFloat(req.body.minOrderValue || 0);
  const maxUses = parseInt(req.body.maxUses, 10);

  // Validação básica 
  if (!code) {
    req.flash("error", "Código do cupão é obrigatório.");
    return res.redirect("/admin/coupons/create");
  }
  if (isNaN(discountValue) || discountValue < 0) {
    req.flash("error", "Valor de desconto inválido.");
    return res.redirect("/admin/coupons/create");
  }
  if (!req.body.validFrom || !req.body.validUntil) {
    req.flash("error", "Datas de validade são obrigatórias.");
    return res.redirect("/admin/coupons/create");
  }
  if (new Date(req.body.validFrom) >= new Date(req.body.validUntil)) {
    req.flash("error", "A data de início deve ser anterior à data de fim.");
    return res.redirect("/admin/coupons/create");
  }

  try {
    await Coupon.create({
      code,
      description: String(req.body.description || "").trim(),
      discountType: req.body.discountType,
      discountValue,
      minOrderValue: isNaN(minOrderValue) ? 0 : minOrderValue,
      maxUses: !isNaN(maxUses) && maxUses > 0 ? maxUses : null,
      validFrom: new Date(req.body.validFrom),
      validUntil: new Date(req.body.validUntil),
      supermarket: null,
      createdBy: req.session.user.id,
      sentToUsers: []
    });
    req.flash("success", "Cupão criado.");
  } catch (err) {
    if (err.code === 11000) {
      req.flash("error", "Já existe um cupão global com este código.");
    } else {
      req.flash("error", "Erro ao criar cupão: " + err.message);
    }
  }
  res.redirect("/admin/coupons");
}

async function disableCoupon(req, res) {
  const updated = await Coupon.findOneAndUpdate(
    { _id: req.params.id, supermarket: null },
    { isActive: false }
  );
  if (!updated) req.flash("error", "Cupão global não encontrado.");
  else req.flash("success", "Cupão desativado.");
  res.redirect("/admin/coupons");
}

async function toggleCouponActive(req, res) {
  const coupon = await Coupon.findOne({ _id: req.params.id, supermarket: null });
  if (!coupon) {
    req.flash("error", "Cupão global não encontrado.");
    return res.redirect("/admin/coupons");
  }
  coupon.isActive = !coupon.isActive;
  await coupon.save();
  req.flash("success", `Cupão ${coupon.isActive ? "ativado" : "desativado"}.`);
  res.redirect("/admin/coupons");
}

async function updateCoupon(req, res) {
  const updated = await Coupon.findOneAndUpdate(
    { _id: req.params.id, supermarket: null },
    {
      description: req.body.description || "",
      discountType: req.body.discountType,
      discountValue: Number(req.body.discountValue),
      minOrderValue: Number(req.body.minOrderValue || 0),
      maxUses: Number(req.body.maxUses) > 0 ? Number(req.body.maxUses) : null,
      validFrom: req.body.validFrom,
      validUntil: req.body.validUntil
    }
  );
  if (!updated) req.flash("error", "Cupão global não encontrado.");
  else req.flash("success", "Cupão atualizado.");
  res.redirect("/admin/coupons");
}

async function sendCoupon(req, res) {
  try {
    const result = await couponService.sendCouponToAllVerifiedUsers(req.params.id);
    req.flash("success", `Cupão enviado a ${result.sentCount} utilizador(es).`);
  } catch (err) {
    req.flash("error", err.message || "Falha ao enviar cupão.");
  }
  res.redirect("/admin/coupons");
}

async function hideReview(req, res) {
  await Review.findByIdAndUpdate(req.params.id, { isVisible: false });
  req.flash("success", "Review ocultada.");
  res.redirect("back");
}

module.exports = {
  dashboard, supermarkets, approveSupermarket, rejectSupermarket, users, deactivateUser, activateUser,
  categories, createCategory, updateCategory, deleteCategory, orders, orderDetail, forceCancelOrder,
  coupons, createCouponForm, createCoupon, updateCoupon, disableCoupon, toggleCouponActive, sendCoupon, hideReview
};
