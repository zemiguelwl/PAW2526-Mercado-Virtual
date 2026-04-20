// Middleware que protege rotas privadas, garantindo que apenas utilizadores autenticados
// conseguem aceder a páginas sensíveis como dashboards ou páginas de perfil.

function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) return next();
  req.flash("error", "Precisas de estar autenticado para aceder a esta página.");

  // Só redirecionar para next se for um caminho interno válido e não for uma rota de auth.
  // Isto evita loops e não revela destinos sensíveis.
  const dest = req.originalUrl || "/";
  const isAuthRoute = dest.startsWith("/auth/");
  const safeNext = !isAuthRoute && dest.startsWith("/") && !dest.startsWith("//")
    ? dest
    : "";

  const redirectUrl = safeNext
    ? `/auth/login?next=${encodeURIComponent(safeNext)}`
    : "/auth/login";

  return res.redirect(redirectUrl);
}

module.exports = { isAuthenticated };
