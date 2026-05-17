/**
 * Catálogo de produtos (UI de inventário com imagens locais e ações de exportação).
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { downloadXlsx } from "@/utils/exportXlsx";
import { addBatmotorPdfHeader } from "@/utils/batmotorExportBrand";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { usePermissions } from "@/context/PermissionsContext";
import AddProductModal from "../components/AddProductModal";
import {
  createMaterial,
  createMovement,
  deleteMaterial,
  fetchMaterials,
  fetchSuppliers,
  updateMaterial
} from "@/api";
import { getProductImageDataUrl, setProductImageDataUrl } from "@/utils/productImageStorage.js";

const PAGE_SIZE = 8;

/** Categorias de apoio para cadastro quando o banco ainda estiver vazio. */
export const PRODUCT_UI_DEFAULT_CATEGORIES = [
  "Construção",
  "Eletrônicos",
  "Alimentos",
  "Material de Escritório",
  "Têxtil",
  "Beleza"
];

function formatBRL(n) {
  return Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatInt(n) {
  return Number(n || 0).toLocaleString("pt-BR");
}

/** Ex.: un → UN, kg → kg */
function formatUnitLabel(u) {
  const s = String(u ?? "")
    .trim()
    .toLowerCase();
  if (!s) return "—";
  if (s === "un" || s === "uni" || s === "und") return "UN";
  return String(u).trim().length <= 3 ? String(u).trim().toUpperCase() : String(u).trim();
}

function formatPriceCell(n) {
  if (n == null || n === "" || Number.isNaN(Number(n))) return "—";
  const v = Number(n);
  if (v === 0) return "—";
  return formatBRL(v);
}

function matchesProductSearch(row, rawSearch) {
  const q = String(rawSearch || "").trim().toLowerCase();
  if (!q) return true;
  const fields = [
    row?.name,
    row?.code,
    row?.description,
    row?.unitLabel,
    row?.supplierName,
    row?.category,
    row?.barcode,
    row?.stockLocation,
    row?.observacao
  ];
  return fields.some((value) => String(value ?? "").toLowerCase().includes(q));
}

/**
 * Tela exclusiva /produtos — layout referência “Inventário de produtos” (cadastro, ativo/inativo, ações).
 * Não compartilha estado com /estoque (MaterialsPage).
 */
export default function ProductsPage() {
  const location = useLocation();
  const { canManageInventory } = usePermissions();
  const [rows, setRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [feedback, setFeedback] = useState({ text: "", kind: "" });
  const [page, setPage] = useState(1);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const searchTerm = useMemo(() => new URLSearchParams(location.search).get("search") || "", [location.search]);

  const loadRows = useCallback(async () => {
    setIsLoading(true);
    setFeedback({ text: "", kind: "" });
    try {
      const [materials, suppliersData] = await Promise.all([fetchMaterials(), fetchSuppliers()]);
      const supplierList = (Array.isArray(suppliersData) ? suppliersData : []).filter(
        (s) => s != null && typeof s === "object"
      );
      setSuppliers(supplierList);
      const supplierById = new Map(supplierList.map((s) => [String(s.id ?? ""), s]));
      const mapped = (Array.isArray(materials) ? materials : []).map((m) => {
        const sid = m.supplierId != null ? String(m.supplierId) : "";
        const supplierName = sid && supplierById.has(sid) ? supplierById.get(sid)?.name || "—" : "—";
        const observ = m.observacao != null ? String(m.observacao).trim() : "";
        const sp = m.salePrice != null ? Number(m.salePrice) : null;
        const cp = m.costPrice != null ? Number(m.costPrice) : null;
        return {
          id: m.id,
          name: m.name || "—",
          code: `PRD-${String(m.id || "").slice(-6).toUpperCase()}`,
          description: observ || "—",
          unitLabel: formatUnitLabel(m.unit),
          supplierId: sid,
          supplierName,
          category: m.category || "—",
          salePrice: sp != null && !Number.isNaN(sp) ? sp : 0,
          costPrice: cp != null && !Number.isNaN(cp) ? cp : null,
          active: m.active !== false,
          outOfStock: Number(m.currentStock) <= 0,
          unit: m.unit || "un",
          minStock: Number(m.minStock) || 0,
          currentStock: Number(m.currentStock) || 0,
          observacao: observ,
          imageDataUrl: getProductImageDataUrl(m.id)
        };
      });
      setRows(mapped);
    } catch (err) {
      setRows([]);
      setFeedback({ text: err?.message || "Não foi possível carregar os produtos do banco.", kind: "danger" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const categoriesFromDb = useMemo(() => {
    const s = new Set(PRODUCT_UI_DEFAULT_CATEGORIES);
    rows.forEach((r) => {
      if (r.category) s.add(r.category);
    });
    return [...s].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [rows]);

  const supplierOptions = useMemo(() => {
    return suppliers.map((s) => ({ id: String(s.id), name: s.name }));
  }, [suppliers]);

  const kpiMetrics = useMemo(() => {
    const ativos = rows.filter((r) => r.active).length;
    const inativos = rows.filter((r) => !r.active).length;
    const fora = rows.filter((r) => r.outOfStock).length;
    return [
      {
        key: "total",
        title: "Total de Produtos",
        value: formatInt(rows.length),
        iconWrapClass: "dashboard-metric-v2__icon-wrap--blue",
        icon: "ri-box-3-line"
      },
      {
        key: "ativos",
        title: "Produtos Ativos",
        value: formatInt(ativos),
        iconWrapClass: "dashboard-metric-v2__icon-wrap--green",
        icon: "ri-check-line"
      },
      {
        key: "inativos",
        title: "Produtos Inativos",
        value: formatInt(inativos),
        iconWrapClass: "dashboard-metric-v2__icon-wrap--red",
        icon: "ri-close-line"
      },
      {
        key: "fora",
        title: "Fora de Estoque",
        value: formatInt(fora),
        iconWrapClass: "dashboard-metric-v2__icon-wrap--yellow",
        icon: "ri-alarm-warning-line"
      }
    ];
  }, [rows]);

  const filteredRows = useMemo(() => rows.filter((row) => matchesProductSearch(row, searchTerm)), [rows, searchTerm]);

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

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (!canManageInventory) {
      setProductModalOpen(false);
      setEditingProduct(null);
    }
  }, [canManageInventory]);

  const exportCatalogPdf = async () => {
    if (!canManageInventory) return;
    if (!rows.length) {
      setFeedback({ text: "Não há produtos para exportar.", kind: "info" });
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
    doc.text("Inventário de produtos", 14, y);
    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Gerado em: ${ts}`, 14, y);
    y += 6;
    doc.text(`Registros: ${rows.length}`, 14, y);
    y += 8;

    const body = rows.map((r) => [
      r.name || "—",
      r.code,
      (r.description || "—").slice(0, 80),
      r.unitLabel || "—",
      r.supplierName || "—",
      r.category || "—",
      formatPriceCell(r.salePrice),
      r.active ? "Ativo" : "Inativo",
      r.outOfStock ? "Sim" : "Não"
    ]);

    autoTable(doc, {
      startY: y,
      head: [
        [
          "Produto",
          "Codigo",
          "Descricao",
          "Unidade",
          "Fornecedor",
          "Categoria",
          "Valor",
          "Status",
          "Fora estoque"
        ]
      ],
      body,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [30, 58, 138], textColor: 255 }
    });

    const day = now.toISOString().slice(0, 10);
    doc.save(`inventario-produtos-batmotor-${day}.pdf`);
    setFeedback({ text: "PDF exportado com sucesso.", kind: "success" });
    } catch (err) {
      setFeedback({ text: err?.message || "Não foi possível gerar o PDF.", kind: "danger" });
    }
  };

  const exportCatalogXlsx = async () => {
    if (!canManageInventory) return;
    if (!rows.length) {
      setFeedback({ text: "Não há produtos para exportar.", kind: "info" });
      return;
    }
    try {
    const day = new Date().toISOString().slice(0, 10);
    await downloadXlsx(
      `inventario-produtos-batmotor-${day}.xlsx`,
      "Inventario",
      {
        name: "Produto",
        code: "Codigo",
        description: "Descricao",
        unitLabel: "Unidade",
        supplierName: "Fornecedor",
        category: "Categoria",
        salePrice: "Valor",
        active: "Ativo",
        outOfStock: "Fora estoque"
      },
      rows.map((r) => ({
        ...r,
        salePrice: formatPriceCell(r.salePrice),
        active: r.active ? "Sim" : "Não",
        outOfStock: r.outOfStock ? "Sim" : "Não"
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

  const openNewProduct = () => {
    setEditingProduct(null);
    setProductModalOpen(true);
  };

  const openEdit = (r) => {
    setEditingProduct({
      id: r.id,
      name: r.name,
      productCode: r.code,
      description: r.observacao != null ? r.observacao : r.description !== "—" ? r.description : "",
      category: r.category,
      supplierId: r.supplierId != null ? String(r.supplierId) : "",
      currentStock: r.currentStock ?? 0,
      minStock: r.minStock ?? 0,
      active: r.active,
      unit: r.unit || "un",
      salePrice: r.salePrice != null ? Number(r.salePrice) : 0,
      costPrice: r.costPrice != null ? Number(r.costPrice) : 0,
      barcode: r.barcode || "",
      stockLocation: r.stockLocation || "",
      imageDataUrl: r.imageDataUrl || ""
    });
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (payload) => {
    setIsSaving(true);
    setFeedback({ text: "", kind: "" });
    try {
      if (editingProduct) {
        await updateMaterial(editingProduct.id, {
          name: payload.name,
          category: payload.category,
          unit: payload.unit || "un",
          minStock: Number(payload.minQuantity) || 0,
          active: payload.active !== false,
          supplierId: payload.supplierId ?? null,
          observacao: payload.description?.trim() || null,
          costPrice: payload.costPrice,
          salePrice: payload.salePrice
        });
        if (payload.imageDataUrl) {
          setProductImageDataUrl(editingProduct.id, payload.imageDataUrl);
        }
        setFeedback({ text: "Produto atualizado no banco.", kind: "success" });
      } else {
        const created = await createMaterial({
          name: payload.name,
          category: payload.category,
          unit: payload.unit || "un",
          minStock: Number(payload.minQuantity) || 0,
          active: payload.active !== false,
          supplierId: payload.supplierId || undefined,
          observacao: payload.description?.trim() || null,
          costPrice: payload.costPrice,
          salePrice: payload.salePrice
        });
        const qty = Number(payload.quantity) || 0;
        if (qty > 0 && created?.id) {
          await createMovement({
            type: "IN",
            materialId: created.id,
            quantity: qty,
            notes: "Carga inicial de inventário"
          });
        }
        if (created?.id && payload.imageDataUrl) {
          setProductImageDataUrl(created.id, payload.imageDataUrl);
        }
        setFeedback({ text: "Produto cadastrado no banco.", kind: "success" });
      }
      await loadRows();
      setProductModalOpen(false);
      setEditingProduct(null);
    } catch (err) {
      setFeedback({ text: err?.message || "Não foi possível salvar no banco.", kind: "danger" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Excluir este produto da lista?")) return;
    try {
      await deleteMaterial(id);
      await loadRows();
      setFeedback({ text: "Produto removido do banco.", kind: "success" });
    } catch (err) {
      setFeedback({ text: err?.message || "Não foi possível excluir o produto.", kind: "danger" });
    }
  };

  return (
    <div className="products-catalog-page">
      <section className="products-catalog-page__kpis bm-kpis-row row g-4 gy-4 mb-4">
        {kpiMetrics.map((m) => (
          <div key={m.key} className="col-12 col-sm-6 col-xl-6 dashboard-kpi-col">
            <article className={`dashboard-metric-v2 products-catalog-page__kpi dashboard-metric-v2--${m.key}`}>
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

      <div className="products-catalog-page__toolbar">
        <div className="products-catalog-page__titles">
          <h2 className="products-catalog-page__title">Inventário de produtos</h2>
          <p className="products-catalog-page__subtitle">
            Gerencie seus itens de estoque e níveis de inventário
          </p>
        </div>
        <div className="products-catalog-page__actions">
          {canManageInventory ? (
            <button type="button" className="btn products-catalog-page__btn-outline" onClick={() => void loadRows()} disabled={isLoading}>
              <i className="ri-refresh-line me-1" aria-hidden />
              {isLoading ? "Atualizando..." : "Atualizar"}
            </button>
          ) : null}
          {canManageInventory ? (
            <button type="button" className="btn products-catalog-page__btn-outline" onClick={exportCatalogPdf}>
              <i className="ri-file-pdf-line me-1" aria-hidden />
              PDF
            </button>
          ) : null}
          {canManageInventory ? (
            <button type="button" className="btn products-catalog-page__btn-outline" onClick={exportCatalogXlsx}>
              <i className="ri-file-excel-2-line me-1" aria-hidden />
              Excel
            </button>
          ) : null}
          {canManageInventory ? (
            <button type="button" className="btn products-catalog-page__btn-primary" onClick={openNewProduct}>
              <i className="ri-add-line me-1" aria-hidden />
              Adicionar Produto
            </button>
          ) : null}
        </div>
      </div>

      {feedback.text ? (
        <div
          className={`products-catalog-page__alert products-catalog-page__alert--${feedback.kind || "info"} mb-3`}
          role="status"
        >
          {feedback.text}
        </div>
      ) : null}

      <div className="card products-catalog-page__table-card border-0">
        <div className="table-responsive">
          <table className="table align-middle mb-0 products-catalog-table">
            <thead>
              <tr>
                <th scope="col">Produto</th>
                <th scope="col">Código</th>
                <th scope="col">Descrição</th>
                <th scope="col">Unidade</th>
                <th scope="col">Fornecedor</th>
                <th scope="col">Categoria</th>
                <th scope="col">Valor</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-end">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9}>
                    <div className="products-catalog-table__empty py-5 text-center text-muted">
                      Carregando produtos...
                    </div>
                  </td>
                </tr>
              ) : pageSlice.length ? (
                pageSlice.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="products-catalog-table__product-cell">
                        {r.imageDataUrl ? (
                          <img
                            className="products-catalog-table__thumb"
                            src={r.imageDataUrl}
                            alt=""
                            width={40}
                            height={40}
                            loading="lazy"
                          />
                        ) : (
                          <span className="products-catalog-table__swatch" aria-hidden>
                            <i className="ri-archive-line" />
                          </span>
                        )}
                        <span className="products-catalog-table__product-name">{r.name}</span>
                      </div>
                    </td>
                    <td className="products-catalog-table__mono">{r.code}</td>
                    <td className="products-catalog-table__desc">{r.description}</td>
                    <td className="products-catalog-table__mono">{r.unitLabel}</td>
                    <td className="products-catalog-table__muted">{r.supplierName}</td>
                    <td className="products-catalog-table__muted">{r.category}</td>
                    <td className="products-catalog-table__mono">{formatPriceCell(r.salePrice)}</td>
                    <td>
                      <span
                        className={`products-catalog-table__pill products-catalog-table__pill--${r.active ? "ativo" : "inativo"}`}
                      >
                        {r.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="text-end">
                      {canManageInventory ? (
                        <div className="products-catalog-table__actions">
                          <button
                            type="button"
                            className="products-catalog-table__icon-btn"
                            aria-label="Editar"
                            onClick={() => openEdit(r)}
                          >
                            <i className="ri-pencil-line" aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="products-catalog-table__icon-btn products-catalog-table__icon-btn--danger"
                            aria-label="Excluir"
                            onClick={() => handleDelete(r.id)}
                          >
                            <i className="ri-delete-bin-line" aria-hidden />
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted small">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9}>
                    <div className="products-catalog-table__empty py-5 text-center text-muted">
                      {searchTerm ? "Nenhum produto encontrado para essa busca." : "Nenhum produto cadastrado."}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filteredRows.length > 0 ? (
        <nav className="products-catalog-page__pagination" aria-label="Paginação">
          <button
            type="button"
            className="products-catalog-page__page-btn"
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
              className={`products-catalog-page__page-btn${n === safePage ? " is-active" : ""}`}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            className="products-catalog-page__page-btn"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            aria-label="Próxima página"
          >
            &gt;
          </button>
        </nav>
      ) : null}

      <AddProductModal
        open={productModalOpen}
        onClose={() => {
          setProductModalOpen(false);
          setEditingProduct(null);
        }}
        suppliers={supplierOptions}
        categoriesFromDb={categoriesFromDb}
        editingMaterial={editingProduct}
        onSave={handleSaveProduct}
        isSaving={isSaving}
      />
    </div>
  );
}
