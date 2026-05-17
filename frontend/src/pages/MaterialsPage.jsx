/**
 * Gestão de matérias-primas / insumos: tabela, filtros, export PDF/XLSX, integração com API ou mock.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { downloadXlsx } from "@/utils/exportXlsx";
import { addBatmotorPdfHeader } from "@/utils/batmotorExportBrand";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchMaterials, fetchMovements, fetchSuppliers } from "@/api";
import { usePermissions } from "@/context/PermissionsContext";
import { useHeaderSearch } from "@/context/HeaderSearchContext";
import { getProductImageDataUrl } from "@/utils/productImageStorage.js";
import { getProductMeta } from "@/utils/productMetaStorage.js";
import { isGenericShowAllStockQuery, rowMatchesQuery } from "@/utils/searchMatch.js";

/**
 * Tela exclusiva /estoque — movimentação e níveis (estável / crítico etc.).
 * Não altere aqui ao mudar a tela de produtos (ProductsPage).
 */
const PAGE_SIZE = 8;

function formatBRL(n) {
  return Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatInt(n) {
  return Number(n || 0).toLocaleString("pt-BR");
}

const STOCK_STATUS_LABEL = {
  estavel: "Estável",
  critico: "Crítico",
  instavel: "Instável"
};

function deriveStockStatus(currentStock, minStock) {
  const c = Number(currentStock) || 0;
  const m = Number(minStock) || 0;
  if (c <= 0) return "critico";
  if (m > 0 && c <= m) return "instavel";
  return "estavel";
}

function formatMovementTs(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

/** Monta linhas da tela /estoque a partir de matérias-primas + movimentações. */
function buildStockRows(materials, movements, supplierNameById) {
  const byMat = {};
  for (const mov of movements || []) {
    const mid = mov.materialId ?? mov.materia_prima_id;
    if (mid == null) continue;
    const t = mov.type;
    const at = mov.createdAt;
    if (!byMat[mid]) byMat[mid] = { lastIn: null, lastOut: null };
    if (t === "IN") {
      if (!byMat[mid].lastIn || new Date(at) > new Date(byMat[mid].lastIn)) byMat[mid].lastIn = at;
    } else if (t === "OUT") {
      if (!byMat[mid].lastOut || new Date(at) > new Date(byMat[mid].lastOut)) byMat[mid].lastOut = at;
    }
  }

  return (materials || []).map((m) => {
    const agg = byMat[m.id] || {};
    const sid = m.supplierId != null ? String(m.supplierId) : "";
    const supplierName =
      sid && supplierNameById && supplierNameById.has(sid)
        ? supplierNameById.get(sid) || "—"
        : "—";
    const img = getProductImageDataUrl(m.id);
    return {
      id: m.id,
      name: m.name || "—",
      code: String(m.id).padStart(4, "0"),
      supplierName,
      category: m.category || "—",
      lastEntry: formatMovementTs(agg.lastIn),
      lastExit: formatMovementTs(agg.lastOut),
      purchaseValue: 0,
      unitValue: 0,
      totalStock: Number(m.currentStock) || 0,
      stockStatus: deriveStockStatus(m.currentStock, m.minStock),
      imageDataUrl: img || ""
    };
  });
}

function MaterialsPage() {
  const { canManageInventory } = usePermissions();
  const { query: headerSearch } = useHeaderSearch();
  const [rows, setRows] = useState([]);
  const [feedback, setFeedback] = useState({ text: "", kind: "" });
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const loadStock = useCallback(async () => {
    setFeedback({ text: "", kind: "" });
    setIsLoading(true);
    try {
      const [materials, movements] = await Promise.all([fetchMaterials(), fetchMovements()]);
      let suppliersData = [];
      try {
        suppliersData = await fetchSuppliers();
      } catch {
        suppliersData = [];
      }
      const supplierList = (Array.isArray(suppliersData) ? suppliersData : []).filter(
        (s) => s != null && typeof s === "object"
      );
      const supplierNameById = new Map(supplierList.map((s) => [String(s.id ?? ""), s.name || "—"]));
      const built = buildStockRows(materials, movements, supplierNameById).map((r) => {
        const meta = getProductMeta(r.id);
        return { ...r, barcode: meta.barcode || "", stockLocation: meta.stockLocation || "" };
      });
      setRows(built);
    } catch (err) {
      setRows([]);
      setFeedback({
        text: err?.message || "Não foi possível carregar o estoque.",
        kind: "danger"
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStock();
  }, [loadStock]);

  const filteredRows = useMemo(() => {
    if (!headerSearch.trim()) return rows;
    if (isGenericShowAllStockQuery(headerSearch)) return rows;
    return rows.filter((r) =>
      rowMatchesQuery(headerSearch, [
        r.name,
        r.code,
        r.supplierName,
        r.category,
        STOCK_STATUS_LABEL[r.stockStatus],
        r.id,
        r.barcode,
        r.stockLocation
      ])
    );
  }, [rows, headerSearch]);

  useEffect(() => {
    setPage(1);
  }, [headerSearch]);

  const kpiMetrics = useMemo(() => {
    const comEstoque = filteredRows.filter((r) => (Number(r.totalStock) || 0) > 0).length;
    const baixo = filteredRows.filter((r) => r.stockStatus === "instavel").length;
    const fora = filteredRows.filter((r) => (Number(r.totalStock) || 0) <= 0).length;
    return [
      {
        key: "total",
        title: "Total de itens",
        value: formatInt(filteredRows.length),
        iconWrapClass: "dashboard-metric-v2__icon-wrap--blue",
        icon: "ri-box-3-line"
      },
      {
        key: "em-estoque",
        title: "Em estoque",
        value: formatInt(comEstoque),
        iconWrapClass: "dashboard-metric-v2__icon-wrap--green",
        icon: "ri-check-line"
      },
      {
        key: "baixo",
        title: "Estoque baixo",
        value: formatInt(baixo),
        iconWrapClass: "dashboard-metric-v2__icon-wrap--yellow",
        icon: "ri-alarm-warning-line"
      },
      {
        key: "fora",
        title: "Fora de estoque",
        value: formatInt(fora),
        iconWrapClass: "dashboard-metric-v2__icon-wrap--red",
        icon: "ri-close-line"
      }
    ];
  }, [filteredRows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = useMemo(() => {
    const p = Math.min(page, totalPages);
    const start = (p - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page, totalPages]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const exportMaterialsPdf = async () => {
    if (!canManageInventory) return;
    if (!filteredRows.length) {
      setFeedback({ text: "Não há itens no estoque para exportar.", kind: "info" });
      return;
    }
    setFeedback({ text: "", kind: "" });
    try {
    const doc = new jsPDF({ orientation: "landscape" });
    const now = new Date();
    const ts = now.toLocaleString("pt-BR");
    let y = await addBatmotorPdfHeader(doc, { x: 14, y: 10, maxWidthMm: 62 });
    doc.setFontSize(11);
    doc.setTextColor(0, 51, 102);
    doc.text("Inventário de estoque", 14, y);
    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Gerado em: ${ts}`, 14, y);
    y += 6;
    doc.text(`Registros na tabela: ${filteredRows.length}`, 14, y);
    y += 8;

    const body = filteredRows.map((r) => [
      r.name || "—",
      r.code,
      r.supplierName,
      r.category || "—",
      r.lastEntry,
      r.lastExit,
      formatBRL(r.purchaseValue),
      formatBRL(r.unitValue),
      String(r.totalStock),
      STOCK_STATUS_LABEL[r.stockStatus] || r.stockStatus
    ]);

    autoTable(doc, {
      startY: y,
      head: [
        [
          "Produto",
          "Codigo",
          "Fornecedor",
          "Categoria",
          "Dt ult. entrada",
          "Dt ult. saida",
          "Valor compra",
          "Valor unit.",
          "Estoque total",
          "Status"
        ]
      ],
      body,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [202, 138, 4], textColor: 255 }
    });

    const day = now.toISOString().slice(0, 10);
    doc.save(`inventario-estoque-batmotor-${day}.pdf`);
    setFeedback({ text: "PDF exportado com sucesso.", kind: "success" });
    } catch (err) {
      setFeedback({ text: err?.message || "Não foi possível gerar o PDF.", kind: "danger" });
    }
  };

  const exportMaterialsXlsx = async () => {
    if (!canManageInventory) return;
    if (!filteredRows.length) {
      setFeedback({ text: "Não há dados para exportar.", kind: "info" });
      return;
    }
    try {
    const day = new Date().toISOString().slice(0, 10);
    await downloadXlsx(
      `inventario-estoque-batmotor-${day}.xlsx`,
      "Estoque",
      {
        name: "Produto",
        code: "Codigo",
        supplierName: "Fornecedor",
        category: "Categoria",
        lastEntry: "Dt ult. entrada",
        lastExit: "Dt ult. saida",
        purchaseValue: "Valor compra",
        unitValue: "Valor unit.",
        totalStock: "Estoque total",
        stockStatus: "Status"
      },
      filteredRows.map((r) => ({
        ...r,
        purchaseValue: formatBRL(r.purchaseValue),
        unitValue: formatBRL(r.unitValue),
        stockStatus: STOCK_STATUS_LABEL[r.stockStatus] || r.stockStatus
      }))
    );
    setFeedback({ text: "Planilha Excel exportada.", kind: "success" });
    } catch (err) {
      setFeedback({ text: err?.message || "Não foi possível exportar o Excel.", kind: "danger" });
    }
  };

  const pageNumbers = useMemo(() => {
    const maxVis = 5;
    if (totalPages <= maxVis) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const half = Math.floor(maxVis / 2);
    let start = Math.max(1, safePage - half);
    let end = start + maxVis - 1;
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxVis + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [totalPages, safePage]);

  return (
    <div className="products-inventory-page products-inventory-page--stock">
      <section className="products-inventory-page__kpis bm-kpis-row row g-4 gy-4 mb-4">
        {kpiMetrics.map((m) => (
          <div key={m.key} className="col-12 col-sm-6 col-xl-6 dashboard-kpi-col">
            <article className={`dashboard-metric-v2 products-inventory-page__kpi dashboard-metric-v2--${m.key}`}>
              <div className="dashboard-metric-v2__body">
                <span className="dashboard-metric-v2__label">{m.title}</span>
                <strong className="dashboard-metric-v2__value">{m.value}</strong>
              </div>
              <div className={`dashboard-metric-v2__icon-wrap ${m.iconWrapClass}`} aria-hidden>
                <i className={m.icon} />
              </div>
            </article>
          </div>
        ))}
      </section>

      <div className="products-inventory-page__toolbar">
        <div className="products-inventory-page__titles">
          <h2 className="products-inventory-page__title">Estoque e inventário</h2>
          <p className="products-inventory-page__subtitle">
            Acompanhe quantidades, últimas movimentações e status dos itens em estoque.
          </p>
        </div>
        <div className="products-inventory-page__actions">
          <button
            type="button"
            className="btn products-inventory-page__btn-outline"
            onClick={() => void loadStock()}
            title="Atualizar níveis a partir do servidor"
            disabled={isLoading}
          >
            <i className="ri-refresh-line me-1" aria-hidden />
            {isLoading ? "Atualizando..." : "Atualizar"}
          </button>
          {canManageInventory ? (
            <>
              <button
                type="button"
                className="btn products-inventory-page__btn-outline"
                onClick={exportMaterialsPdf}
                title="Baixar PDF com movimentação e níveis de estoque"
              >
                <i className="ri-file-pdf-line me-1" aria-hidden />
                PDF
              </button>
              <button
                type="button"
                className="btn products-inventory-page__btn-outline"
                onClick={exportMaterialsXlsx}
                title="Baixar Excel com níveis de estoque"
              >
                <i className="ri-file-excel-2-line me-1" aria-hidden />
                Excel
              </button>
            </>
          ) : null}
        </div>
      </div>

      {feedback.text ? (
        <div
          className={`products-inventory-page__alert products-inventory-page__alert--${feedback.kind || "info"} mb-3`}
          role="status"
        >
          {feedback.text}
        </div>
      ) : null}

      <div className="card products-inventory-page__table-card border-0">
        <div className="table-responsive">
          <table className="table align-middle mb-0 products-data-table">
            <thead>
              <tr>
                <th scope="col">Produto</th>
                <th scope="col">Fornecedor</th>
                <th scope="col">Categoria</th>
                <th scope="col">Dt ult. entrada</th>
                <th scope="col">Dt ult. saída</th>
                <th scope="col">Valor compra</th>
                <th scope="col">Valor unit.</th>
                <th scope="col">Estoque total</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9}>
                    <div className="products-data-table__empty py-5 text-center text-muted">
                      Carregando estoque...
                    </div>
                  </td>
                </tr>
              ) : pageSlice.length ? (
                pageSlice.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="products-data-table__product-cell">
                        {r.imageDataUrl ? (
                          <img
                            className="products-data-table__thumb"
                            src={r.imageDataUrl}
                            alt=""
                            width={40}
                            height={40}
                            loading="lazy"
                          />
                        ) : (
                          <span className="products-data-table__swatch products-data-table__swatch--yellow" aria-hidden>
                            <i className="ri-archive-line" />
                          </span>
                        )}
                        <span className="products-data-table__product-text">
                          <span className="products-data-table__product-name">{r.name}</span>
                          <span className="products-data-table__product-code-sub">{r.code}</span>
                        </span>
                      </div>
                    </td>
                    <td className="products-data-table__muted">{r.supplierName}</td>
                    <td className="products-data-table__muted">{r.category}</td>
                    <td className="products-data-table__mono">{r.lastEntry}</td>
                    <td className="products-data-table__mono">{r.lastExit}</td>
                    <td className="products-data-table__mono">{formatBRL(r.purchaseValue)}</td>
                    <td className="products-data-table__mono">{formatBRL(r.unitValue)}</td>
                    <td className="products-data-table__mono">{formatInt(r.totalStock)}</td>
                    <td>
                      <span className={`products-data-table__pill products-data-table__pill--${r.stockStatus}`}>
                        {STOCK_STATUS_LABEL[r.stockStatus] || r.stockStatus}
                      </span>
                    </td>
                  </tr>
                ))
              ) : rows.length > 0 && headerSearch.trim() ? (
                <tr>
                  <td colSpan={9}>
                    <div className="products-data-table__empty py-5 text-center text-muted">
                      Nenhum item corresponde à pesquisa.
                    </div>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={9}>
                    <div className="products-data-table__empty py-5 text-center text-muted">
                      Nenhum item para exibir no estoque.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filteredRows.length > 0 ? (
        <nav className="products-inventory-page__pagination" aria-label="Paginação">
          <button
            type="button"
            className="products-inventory-page__page-btn"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label="Página anterior"
          >
            &lt;
          </button>
          {pageNumbers.map((n) => (
            <button
              key={n}
              type="button"
              className={`products-inventory-page__page-btn${n === safePage ? " is-active" : ""}`}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            className="products-inventory-page__page-btn"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            aria-label="Próxima página"
          >
            &gt;
          </button>
        </nav>
      ) : null}
    </div>
  );
}

export default MaterialsPage;
