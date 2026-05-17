/**
 * Envio de e-mail via Nodemailer (SMTP). Usado por alertas de compras e rotinas similares.
 */
import nodemailer from "nodemailer";

/** True se host e destinatário de alerta estão definidos. */
function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.ALERT_EMAIL_TO?.trim());
}

export function isAlertEmailConfigured(): boolean {
  return smtpConfigured();
}

/**
 * Envia HTML para compras / alertas. Requer SMTP_HOST + ALERT_EMAIL_TO; opcionalmente SMTP_PORT (587), SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE=true.
 */
export async function sendAlertEmail(subject: string, html: string): Promise<void> {
  if (!smtpConfigured()) {
    throw new Error(
      "E-mail não configurado: defina SMTP_HOST e ALERT_EMAIL_TO no .env",
    );
  }

  const host = process.env.SMTP_HOST!.trim();
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS ?? "";

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth:
      user && user.length > 0
        ? { user, pass }
        : undefined,
  });

  const to = process.env
    .ALERT_EMAIL_TO!.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const from =
    process.env.SMTP_FROM?.trim() ||
    user ||
    `"Batmotor Alertas" <noreply@batmotor.local>`;

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
}
