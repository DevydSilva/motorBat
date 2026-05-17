/**
 * Página inicial após login: KPIs, gráficos de movimentações, alertas de stock baixo e resumo.
 */
import { useEffect, useMemo, useState } from "react";
import { useHeaderSearch } from "@/context/HeaderSearchContext";
import { isGenericDashboardPanelQuery, rowMatchesQuery } from "@/utils/searchMatch.js";
import {
  fetchMinStockAlerts,
  fetchMovimentacoesPorDia,
  fetchStockSummary,
  fetchSuppliers
} from "@/api";
import DashboardKpis from "../components/dashboard/DashboardKpis";
import DashboardChartsSection from "../components/dashboard/DashboardChartsSection";
import DashboardBottomSection from "../components/dashboard/DashboardBottomSection";
import DashboardMenuSearchShortcuts from "../components/dashboard/DashboardMenuSearchShortcuts";

function DashboardPage() {
  const { query: headerSearch } = useHeaderSearch();
  const [alerts, setAlerts] = useState([]);
  const [suppliersCount, setSuppliersCount] = useState(0);
  const [summary, setSummary] = useState({ totalItems: 0, totalStock: 0, byMaterial: [] });
  const [movimentacoesSerie, setMovimentacoesSerie] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [alertsData, summaryData, suppliersData, movData] = await Promise.all([
          fetchMinStockAlerts(),
          fetchStockSummary(),
          fetchSuppliers(),
          fetchMovimentacoesPorDia(14)
        ]);
        setAlerts(alertsData);
        setSummary(summaryData);
        setSuppliersCount(suppliersData.length);
        setMovimentacoesSerie(Array.isArray(movData?.serie) ? movData.serie : []);
      } catch (_err) {
        setAlerts([]);
        setSuppliersCount(0);
        setMovimentacoesSerie([]);
      }
    };
    load();
  }, []);

  const { categoriesData, categoriesFootnote } = useMemo(() => {
    const rows = summary.byMaterial;
    if (!rows.length) {
      return { categoriesData: [], categoriesFootnote: "" };
    }
    const byStock = {};
    const byCount = {};
    for (const item of rows) {
      const key = String(item.category ?? "").trim() || "Sem categoria";
      byStock[key] = (byStock[key] || 0) + (Number(item.quantity) || 0);
      byCount[key] = (byCount[key] || 0) + 1;
    }
    const totalStock = Object.values(byStock).reduce((a, b) => a + b, 0);
    const useCount = totalStock === 0;
    const src = useCount ? byCount : byStock;
    const categoriesData = Object.entries(src).map(([name, value]) => ({ name, value }));
    const categoriesFootnote = useCount
      ? "Stock atual zero — gráfico por número de matérias-primas em cada categoria."
      : "";
    return { categoriesData, categoriesFootnote };
  }, [summary.byMaterial]);

  const filteredByMaterial = useMemo(() => {
    const rows = summary.byMaterial || [];
    if (!headerSearch.trim()) return rows;
    if (isGenericDashboardPanelQuery(headerSearch)) return rows;
    return rows.filter((m) => rowMatchesQuery(headerSearch, [m.name, m.category, m.id]));
  }, [summary.byMaterial, headerSearch]);

  return (
    <div className="dashboard-page dashboard-page--wide container-fluid px-0 py-0">
      <section className="dashboard-section dashboard-section--kpis">
        <DashboardKpis summary={summary} alertsCount={alerts.length} suppliersCount={suppliersCount} />
      </section>
      <DashboardMenuSearchShortcuts />
      <section className="dashboard-section dashboard-section--charts-main">
        <DashboardChartsSection
          categoriesData={categoriesData}
          categoriesFootnote={categoriesFootnote}
          summary={summary}
          movimentacoesSerie={movimentacoesSerie}
        />
      </section>
      <section className="dashboard-section dashboard-section--bottom-panels mt-1 mb-4">
        <DashboardBottomSection byMaterial={filteredByMaterial} />
      </section>
    </div>
  );
}

export default DashboardPage;
