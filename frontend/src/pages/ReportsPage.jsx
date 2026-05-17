/**
 * =============================================================================
 * ReportsPage — Relatórios de stock (matéria-prima) e alertas abaixo do mínimo
 * =============================================================================
 * Dados: fetchStockSummary / fetchMinStockAlerts (@/api) agregam matérias-primas (e mock).
 * Permissões: botões de e-mail, PDF e Excel só se canManageInventory (gerência/admin).
 * UI: classes `bm-reports-page__*` + folha `styles/reports-page.css` (isolada do resto do CSS).
 * Exportações: jsPDF + autoTable; Excel via downloadXlsxWorkbook.
 * Documentação global: docs/GUIA_PEDAGOGICO_BATMOTOR.md
 * =============================================================================
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useEffect, useMemo, useState } from "react";
import { fetchMinStockAlerts, fetchStockSummary, sendLowStockAlertEmail } from "@/api";
import { usePermissions } from "@/context/PermissionsContext";
import { useHeaderSearch } from "@/context/HeaderSearchContext";
import { rowMatchesQuery } from "@/utils/searchMatch.js";
import { downloadXlsxWorkbook } from "@/utils/exportXlsx";
import { addBatmotorPdfHeader } from "@/utils/batmotorExportBrand";
import "../styles/reports-page.css";

function formatInt(n) {
  return Number(n || 0).toLocaleString("pt-BR");
}

function ReportsPage() {
  const { canManageInventory } = usePermissions();
  const { query: search, setQuery: setSearch } = useHeaderSearch();
  const [summary, setSummary] = useState({ totalItems: 0, totalStock: 0, byMaterial: [] });
  const [alertCount, setAlertCount] = useState(0);
  const [alertRows, setAlertRows] = useState([]);
  const [emailSending, setEmailSending] = useState(false);
  const [feedback, setFeedback] = useState({ text: "", kind: "" });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchStockSummary(), fetchMinStockAlerts()])
      .then(([summaryData, rows]) => {
        setSummary(summaryData);
        const list = Array.isArray(rows) ? rows : [];
        setAlertRows(list);
        setAlertCount(list.length);
      })
      .catch((err) => {
        setSummary({ totalItems: 0, totalStock: 0, byMaterial: [] });
        setAlertRows([]);
        setAlertCount(0);
        setFeedback({
          text: err?.message || "Não foi possível carregar os relatórios agora.",
          kind: "danger"
        });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const categoryCount = useMemo(() => {
    const cats = new Set((summary.byMaterial || []).map((m) => m.category).filter(Boolean));
    return cats.size;
  }, [summary.byMaterial]);

  const kpiMetrics = useMemo(
    () => [
      {
        key: "itens",
        title: "Itens cadastrados",
        value: formatInt(summary.totalItems),
        iconWrapClass: "bm-reports-page__metric-icon-wrap--blue",
        icon: "ri-file-list-3-line"
      },
      {
        key: "estoque",
        title: "Estoque total",
        value: formatInt(summary.totalStock),
        iconWrapClass: "bm-reports-page__metric-icon-wrap--green",
        icon: "ri-stack-line"
      },
      {
        key: "categorias",
        title: "Categorias",
        value: formatInt(categoryCount),
        iconWrapClass: "bm-reports-page__metric-icon-wrap--yellow",
        icon: "ri-price-tag-3-line"
      },
      {
        key: "alertas",
        title: "Alertas de mínimo",
        value: formatInt(alertCount),
        iconWrapClass: "bm-reports-page__metric-icon-wrap--red",
        icon: "ri-alert-line"
      }
    ],
    [alertCount, categoryCount, summary.totalItems, summary.totalStock]
  );

  const filteredRows = useMemo(() => {
      const rows = summary.byMaterial || [];
      if (!search.trim()) return rows;
      return rows.filter((item) =>
        rowMatchesQuery(search, [item.name, item.category, item.id])
      );
    }, [summary.byMaterial, search]);

  const exportPdf = async () => {
    try {
      const doc = new jsPDF();
      let y = await addBatmotorPdfHeader(doc, { x: 14, y: 10, maxWidthMm: 52 });
      doc.setFontSize(11);
      doc.setTextColor(0, 51, 102);
      doc.text("Relatório de estoque", 14, y);
      y += 7;
      doc.setTextColor(0, 0, 0);
      doc.text(`Total de itens: ${summary.totalItems}`, 14, y);
      y += 6;
      doc.text(`Estoque total: ${summary.totalStock}`, 14, y);
      y += 6;
      doc.text(`Alertas abaixo do mínimo: ${alertCount}`, 14, y);
      y += 8;
      autoTable(doc, {
        startY: y,
        head: [["Matéria-prima", "Categoria", "Qtd", "Mínimo"]],
        body: (summary.byMaterial || []).map((item) => [
          item.name,
          item.category,
          String(item.quantity),
          String(item.minStock ?? "—")
        ])
      });
      y = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 12 : y + 40;
      doc.setFontSize(12);
      doc.text("Itens abaixo do estoque mínimo (compras)", 14, y);
      y += 6;
      autoTable(doc, {
        startY: y,
        head: [["Matéria-prima", "Categoria", "Atual", "Mínimo", "Déficit"]],
        body: (alertRows || []).map((a) => [
          a.name,
          a.category,
          String(a.currentStock),
          String(a.minStock),
          String(a.deficit != null ? a.deficit : Math.max(0, Number(a.minStock) - Number(a.currentStock)))
        ])
      });
      doc.save(`relatorio-estoque-batmotor-${new Date().toISOString().slice(0, 10)}.pdf`);
      setFeedback({ text: "PDF exportado com sucesso.", kind: "success" });
    } catch (e) {
      setFeedback({ text: e?.message || "Não foi possível gerar o PDF.", kind: "danger" });
    }
  };

  const exportXlsx = async () => {
    try {
      const day = new Date().toISOString().slice(0, 10);
      await downloadXlsxWorkbook(`relatorio-estoque-batmotor-${day}.xlsx`, [
        {
          name: "Resumo",
          columns: {
            name: "Matéria-prima",
            category: "Categoria",
            quantity: "Quantidade",
            minStock: "Estoque mínimo"
          },
          rows: (summary.byMaterial || []).map((item) => ({
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            minStock: item.minStock
          }))
        },
        {
          name: "Alertas_minimo",
          columns: {
            name: "Matéria-prima",
            category: "Categoria",
            currentStock: "Quantidade atual",
            minStock: "Mínimo",
            deficit: "Déficit"
          },
          rows: (alertRows || []).map((a) => ({
            name: a.name,
            category: a.category,
            currentStock: a.currentStock,
            minStock: a.minStock,
            deficit:
              a.deficit != null ? a.deficit : Math.max(0, Number(a.minStock) - Number(a.currentStock))
          }))
        },
        {
          name: "Indicadores",
          columns: { k: "Indicador", v: "Valor" },
          rows: [
            { k: "Total itens", v: summary.totalItems },
            { k: "Estoque total", v: summary.totalStock },
            { k: "Alertas mínimos", v: alertCount }
          ]
        }
      ]);
      setFeedback({ text: "Planilha Excel exportada.", kind: "success" });
    } catch (e) {
      setFeedback({ text: e?.message || "Não foi possível exportar o Excel.", kind: "danger" });
    }
  };

  const handleEnviarAlertaCompras = async () => {
    setFeedback({ text: "", kind: "" });
    setEmailSending(true);
    try {
      const data = await sendLowStockAlertEmail();
      setFeedback({
        text: data?.message
          ? `${data.message} (${data.total_alertas ?? 0} alerta(s).)`
          : "E-mail enviado.",
        kind: "success"
      });
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Não foi possível enviar o e-mail. Configure SMTP no servidor.";
      setFeedback({ text: msg, kind: "danger" });
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="bm-reports-page bm-reports-page--kpis">
      <section className="bm-reports-page__kpis bm-kpis-row row g-4 gy-4 mb-4">
        {kpiMetrics.map((m) => (
          <div key={m.key} className="col-12 col-sm-6 col-xl-6 dashboard-kpi-col">
            <article className="bm-reports-page__metric">
              <div className="bm-reports-page__metric-body">
                <span className="bm-reports-page__metric-label">{m.title}</span>
                <strong className="bm-reports-page__metric-value">{m.value}</strong>
              </div>
              <div className={`bm-reports-page__metric-icon-wrap ${m.iconWrapClass}`} aria-hidden>
                <i className={m.icon} />
              </div>
            </article>
          </div>
        ))}
      </section>

      <div className="bm-reports-page__toolbar">
        <div>
          <h2 className="bm-reports-page__title">Relatórios de estoque</h2>
          <p className="bm-reports-page__subtitle">
            Resumo por matéria-prima e alertas abaixo do mínimo. Exportação e e-mail de compras apenas para gerência e
            administração.
          </p>
        </div>
        <div className="bm-reports-page__actions">
          {canManageInventory ? (
            <button
              type="button"
              className="btn bm-reports-page__btn-outline"
              onClick={() => void handleEnviarAlertaCompras()}
              disabled={emailSending}
            >
              <i className="ri-mail-send-line me-1" aria-hidden />
              {emailSending ? "Enviando..." : "Alerta e-mail (compras)"}
            </button>
          ) : null}
          {canManageInventory ? (
            <>
              <button type="button" className="btn bm-reports-page__btn-outline" onClick={() => void exportXlsx()}>
                <i className="ri-file-excel-2-line me-1" aria-hidden />
                Excel
              </button>
              <button type="button" className="btn bm-reports-page__btn-primary" onClick={() => void exportPdf()}>
                <i className="ri-file-pdf-line me-1" aria-hidden />
                PDF
              </button>
            </>
          ) : null}
        </div>
      </div>

      {feedback.text ? (
        <div
          className={`bm-reports-page__alert bm-reports-page__alert--${feedback.kind === "success" ? "success" : feedback.kind === "danger" ? "danger" : "info"} mb-3`}
          role="status"
        >
          {feedback.text}
        </div>
      ) : null}

      <div className="bm-reports-page__search-card">
        <div className="bm-reports-page__search">
          <i className="ri-search-line" aria-hidden />
          <input
            type="search"
            className="form-control"
            placeholder="Pesquisar por nome ou categoria na tabela"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Filtrar tabela de relatório"
          />
        </div>
      </div>

      <section className="card bm-reports-page__table-card border-0">
        <div className="bm-reports-page__table-head">
          <div>
            <h3 className="bm-reports-page__table-heading">Detalhamento por matéria-prima</h3>
            <p className="bm-reports-page__table-desc mb-0">
              {filteredRows.length} registro(s) {canManageInventory ? "— incluídos nos PDF e Excel." : "— somente consulta."}
            </p>
          </div>
          <span className="bm-reports-page__badge">Atualizado agora</span>
        </div>
        <div className="table-responsive">
          <table className="table align-middle mb-0 bm-reports-page__data-table">
            <thead>
              <tr>
                <th scope="col">Matéria-prima</th>
                <th scope="col">Categoria</th>
                <th scope="col" className="text-end">
                  Quantidade
                </th>
                <th scope="col" className="text-end">
                  Mínimo
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4}>
                    <div className="bm-reports-page__empty">Carregando relatório...</div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="bm-reports-page__empty">Nenhum registro encontrado para o filtro atual.</div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((item) => (
                  <tr key={item.id ?? `${item.name}-${item.category}`}>
                    <td>
                      <span className="bm-reports-page__cell-name">{item.name}</span>
                    </td>
                    <td className="bm-reports-page__cell-muted">{item.category}</td>
                    <td className="text-end bm-reports-page__cell-mono">{formatInt(item.quantity)}</td>
                    <td className="text-end bm-reports-page__cell-mono">
                      {item.minStock != null ? formatInt(item.minStock) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {alertRows.length > 0 ? (
        <section className="card bm-reports-page__table-card border-0 mt-3">
          <div className="bm-reports-page__table-head">
            <div>
              <h3 className="bm-reports-page__table-heading">Alertas — estoque abaixo do mínimo</h3>
              <p className="bm-reports-page__table-desc mb-0">Itens que exigem atenção da compras.</p>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table align-middle mb-0 bm-reports-page__data-table">
              <thead>
                <tr>
                  <th scope="col">Matéria-prima</th>
                  <th scope="col">Categoria</th>
                  <th scope="col" className="text-end">
                    Atual
                  </th>
                  <th scope="col" className="text-end">
                    Mínimo
                  </th>
                  <th scope="col" className="text-end">
                    Déficit
                  </th>
                </tr>
              </thead>
              <tbody>
                {alertRows.map((a) => (
                  <tr key={a.id ?? a.materia_prima_id ?? `${a.name}-alert`}>
                    <td>
                      <span className="bm-reports-page__cell-name">{a.name}</span>
                    </td>
                    <td className="bm-reports-page__cell-muted">{a.category}</td>
                    <td className="text-end bm-reports-page__cell-mono">{formatInt(a.currentStock)}</td>
                    <td className="text-end bm-reports-page__cell-mono">{formatInt(a.minStock)}</td>
                    <td className="text-end bm-reports-page__cell-mono">
                      {formatInt(
                        a.deficit != null ? a.deficit : Math.max(0, Number(a.minStock) - Number(a.currentStock))
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default ReportsPage;
