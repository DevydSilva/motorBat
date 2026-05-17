/**
 * Gráficos ApexCharts (área/barra): movimentações por dia e cartões auxiliares exportáveis.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Label,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { buildStockSeries } from "./dashboardChartData.js";

const MONTHS_FALLBACK = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const DONUT_COLORS_LEGACY = ["#60a5fa", "#facc15", "#38bdf8", "#34d399", "#eab308"];
/** Ordem referência: roxo, amarelo marca, verde, azul. */
const CATEGORY_PALETTE = ["#a855f7", "#eab308", "#22c55e", "#3b82f6"];

function normalizeCategories(categoriesData) {
  const fallback = [
    { name: "Eletrônicos", value: 40 },
    { name: "Refratários", value: 20 },
    { name: "Orgânicos", value: 40 },
    { name: "Social", value: 20 }
  ];
  if (!categoriesData?.length) {
    const total = fallback.reduce((s, x) => s + x.value, 0) || 1;
    return fallback.map((x) => ({
      ...x,
      pct: Math.round((x.value / total) * 100)
    }));
  }
  const raw = categoriesData
    .map((c) => {
      const v = Number(c?.value);
      const value = Number.isFinite(v) ? Math.max(0, v) : 0;
      const name =
        c?.name != null && String(c.name).trim() ? String(c.name).trim() : "Sem categoria";
      return { name, value };
    })
    .filter((c) => c.value > 0);
  const total = raw.reduce((s, x) => s + x.value, 0);
  if (total === 0) return [];
  return raw.map((x) => ({
    ...x,
    pct: Math.max(0, Math.min(100, Math.round((x.value / total) * 100)))
  }));
}

function StockLegend() {
  return (
    <div className="dashboard-stock-custom-legend">
      <span className="dashboard-stock-custom-legend__item">
        <i className="dashboard-stock-custom-legend__dot dashboard-stock-custom-legend__dot--atual" aria-hidden />
        Quant. Atual de Estoque
      </span>
      <span className="dashboard-stock-custom-legend__item">
        <i className="dashboard-stock-custom-legend__dot dashboard-stock-custom-legend__dot--ideal" aria-hidden />
        Estoque Ideal
      </span>
    </div>
  );
}

function StockControlChart({ summary }) {
  const [period, setPeriod] = useState("mes");

  const data = useMemo(() => buildStockSeries(period, summary), [period, summary]);

  return (
    <div className="card mb-0 dashboard-panel dashboard-panel--light h-100 dashboard-stock-control-card">
      <div className="card-header dashboard-panel__head dashboard-panel__head--tabs d-flex flex-wrap align-items-center justify-content-between gap-3">
        <h5 className="card-title mb-0 dashboard-panel__title-flat">Controle de Estoque</h5>
        <div className="dashboard-stock-period-tabs" role="tablist" aria-label="Período do gráfico">
          {[
            { id: "mes", label: "Mês" },
            { id: "semana", label: "Semana" },
            { id: "dia", label: "Dia" }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={period === tab.id}
              className={`dashboard-stock-period-tabs__btn${period === tab.id ? " is-active" : ""}`}
              onClick={() => setPeriod(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="card-body pt-2">
        <StockLegend />
        <div className="chart-height chart-height--stock-control">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 10, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 50]}
                ticks={[0, 10, 20, 30, 40, 50]}
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 12px rgba(15,39,68,0.1)"
                }}
                labelStyle={{ color: "#0f172a", fontWeight: 700 }}
                itemStyle={{ color: "#334155" }}
              />
              <Line
                type="monotone"
                dataKey="atual"
                name="Quant. Atual de Estoque"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#fff", strokeWidth: 2, stroke: "#2563eb" }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="ideal"
                name="Estoque Ideal"
                stroke="#22c55e"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#fff", strokeWidth: 2, stroke: "#22c55e" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function CategoriesCard({ categoriesData, categoriesFootnote = "" }) {
  const normalized = useMemo(() => normalizeCategories(categoriesData), [categoriesData]);
  const pieData = normalized.map((x) => ({ name: x.name, value: x.value, pct: x.pct }));
  const padAngle = pieData.length > 1 ? 2 : 0;
  const tooltipUnit = categoriesFootnote ? "itens" : "un.";
  const totalUnits = useMemo(() => pieData.reduce((s, p) => s + (Number(p.value) || 0), 0), [pieData]);
  const hasCategoriesFootnote = Boolean(String(categoriesFootnote || "").trim());
  const centerSub = hasCategoriesFootnote
    ? "Total de itens nas categorias"
    : "Total em stock (unidades)";

  return (
    <div className="card mb-0 dashboard-panel dashboard-panel--light h-100 dashboard-categories-card">
      <div className="card-header dashboard-panel__head">
        <h5 className="card-title mb-0 dashboard-panel__title-flat">Categorias</h5>
      </div>
      <div className="card-body d-flex flex-column">
        {categoriesFootnote ? (
          <p className="small dashboard-panel--light-muted-note mb-2 mb-xl-3">{categoriesFootnote}</p>
        ) : null}
        <div className="chart-height chart-height--categories">
          {pieData.length === 0 ? (
            <div className="d-flex align-items-center justify-content-center h-100 dashboard-chart-empty-msg small px-3 text-center">
              Sem dados para o gráfico. Cadastre matérias-primas com categoria e stock em «Produtos».
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="48%"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={padAngle}
                  minAngle={3}
                  startAngle={90}
                  endAngle={-270}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`${pieData[index]?.name}-${index}`} fill={CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      const cx = Number(viewBox?.cx ?? 0);
                      const cy = Number(viewBox?.cy ?? 0);
                      return (
                        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={cx} y={cy - 8} fontSize={20} fontWeight={800} fill="#0f172a">
                            {totalUnits}
                          </tspan>
                          <tspan x={cx} y={cy + 12} fontSize={11} fontWeight={600} fill="#475569">
                            {centerSub}
                          </tspan>
                        </text>
                      );
                    }}
                  />
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} ${tooltipUnit}`, name]}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 12px rgba(15,39,68,0.08)"
                  }}
                  labelStyle={{ color: "#0f172a", fontWeight: 700 }}
                  itemStyle={{ color: "#334155" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <ul className="dashboard-categories-legend list-unstyled mb-0 mt-2">
          {pieData.map((row, index) => (
            <li key={row.name} className="dashboard-categories-legend__row">
              <span
                className="dashboard-categories-legend__swatch"
                style={{ background: CATEGORY_PALETTE[index % CATEGORY_PALETTE.length] }}
              />
              <span className="dashboard-categories-legend__name">{row.name}</span>
              <span className="dashboard-categories-legend__pct">{row.pct}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Barras com quantidades reais de ENTRADA / SAÍDA / AJUSTE por dia (API). */
function EntradaSaidaAlmoxarifadoCard({ serie }) {
  const data = useMemo(() => (Array.isArray(serie) && serie.length > 0 ? serie : []), [serie]);
  const hasMovement = data.some(
    (d) => (Number(d.entrada) || 0) > 0 || (Number(d.saida) || 0) > 0 || (Number(d.ajuste) || 0) !== 0
  );
  const chartData = data.length > 0 ? data : [{ label: "—", entrada: 0, saida: 0, ajuste: 0 }];

  return (
    <div className="card mb-0 dashboard-panel dashboard-panel--light h-100">
      <div className="card-header dashboard-panel__head">
        <div>
          <h5 className="card-title mb-0 dashboard-panel__title-flat">Entradas e saídas (almoxarifado)</h5>
          <p className="small dashboard-panel--light-muted-note mb-0 mt-1">
            Volume diário registrado no sistema — compras (entrada), linha de montagem (saída) e ajustes de
            inventário. Últimos {chartData.length} dias.
          </p>
        </div>
      </div>
      <div className="card-body pt-2">
        {data.length > 0 && !hasMovement ? (
          <p className="dashboard-panel--light-muted-note small mb-2">
            Sem movimentações neste período. Registre entradas e saídas em «Movimentações» para preencher o gráfico.
          </p>
        ) : null}
        <div className="chart-height chart-height--stock-control">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 10, left: 4, bottom: 4 }}
              barGap={2}
              barCategoryGap="18%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#64748b", fontSize: 10 }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 12px rgba(15,39,68,0.1)"
                }}
                labelStyle={{ color: "#0f172a", fontWeight: 700 }}
                itemStyle={{ color: "#334155" }}
              />
              <Legend wrapperStyle={{ color: "#334155" }} />
              <Bar dataKey="entrada" name="Entrada" fill="#22c55e" maxBarSize={32} radius={[4, 4, 0, 0]} />
              <Bar dataKey="saida" name="Saída" fill="#ef4444" maxBarSize={32} radius={[4, 4, 0, 0]} />
              <Bar dataKey="ajuste" name="Ajuste" fill="#ca8a04" maxBarSize={24} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function DashboardChartsSection({
  categoriesData,
  categoriesFootnote = "",
  summary,
  movimentacoesSerie = []
}) {
  return (
    <>
      <div className="row gx-4 gy-4 align-items-stretch dashboard-row--stock-layout">
        <div className="col-12 col-xl-7 dashboard-charts-stock-col">
          <StockControlChart summary={summary} />
        </div>
        <div className="col-12 col-xl-5 dashboard-charts-categories-col">
          <CategoriesCard categoriesData={categoriesData} categoriesFootnote={categoriesFootnote} />
        </div>
      </div>
      <div className="row gx-4 gy-4 align-items-stretch mt-1">
        <div className="col-12">
          <EntradaSaidaAlmoxarifadoCard serie={movimentacoesSerie} />
        </div>
      </div>
    </>
  );
}

export default DashboardChartsSection;

/* Mantidos para outros layouts que importem este módulo */
export function MovimentacoesSemanaCard() {
  const [chartData, setChartData] = useState(() =>
    MONTHS_FALLBACK.map((month, index) => ({
      month,
      sales: 120 + index * 10 + Math.round(Math.random() * 35),
      revenue: 3200 + index * 250 + Math.round(Math.random() * 600)
    }))
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setChartData((prev) =>
        prev.map((item) => ({
          ...item,
          sales: Math.max(80, Math.min(280, item.sales + Math.round((Math.random() - 0.5) * 35))),
          revenue: Math.max(2500, Math.min(8000, item.revenue + Math.round((Math.random() - 0.5) * 550)))
        }))
      );
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="card mb-0 dashboard-panel dashboard-panel--chart">
      <div className="card-header d-flex justify-content-between align-items-center dashboard-panel__head">
        <div>
          <h5 className="card-title mb-1">Movimentacoes da Semana</h5>
          <p className="dashboard-panel__desc mb-0">Curva de volume semanal no mesmo estilo do template principal.</p>
        </div>
        <span className="dashboard-chart__pill">
          <i className="ri-bar-chart-grouped-line" aria-hidden />
          Semana
        </span>
      </div>
      <div className="card-body">
        <div className="chart-height chart-height--movimentacoes">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} barCategoryGap="36%" margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.35)" strokeDasharray="4 4" />
              <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fill: "#3b82f6", fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "#2563eb", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10
                }}
              />
              <Legend wrapperStyle={{ color: "#334155" }} />
              <Bar
                yAxisId="left"
                dataKey="sales"
                name="Saidas"
                fill="#60a5fa"
                maxBarSize={36}
                radius={[12, 12, 12, 12]}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                name="Entradas"
                stroke="#eab308"
                strokeWidth={2}
                fill="#fbbf2433"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export function StatusTarefasCard({ alerts }) {
  const taskData = useMemo(() => {
    const critical = alerts.length;
    const active = Math.max(1, 6 - critical);
    return [
      { name: "Alertas", value: Math.max(critical, 1) },
      { name: "Monitorando", value: active },
      { name: "Resolvidos", value: 4 },
      { name: "Pendentes", value: 3 }
    ];
  }, [alerts]);

  return (
    <div className="card mb-0 dashboard-panel h-100 dashboard-panel--light">
      <div className="card-header d-flex justify-content-between align-items-center dashboard-panel__head">
        <div>
          <h5 className="card-title mb-1">Status de Tarefas</h5>
          <p className="dashboard-panel__desc mb-0">Pendencias operacionais e acompanhamentos do time.</p>
        </div>
        <i className="ri-task-line fs-5 text-warning" />
      </div>
      <div className="card-body">
        <div className="chart-height">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                contentStyle={{ background: "#fff", border: "1px solid #e2e8f0" }}
                labelStyle={{ color: "#1e293b" }}
              />
              <Legend wrapperStyle={{ color: "#334155" }} />
              <Pie data={taskData} dataKey="value" nameKey="name" innerRadius={75} outerRadius={108}>
                {taskData.map((entry, index) => (
                  <Cell key={entry.name} fill={DONUT_COLORS_LEGACY[index % DONUT_COLORS_LEGACY.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
