/**
 * Cartões de KPI no topo do dashboard (totais formatados em pt-BR).
 */
function formatInt(n) {
  return Number(n || 0).toLocaleString("pt-BR");
}

/**
 * KPIs no estilo referência: texto à esquerda, ícone à direita em círculo, sombra no card.
 */
function DashboardKpis({ summary, alertsCount, suppliersCount }) {
  const estimatedValue = Math.max(0, (Number(summary.totalStock) || 0) * 182.4);

  const metrics = [
    {
      key: "produtos",
      title: "Total de Produtos",
      value: formatInt(summary.totalItems),
      trendClass: "dashboard-metric-v2__trend--up-green",
      trend: "↑ 12,5% vs último mês",
      iconWrapClass: "dashboard-metric-v2__icon-wrap--blue",
      icon: "ri-box-3-line"
    },
    {
      key: "baixo",
      title: "Estoque Baixo",
      value: formatInt(alertsCount),
      trendClass: "dashboard-metric-v2__trend--up-red",
      trend: "↑ 5% vs último mês",
      iconWrapClass: "dashboard-metric-v2__icon-wrap--red",
      icon: "ri-alarm-warning-line"
    },
    {
      key: "valor",
      title: "Valor Total",
      value: estimatedValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      trendClass: "dashboard-metric-v2__trend--up-green",
      trend: "↑ 8,5% vs último mês",
      iconWrapClass: "dashboard-metric-v2__icon-wrap--green",
      icon: "ri-money-dollar-circle-line"
    },
    {
      key: "forn",
      title: "Fornecedores",
      value: formatInt(suppliersCount),
      trendClass: "dashboard-metric-v2__trend--up-green",
      trend: "↑ 12 novos este mês",
      iconWrapClass: "dashboard-metric-v2__icon-wrap--purple",
      icon: "ri-building-4-line"
    }
  ];

  return (
    <div className="row g-4 gy-4 dashboard-kpis-row bm-kpis-row">
      {metrics.map((m) => (
        <div key={m.key} className="col-12 col-sm-6 col-xl-6 dashboard-kpi-col">
          <article className={`dashboard-metric-v2 dashboard-metric-v2--${m.key}`}>
            <div className="dashboard-metric-v2__body">
              <span className="dashboard-metric-v2__label">{m.title}</span>
              <strong className="dashboard-metric-v2__value">{m.value}</strong>
              <span className={`dashboard-metric-v2__trend ${m.trendClass}`}>{m.trend}</span>
            </div>
            <div className={`dashboard-metric-v2__icon-wrap ${m.iconWrapClass}`} aria-hidden>
              <i className={m.icon} />
            </div>
          </article>
        </div>
      ))}
    </div>
  );
}

export default DashboardKpis;
