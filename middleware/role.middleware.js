function hasRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) return res.redirect("/auth/login");
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).render("errors/403", {
        title: "Acesso negado",
        message: "Não tens permissão para aceder a esta página."
      });
    }
    return next();
  };
}

function isSupermarketApproved(req, res, next) {
  if (req.session.supermarketStatus !== "approved") {
    return res.render("supermarket/pending", {
      title: "Conta pendente",
      status: req.session.supermarketStatus || "pending"
    });
  }
  return next();
}

module.exports = { hasRole, isSupermarketApproved };
