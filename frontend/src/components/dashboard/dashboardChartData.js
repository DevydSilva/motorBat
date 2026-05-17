/**
 * Dados derivados para gráficos do dashboard (labels e séries a partir de totais agregados).
 */
const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul"];
const WEEK_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/** Séries estáveis a partir dos totais reais (cada período gera curvas diferentes). */
export function buildStockSeries(period, summary) {
  const total = Number(summary.totalStock) || 0;
  const items = Math.max(1, Number(summary.totalItems) || 1);
  const avg = Math.min(48, Math.max(10, Math.round(total / items)));
  const noise = (i, m) => ((i * 7 + m + total + items) % 9) - 4;

  if (period === "mes") {
    return MONTH_LABELS.map((label, i) => {
      const atual = Math.max(8, Math.min(50, Math.round(avg * 0.52 + i * 3.2 + noise(i, 1) * 0.35)));
      const ideal = Math.max(6, Math.min(45, Math.round(avg * 0.4 + i * 2.4 + noise(i, 2) * 0.25)));
      return { label, atual, ideal: Math.min(ideal, atual - 2) };
    });
  }

  if (period === "semana") {
    return WEEK_LABELS.map((label, i) => {
      const base = avg * 0.48 + ((total + i * 11) % 5);
      const atual = Math.max(8, Math.min(50, Math.round(base + i * 1.85 + noise(i, 3))));
      const ideal = Math.max(6, Math.min(46, Math.round(avg * 0.36 + i * 1.4 + noise(i, 4) * 0.3)));
      return { label, atual, ideal: Math.min(ideal, atual - 3) };
    });
  }

  return Array.from({ length: 7 }, (_, i) => {
    const label = `Dia ${i + 1}`;
    const atual = Math.max(8, Math.min(50, Math.round(avg * 0.46 + i * 2.5 + ((i + total) % 6))));
    const idealRaw = Math.max(6, Math.min(44, Math.round(avg * 0.34 + i * 1.75)));
    return { label, atual, ideal: Math.min(idealRaw, atual - 2) };
  });
}
