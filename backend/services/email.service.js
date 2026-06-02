const nodemailer = require("nodemailer");

function createTransporter() {
  if (process.env.NODE_ENV === "test") return null;

  // Modo 1: SMTP genérico (Gmail, SendGrid, alojamento próprio, etc.)
  // Ativar definindo EMAIL_SMTP_HOST no .env
  if (process.env.EMAIL_SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_SMTP_HOST,
      port: parseInt(process.env.EMAIL_SMTP_PORT || "587", 10),
      secure: process.env.EMAIL_SMTP_SECURE === "true",
      auth: {
        user: process.env.EMAIL_SMTP_USER,
        pass: process.env.EMAIL_SMTP_PASS,
      },
    });
  }

  // Modo 2: Mailtrap (Sandbox ou Sending API)
  // Com MAILTRAP_INBOX_ID → Sandbox (emails visíveis no mailtrap.io, não chegam ao destinatário)
  // Sem MAILTRAP_INBOX_ID → Sending API (envia emails reais, requer domínio verificado no Mailtrap)
  if (process.env.EMAIL_API_TOKEN) {
    const { MailtrapTransport } = require("mailtrap");
    const config = { token: process.env.EMAIL_API_TOKEN };
    if (process.env.MAILTRAP_INBOX_ID) {
      config.testInboxId = parseInt(process.env.MAILTRAP_INBOX_ID, 10);
    }
    return nodemailer.createTransport(MailtrapTransport(config));
  }

  return null;
}

const transporter = createTransporter();

if (transporter) {
  let mode = "Mailtrap Sending API";
  if (process.env.EMAIL_SMTP_HOST) mode = "SMTP";
  else if (process.env.MAILTRAP_INBOX_ID) mode = "Mailtrap Sandbox";
  console.log(`Servidor de email configurado: ${mode}`);
} else {
  console.warn("AVISO: Email não configurado. O registo de utilizadores ficará bloqueado.");
}

const STATUS_LABELS = {
  confirmed: "Confirmada",
  preparing: "Em preparação",
  ready: "Pronta para levantamento",
  in_delivery: "Em entrega",
  delivered: "Entregue",
  cancelled: "Cancelada",
};

function orderRefFromId(orderId) {
  return String(orderId).slice(-6).toUpperCase();
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendVerificationEmail(toEmail, userName, code) {
  if (!transporter) {
    throw new Error("Serviço de email não configurado. Verifica as variáveis EMAIL_SMTP_* ou EMAIL_API_TOKEN no .env");
  }
  return transporter.sendMail({
    from: { address: process.env.EMAIL_FROM, name: "Mercadinho Virtual" },
    to: toEmail,
    subject: "Confirma o teu email | Mercadinho Virtual",
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
        <h2>Olá, ${escapeHtml(userName)}!</h2>
        <p>O teu código de verificação (válido 15 minutos):</p>
        <p style="text-align:center;margin:24px 0">
          <span style="display:inline-block;background:#ecfdf5;border:2px dashed #059669;color:#047857;
                       font-size:32px;font-weight:700;letter-spacing:8px;padding:16px 32px;border-radius:8px">
            ${escapeHtml(code)}
          </span>
        </p>
        <p style="color:#666;font-size:13px">Se não criaste conta no Mercadinho Virtual, ignora este email.</p>
      </div>
    `,
  });
}

async function sendOrderStatusUpdate(order, newStatus, cancelReason = null) {
  try {
    if (!transporter) return;
    if (!order?.client?.email) return;
    const relevant = ["confirmed", "preparing", "ready", "in_delivery", "delivered", "cancelled"];
    if (!relevant.includes(newStatus)) return;

    const orderRef = orderRefFromId(order._id);
    const statusLabel = STATUS_LABELS[newStatus] || newStatus;
    const clientName = order.client.name || "Cliente";
    const total = typeof order.total === "number" ? order.total.toFixed(2) : "—";
    const reasonBlock =
      newStatus === "cancelled" && cancelReason
        ? `<p><strong>Motivo:</strong> ${escapeHtml(cancelReason)}</p>`
        : "";

    await transporter.sendMail({
      from: { address: process.env.EMAIL_FROM, name: "Mercadinho Virtual" },
      to: order.client.email,
      subject: `Encomenda #${orderRef} — ${statusLabel}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:520px">
          <h2>Atualização da encomenda</h2>
          <p>Olá, ${escapeHtml(clientName)}!</p>
          <p><strong>Referência:</strong> #${escapeHtml(orderRef)}</p>
          <p><strong>Estado:</strong> ${escapeHtml(statusLabel)}</p>
          <p><strong>Total:</strong> €${escapeHtml(total)}</p>
          ${reasonBlock}
          <p style="color:#666;font-size:13px">Mercadinho Virtual</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("sendOrderStatusUpdate:", err.message);
  }
}

async function sendCouponEmail(toEmail, userName, couponCode, discountDescription, expiresAt) {
  if (!transporter) return false;
  try {
    await transporter.sendMail({
      from: { address: process.env.EMAIL_FROM, name: "Mercadinho Virtual" },
      to: toEmail,
      subject: `Cupão exclusivo: ${couponCode} | Mercadinho Virtual`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px">
          <div style="background:linear-gradient(135deg,#0d9488,#059669);color:#fff;padding:20px;border-radius:10px;text-align:center">
            <h1 style="margin:0;font-size:22px">Cupão exclusivo para ti</h1>
            <p style="margin:8px 0 0;opacity:.95">Olá, ${escapeHtml(userName)}!</p>
          </div>
          <div style="background:#fff;padding:24px;border-radius:10px;margin-top:16px">
            <p style="font-size:16px;color:#334155">${escapeHtml(discountDescription)}</p>
            <p style="text-align:center;margin:24px 0">
              <span style="display:inline-block;background:#ecfdf5;border:2px dashed #059669;color:#047857;
                           font-size:20px;font-weight:700;letter-spacing:2px;padding:12px 24px;border-radius:8px">
                ${escapeHtml(couponCode)}
              </span>
            </p>
            <p style="color:#64748b;font-size:14px"><strong>Válido até:</strong> ${escapeHtml(expiresAt)}</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("sendCouponEmail:", err.message);
    return false;
  }
}

module.exports = { sendVerificationEmail, sendOrderStatusUpdate, sendCouponEmail };
