/**
 * Orquestra o e-mail de “compras”: obtém itens abaixo do mínimo e envia HTML tabular.
 */
import { sendAlertEmail } from "./email.service";
import { listEstoqueAbaixoMinimo } from "./relatorio.service";

/** Escapa texto para inserção segura em HTML (evita XSS no corpo do e-mail). */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Monta e envia e-mail para a equipe de compras com itens abaixo do estoque mínimo.
 */
export async function enviarEmailAlertaCompras(): Promise<{
  enviado: boolean;
  total_alertas: number;
  destinatarios: number;
}> {
  const rows = await listEstoqueAbaixoMinimo();
  const toCount = (process.env.ALERT_EMAIL_TO ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean).length;

  const linhas =
    rows.length === 0
      ? "<p>Nenhum item abaixo do estoque mínimo no momento.</p>"
      : `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
<thead><tr style="background:#1e3a8a;color:#fff;"><th>Matéria-prima</th><th>Categoria</th><th>Atual</th><th>Mínimo</th><th>Déficit</th></tr></thead>
<tbody>
${rows
  .map(
    (r) =>
      `<tr><td>${escapeHtml(r.nome)}</td><td>${escapeHtml(r.categoria)}</td><td>${r.quantidade_atual}</td><td>${r.estoque_minimo}</td><td>${r.deficit}</td></tr>`,
  )
  .join("\n")}
</tbody></table>`;

  const html = `
<!DOCTYPE html><html><body style="font-family:sans-serif;">
<p><strong>Batmotor — Alerta de estoque (compras)</strong></p>
<p>Gerado em: ${new Date().toLocaleString("pt-BR")}</p>
<p>Total de alertas: <strong>${rows.length}</strong></p>
${linhas}
<p style="color:#64748b;font-size:12px;">Mensagem automática do sistema de almoxarifado.</p>
</body></html>`;

  const subject =
    rows.length === 0
      ? "[Batmotor] Estoque mínimo — sem alertas no momento"
      : `[Batmotor] ${rows.length} insumo(s) abaixo do estoque mínimo — ação de compras`;

  await sendAlertEmail(subject, html);

  return {
    enviado: true,
    total_alertas: rows.length,
    destinatarios: toCount,
  };
}
