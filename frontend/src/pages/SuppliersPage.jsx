/**
 * CRUD de fornecedores, exportações e campos alinhados ao backend MongoDB.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { downloadXlsx } from "@/utils/exportXlsx";
import { addBatmotorPdfHeader } from "@/utils/batmotorExportBrand";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import SuppliersGlassSelect from "../components/SuppliersGlassSelect";
import { ExpiryDateField, formatDMY, parseDMY } from "../components/OrangeCalendarPopover";

function isoFromDate(d) {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateFromIso(iso) {
  if (!iso || typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) return null;
  const [y, m, d] = iso.trim().split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}
import {
  createSupplier,
  deleteSupplier,
  fetchMaterials,
  fetchSupplierById,
  fetchSuppliers,
  updateSupplier
} from "@/api";
import { usePermissions } from "@/context/PermissionsContext";

const PAGE_SIZE = 8;

const SUPPLIER_TYPE_OPTIONS = [
  { id: "fabricante", label: "Fabricante" },
  { id: "distribuidor", label: "Distribuidor" },
  { id: "atacadista", label: "Atacadista" },
  { id: "varejista", label: "Varejista" },
  { id: "servicos", label: "Serviços" }
];

const CATEGORY_OPTIONS = [
  { id: "construcao", label: "Construção" },
  { id: "eletronicos", label: "Eletrônicos" },
  { id: "alimentos", label: "Alimentos" },
  { id: "escritorio", label: "Material de escritório" },
  { id: "textil", label: "Têxtil" },
  { id: "metal", label: "Metal" }
];

const INITIAL_FULL_FORM = {
  name: "",
  cnpj: "",
  supplierType: "",
  category: "",
  since: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  paymentTerms: "",
  paymentTerms2: "",
  notes: "",
  logoUrl: "",
  active: true
};

const MAX_LOGO_FILE_BYTES = 350 * 1024;

function readLogoAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file || !String(file.type || "").startsWith("image/")) {
      reject(new Error("Selecione um arquivo de imagem (PNG, JPEG, WebP ou GIF)."));
      return;
    }
    if (file.size > MAX_LOGO_FILE_BYTES) {
      reject(new Error("Imagem muito grande. Use até ~350 KB."));
      return;
    }
    const r = new FileReader();
    r.onload = () => {
      const dataUrl = String(r.result || "");
      if (dataUrl.length > 480000) {
        reject(new Error("Imagem resultante muito grande. Escolha uma imagem menor."));
        return;
      }
      resolve(dataUrl);
    };
    r.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    r.readAsDataURL(file);
  });
}

function buildSavePayload(fullForm, status) {
  return {
    ...fullForm,
    name: fullForm.name.trim(),
    paymentTerms: String(fullForm.paymentTerms || "").trim(),
    paymentTerms2: String(fullForm.paymentTerms2 || "").trim(),
    status,
    active: fullForm.active
  };
}

function buildUpdatePayload(fullForm, originalFullForm) {
  const fields = [
    "name",
    "cnpj",
    "supplierType",
    "category",
    "since",
    "contactPerson",
    "email",
    "phone",
    "address",
    "city",
    "state",
    "paymentTerms",
    "paymentTerms2",
    "notes",
    "logoUrl",
    "active"
  ];
  const payload = {};
  for (const field of fields) {
    const nextValue = fullForm?.[field] ?? "";
    const prevValue = originalFullForm?.[field] ?? "";
    if (nextValue !== prevValue) {
      payload[field] = nextValue;
    }
  }
  return payload;
}

function formatInt(n) {
  return Number(n || 0).toLocaleString("pt-BR");
}

function formatSupplierCode(supplier) {
  const raw = supplier?.code != null ? String(supplier.code) : String(supplier?.id ?? "");
  const digits = raw.replace(/\D/g, "") || String(supplier?.id ?? "0");
  const n = Number(digits) || 0;
  return `FOR-${String(n).padStart(3, "0")}`;
}

function rowStatus(supplier) {
  const st = supplier.status || "pending";
  if (st === "active") {
    return { label: "Ativo", tone: "success" };
  }
  if (st === "inactive") {
    return { label: "Inativo", tone: "danger" };
  }
  if (st === "critical") {
    return { label: "Crítico", tone: "critical" };
  }
  return { label: "Pendente", tone: "warning" };
}

function pillClassForTone(tone) {
  if (tone === "success") return "suppliers-table__pill suppliers-table__pill--ativo";
  if (tone === "danger") return "suppliers-table__pill suppliers-table__pill--inativo";
  if (tone === "critical") return "suppliers-table__pill suppliers-table__pill--critico";
  return "suppliers-table__pill suppliers-table__pill--pendente";
}

function matchesSupplierSearch(supplier, rawSearch) {
  const q = String(rawSearch || "").trim().toLowerCase();
  if (!q) return true;
  const fields = [
    supplier?.name,
    supplier?.cnpj,
    supplier?.email,
    supplier?.phone,
    supplier?.contact,
    supplier?.contactPerson,
    supplier?.address,
    supplier?.city,
    supplier?.state,
    supplier?.category,
    supplier?.supplierType,
    supplier?.code
  ];
  return fields.some((value) => String(value ?? "").toLowerCase().includes(q));
}

function formStateFromSupplier(supplier) {
  return {
    name: supplier?.name || "",
    cnpj: supplier?.cnpj || "",
    supplierType: supplier?.supplierType || "",
    category: supplier?.category || "",
    since: supplier?.since || "",
    contactPerson: supplier?.contactPerson || "",
    email: supplier?.email || "",
    phone: supplier?.phone || "",
    address: supplier?.address || "",
    city: supplier?.city || "",
    state: supplier?.state || "",
    paymentTerms: supplier?.paymentTerms || "",
    paymentTerms2: supplier?.paymentTerms2 || "",
    notes: supplier?.notes || "",
    logoUrl: supplier?.logoUrl || "",
    active: supplier?.active !== false && supplier?.status !== "inactive"
  };
}

function SuppliersPage() {
  const location = useLocation();
  const { canManageInventory } = usePermissions();
  const [suppliers, setSuppliers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState({ text: "", kind: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importDragging, setImportDragging] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [fullForm, setFullForm] = useState(INITIAL_FULL_FORM);
  const [originalFullForm, setOriginalFullForm] = useState(null);
  const [sinceStr, setSinceStr] = useState("");
  const [sinceDate, setSinceDate] = useState(null);
  const searchTerm = useMemo(() => new URLSearchParams(location.search).get("search") || "", [location.search]);
  const importInputRef = useRef(null);
  const docsInputRef = useRef(null);
  const logoInputRef = useRef(null);

  const loadSuppliers = useCallback(async () => {
    setIsLoadingList(true);
    let suppliersData = [];
    let materialsData = [];
    try {
      suppliersData = await fetchSuppliers();
    } catch (err) {
      const msg =
        err?.response?.data?.error ?? err?.message ?? "Não foi possível carregar a lista de fornecedores.";
      setFeedback({ text: String(msg), kind: "danger" });
    }
    try {
      materialsData = await fetchMaterials();
    } catch {
      /* contagens “Produtos” por fornecedor ficam 0; a lista de fornecedores já veio acima */
    }
    setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
    setMaterials(Array.isArray(materialsData) ? materialsData : []);
    setIsLoadingList(false);
  }, []);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  /** Lista começa vazia; preenche após salvar/importar/excluir ou quando o backend tiver dados. */

  const materialsBySupplier = useMemo(() => {
    return materials.reduce((acc, item) => {
      if (!item.supplierId) return acc;
      acc[item.supplierId] = (acc[item.supplierId] || 0) + 1;
      return acc;
    }, {});
  }, [materials]);

  const kpiMetrics = useMemo(() => {
    const active = suppliers.filter((s) => s.status === "active").length;
    const inactive = suppliers.filter((s) => s.status === "inactive").length;
    const pending = suppliers.filter((s) => s.status === "pending").length;
    return [
      {
        key: "total",
        title: "Total de fornecedores",
        value: formatInt(suppliers.length),
        iconWrapClass: "dashboard-metric-v2__icon-wrap--blue",
        icon: "ri-truck-line"
      },
      {
        key: "ativos",
        title: "Fornecedores Ativos",
        value: formatInt(active),
        iconWrapClass: "dashboard-metric-v2__icon-wrap--green",
        icon: "ri-check-line"
      },
      {
        key: "inativos",
        title: "Fornecedores Inativos",
        value: formatInt(inactive),
        iconWrapClass: "dashboard-metric-v2__icon-wrap--red",
        icon: "ri-close-line"
      },
      {
        key: "pendentes",
        title: "Fornecedores Pendentes",
        value: formatInt(pending),
        iconWrapClass: "dashboard-metric-v2__icon-wrap--yellow",
        icon: "ri-alarm-warning-line"
      }
    ];
  }, [suppliers]);

  const filteredSuppliers = useMemo(
    () => suppliers.filter((supplier) => matchesSupplierSearch(supplier, searchTerm)),
    [suppliers, searchTerm]
  );

  const pageCount = Math.max(1, Math.ceil(filteredSuppliers.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  const paginatedSuppliers = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredSuppliers.slice(start, start + PAGE_SIZE);
  }, [filteredSuppliers, safePage]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (!canManageInventory) {
      setFormOpen(false);
      setImportOpen(false);
    }
  }, [canManageInventory]);

  const pageNumbers = useMemo(() => {
    const maxVis = 5;
    if (pageCount <= maxVis) return Array.from({ length: pageCount }, (_, i) => i + 1);
    const half = Math.floor(maxVis / 2);
    let start = Math.max(1, safePage - half);
    let end = start + maxVis - 1;
    if (end > pageCount) {
      end = pageCount;
      start = Math.max(1, end - maxVis + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [pageCount, safePage]);

  const openAddModal = () => {
    if (!canManageInventory) return;
    setEditingId(null);
    setFullForm({ ...INITIAL_FULL_FORM, active: true });
    setOriginalFullForm(null);
    setSinceStr("");
    setSinceDate(null);
    setFormOpen(true);
    setFeedback({ text: "", kind: "" });
  };

  const applySupplierToForm = useCallback((supplier) => {
    const iso = String(supplier?.since || "").trim();
    const dt = iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? dateFromIso(iso) : null;
    const nextForm = formStateFromSupplier(supplier);
    setSinceDate(dt);
    setSinceStr(dt ? formatDMY(dt) : "");
    setFullForm(nextForm);
    setOriginalFullForm(nextForm);
    setFormOpen(true);
  }, []);

  const openEditModal = async (supplier) => {
    if (!canManageInventory) return;
    setEditingId(supplier.id);
    setFeedback({ text: "", kind: "" });
    try {
      const freshSupplier = await fetchSupplierById(supplier.id);
      applySupplierToForm(freshSupplier);
    } catch (err) {
      applySupplierToForm(supplier);
      const msg =
        err?.response?.data?.error ?? err?.message ?? "Não foi possível recarregar os dados do fornecedor.";
      setFeedback({
        text: `Não foi possível buscar os dados atualizados no banco. O formulário foi aberto com os dados da lista. ${msg}`,
        kind: "warning"
      });
    }
  };

  const resolveStatusOnSave = (existing) => {
    if (!fullForm.active) return "inactive";
    if (existing?.status === "pending" || existing?.status === "critical") return existing.status;
    return "active";
  };

  const handleSaveFull = async (e) => {
    e.preventDefault();
    const isCreating = !editingId;
    if (!canManageInventory) {
      setFeedback({
        text: "Apenas administrador ou gerente pode cadastrar ou editar fornecedores.",
        kind: "danger"
      });
      return;
    }
    if (isCreating && !fullForm.name?.trim()) {
      setFeedback({ text: "Informe o nome do fornecedor.", kind: "danger" });
      return;
    }
    const cnpjDigits = String(fullForm.cnpj || "").replace(/\D/g, "");
    if (isCreating && cnpjDigits.length !== 14) {
      setFeedback({
        text: "Informe um CNPJ válido com 14 dígitos (podes colar com pontos e traços).",
        kind: "danger"
      });
      return;
    }
    if (isCreating && !fullForm.supplierType?.trim()) {
      setFeedback({ text: "Selecione o tipo de fornecedor.", kind: "danger" });
      return;
    }
    if (isCreating && !fullForm.contactPerson?.trim()) {
      setFeedback({ text: "Informe a pessoa de contato.", kind: "danger" });
      return;
    }
    if (isCreating && !fullForm.email?.trim()) {
      setFeedback({ text: "Informe o e-mail do fornecedor.", kind: "danger" });
      return;
    }
    if (isCreating && !fullForm.phone?.trim()) {
      setFeedback({ text: "Informe o telefone do fornecedor.", kind: "danger" });
      return;
    }
    setIsSaving(true);
    setFeedback({ text: "", kind: "" });
    try {
      const existing = editingId ? suppliers.find((s) => String(s.id) === String(editingId)) : null;
      const status = resolveStatusOnSave(existing);
      if (editingId) {
        const payload = buildUpdatePayload(fullForm, originalFullForm);
        await updateSupplier(editingId, payload);
        setFeedback({ text: "Fornecedor atualizado.", kind: "success" });
      } else {
        const payload = buildSavePayload(fullForm, status);
        await createSupplier({
          ...payload,
          status: fullForm.active ? "pending" : "inactive"
        });
        setFeedback({ text: "Fornecedor cadastrado.", kind: "success" });
      }
      setFormOpen(false);
      await loadSuppliers();
    } catch (err) {
      const raw = err?.response?.data?.error ?? err?.message ?? "";
      const str = String(raw);
      let msg = str || "Não foi possível salvar o fornecedor.";
      if (/11000|duplicate|E11000/i.test(str) || /dup key/i.test(str)) {
        msg = "Este CNPJ já está cadastrado no sistema.";
      }
      if (err?.response?.status === 413) {
        msg =
          "Pedido muito grande (muitas vezes por causa da logomarca em base64). Use uma imagem mais leve ou faça deploy da API com `JSON_BODY_LIMIT` (ex.: 2mb).";
      }
      setFeedback({ text: msg, kind: "danger" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (supplier) => {
    if (!canManageInventory) return;
    if (!window.confirm(`Excluir fornecedor "${supplier.name}"? Materiais podem ficar sem vínculo.`)) return;
    try {
      await deleteSupplier(supplier.id);
      await loadSuppliers();
      setFeedback({ text: "Fornecedor removido.", kind: "success" });
    } catch (_err) {
      setFeedback({ text: "Não foi possível excluir.", kind: "danger" });
    }
  };

  const exportPdf = async () => {
    if (!canManageInventory) return;
    if (!suppliers.length) {
      setFeedback({ text: "Não há fornecedores para exportar.", kind: "info" });
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
    doc.text("Lista de fornecedores", 14, y);
    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Gerado em: ${ts}`, 14, y);
    y += 6;
    doc.text(`Total: ${suppliers.length}`, 14, y);
    y += 8;

    const body = suppliers.map((s) => {
      const st = rowStatus(s);
      return [
        s.name || "—",
        formatSupplierCode(s),
        s.email || "—",
        s.phone || s.contact || "—",
        String(materialsBySupplier[s.id] || 0),
        st.label
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["Empresa", "ID", "E-mail", "Telefone", "Produtos", "Status"]],
      body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [29, 78, 216], textColor: 255 }
    });

    doc.save(`fornecedores-batmotor-${now.toISOString().slice(0, 10)}.pdf`);
    setFeedback({ text: "PDF exportado com sucesso.", kind: "success" });
    } catch (err) {
      setFeedback({ text: err?.message || "Não foi possível gerar o PDF.", kind: "danger" });
    }
  };

  const exportXlsx = async () => {
    if (!canManageInventory) return;
    if (!suppliers.length) {
      setFeedback({ text: "Não há fornecedores para exportar.", kind: "info" });
      return;
    }
    try {
    const day = new Date().toISOString().slice(0, 10);
    await downloadXlsx(
      `fornecedores-batmotor-${day}.xlsx`,
      "Fornecedores",
      {
        name: "Empresa",
        code: "ID",
        email: "E-mail",
        phone: "Telefone",
        materialsCount: "Produtos",
        status: "Status"
      },
      suppliers.map((s) => {
        const st = rowStatus(s);
        return {
          name: s.name,
          code: formatSupplierCode(s),
          email: s.email || "—",
          phone: s.phone || s.contact || "—",
          materialsCount: materialsBySupplier[s.id] || 0,
          status: st.label
        };
      })
    );
    setFeedback({ text: "Planilha Excel exportada.", kind: "success" });
    } catch (err) {
      setFeedback({ text: err?.message || "Não foi possível exportar o Excel.", kind: "danger" });
    }
  };

  const parseImportText = async (text) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    let added = 0;
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (i === 0 && /nome|name|cnpj/i.test(line)) continue;
      const parts = line.split(/[;,]/).map((p) => p.replace(/^"|"$/g, "").trim());
      const name = parts[0];
      if (!name) continue;
      const cnpjRaw = parts[1] || "";
      const cnpjDigits = String(cnpjRaw).replace(/\D/g, "");
      if (cnpjDigits.length !== 14) continue;
      await createSupplier({
        name,
        cnpj: cnpjRaw,
        email: parts[2] || "",
        phone: parts[3] || "",
        status: "pending",
        active: true
      });
      added += 1;
    }
    return added;
  };

  const runImport = async () => {
    if (!canManageInventory) return;
    if (!importFile) return;
    setIsSaving(true);
    try {
      const text = await importFile.text();
      const n = await parseImportText(text);
      setImportOpen(false);
      setImportFile(null);
      await loadSuppliers();
      setFeedback({ text: `${n} fornecedor(es) importado(s).`, kind: "success" });
    } catch (_err) {
      setFeedback({ text: "Falha ao ler a planilha.", kind: "danger" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="suppliers-page">
      <section className="suppliers-page__kpis bm-kpis-row row g-4 gy-4 mb-4">
        {kpiMetrics.map((m) => (
          <div key={m.key} className="col-12 col-sm-6 col-xl-6 dashboard-kpi-col">
            <article className={`dashboard-metric-v2 suppliers-page__kpi dashboard-metric-v2--${m.key}`}>
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

      <div className="suppliers-page__toolbar">
        <div className="suppliers-page__titles">
          <h2 className="suppliers-page__title">Lista de fornecedores</h2>
          <p className="suppliers-page__subtitle">Gerencie seus fornecedores e relacionamento com vendedores</p>
        </div>
        <div className="suppliers-page__actions">
          {canManageInventory ? (
            <>
              <button type="button" className="btn suppliers-page__btn-outline" onClick={() => setImportOpen(true)}>
                <i className="ri-file-upload-line me-1" aria-hidden />
                Importar
              </button>
              <button type="button" className="btn suppliers-page__btn-outline" onClick={exportPdf} title="Baixar lista em PDF">
                <i className="ri-file-pdf-line me-1" aria-hidden />
                PDF
              </button>
              <button
                type="button"
                className="btn suppliers-page__btn-outline"
                onClick={exportXlsx}
                title="Baixar lista em Excel"
              >
                <i className="ri-file-excel-2-line me-1" aria-hidden />
                Excel
              </button>
              <button type="button" className="btn suppliers-page__btn-primary" onClick={openAddModal}>
                <i className="ri-add-line me-1" aria-hidden />
                Adicionar fornecedor
              </button>
            </>
          ) : (
            <p className="small text-muted mb-0 align-self-center">Visualização: apenas gerência altera ou exporta fornecedores.</p>
          )}
        </div>
      </div>

      {feedback.text && !formOpen && !importOpen ? (
        <div className={`suppliers-page__alert suppliers-page__alert--${feedback.kind || "info"} mb-3`} role="status">
          {feedback.text}
        </div>
      ) : null}

      <div className="card suppliers-page__table-card border-0">
        <div className="table-responsive">
          <table className="table align-middle mb-0 suppliers-data-table">
            <thead>
              <tr>
                <th scope="col">Empresa</th>
                <th scope="col">E-mail</th>
                <th scope="col">Telefone</th>
                <th scope="col" className="text-center">
                  Produtos
                </th>
                <th scope="col">Status</th>
                <th scope="col" className="text-end">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoadingList ? (
                <tr>
                  <td colSpan={6}>
                    <div className="suppliers-data-table__empty py-5 text-center">Carregando fornecedores...</div>
                  </td>
                </tr>
              ) : paginatedSuppliers.length ? (
                paginatedSuppliers.map((supplier) => {
                  const relatedItems = materialsBySupplier[supplier.id] || 0;
                  const st = rowStatus(supplier);
                  return (
                    <tr key={supplier.id}>
                      <td>
                        <div className="suppliers-data-table__company">
                          <span
                            className={`suppliers-data-table__swatch${
                              supplier.logoUrl ? " suppliers-data-table__swatch--logo" : ""
                            }`}
                            aria-hidden
                          >
                            {supplier.logoUrl ? (
                              <img
                                src={supplier.logoUrl}
                                alt=""
                                className="suppliers-data-table__logo-img"
                              />
                            ) : (
                              <i className="ri-building-4-line" />
                            )}
                          </span>
                          <div>
                            <div className="suppliers-data-table__name">{supplier.name}</div>
                            <div className="suppliers-data-table__id">ID: {formatSupplierCode(supplier)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="suppliers-data-table__muted">{supplier.email || "—"}</td>
                      <td className="suppliers-data-table__mono">{supplier.phone || supplier.contact || "—"}</td>
                      <td className="text-center suppliers-data-table__mono fw-semibold">{relatedItems}</td>
                      <td>
                        <span className={pillClassForTone(st.tone)}>{st.label}</span>
                      </td>
                      <td className="text-end text-nowrap">
                        {canManageInventory ? (
                          <>
                            <button
                              type="button"
                              className="suppliers-data-table__icon-btn"
                              title="Editar"
                              aria-label={`Editar ${supplier.name}`}
                              onClick={() => openEditModal(supplier)}
                            >
                              <i className="ri-pencil-line" aria-hidden />
                            </button>
                            <button
                              type="button"
                              className="suppliers-data-table__icon-btn suppliers-data-table__icon-btn--danger"
                              title="Excluir"
                              aria-label={`Excluir ${supplier.name}`}
                              onClick={() => handleDelete(supplier)}
                            >
                              <i className="ri-delete-bin-line" aria-hidden />
                            </button>
                          </>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="suppliers-data-table__empty py-5 text-center">
                      {searchTerm ? "Nenhum fornecedor encontrado para essa busca." : "Nenhum fornecedor cadastrado."}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filteredSuppliers.length > 0 ? (
        <nav className="suppliers-page__pagination" aria-label="Paginação">
          <button
            type="button"
            className="suppliers-page__page-btn"
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
              className={`suppliers-page__page-btn${n === safePage ? " is-active" : ""}`}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            className="suppliers-page__page-btn"
            disabled={safePage >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            aria-label="Próxima página"
          >
            &gt;
          </button>
        </nav>
      ) : null}

      {importOpen ? (
        <div
          className="suppliers-light-backdrop"
          role="presentation"
          onClick={() => !isSaving && setImportOpen(false)}
        >
          <div
            className="suppliers-import-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="suppliers-import-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="suppliers-import-modal__head">
              <h5 id="suppliers-import-title" className="suppliers-import-modal__title">
                Importar Planilha - Fornecedores
              </h5>
              <button
                type="button"
                className="suppliers-import-modal__close"
                aria-label="Fechar"
                onClick={() => !isSaving && setImportOpen(false)}
              >
                <i className="ri-close-line" aria-hidden />
              </button>
            </div>
            <div className="suppliers-import-modal__body">
              <input
                ref={importInputRef}
                type="file"
                accept=".csv,.txt"
                className="d-none"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                className={`suppliers-import-drop ${importDragging ? "suppliers-import-drop--active" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setImportDragging(true);
                }}
                onDragLeave={() => setImportDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setImportDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) setImportFile(f);
                }}
                onClick={() => importInputRef.current?.click()}
              >
                <i className="suppliers-import-drop__icon ri-file-upload-line" aria-hidden />
                <p className="suppliers-import-drop__text mb-0">
                  Arraste e solte aqui <span className="suppliers-import-drop__or">ou</span>
                </p>
                <strong className="suppliers-import-drop__link">Abrir arquivos</strong>
                {importFile ? <p className="suppliers-import-drop__file small mb-0 mt-2">{importFile.name}</p> : null}
              </button>
              <p className="suppliers-import-hint mb-0">
                CSV: nome; cnpj; e-mail; telefone (primeira linha pode ser cabeçalho).
              </p>
              <button
                type="button"
                className="btn suppliers-import-submit w-100 mt-3"
                disabled={!importFile || isSaving}
                onClick={runImport}
              >
                {isSaving ? "Importando..." : "Importar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {formOpen ? (
        <div
          className="suppliers-light-backdrop"
          role="presentation"
          onClick={() => !isSaving && setFormOpen(false)}
        >
          <div
            className="suppliers-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="suppliers-form-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="suppliers-form-modal__head">
              <h5 id="suppliers-form-title" className="suppliers-form-modal__title mb-0">
                {editingId ? "Editar fornecedor" : "Cadastrar fornecedor"}
              </h5>
              <button
                type="button"
                className="suppliers-import-modal__close"
                aria-label="Fechar"
                onClick={() => !isSaving && setFormOpen(false)}
              >
                <i className="ri-close-line" aria-hidden />
              </button>
            </div>
            <div className="suppliers-form-modal__body">
              <form className="suppliers-form" onSubmit={handleSaveFull} noValidate>
                <div className="row g-4">
                  <div className="col-lg-6">
                    <div className="suppliers-form-section">
                      <div className="suppliers-form-section__head">
                        <span className="suppliers-form-section__icon" aria-hidden>
                          <i className="ri-building-4-line" />
                        </span>
                        <h6 className="suppliers-form-section__title">Informações básicas</h6>
                      </div>
                      <div className="suppliers-form__field">
                        <label className="suppliers-form__label" htmlFor="sf-name">
                          Nome do fornecedor *
                        </label>
                        <input
                          id="sf-name"
                          className="form-control suppliers-form__control"
                          placeholder="Ex.: Materiais de Construção Ltda"
                          value={fullForm.name}
                          onChange={(e) => setFullForm((p) => ({ ...p, name: e.target.value }))}
                          required={!editingId}
                        />
                      </div>
                      <div className="suppliers-form__field">
                        <label className="suppliers-form__label" htmlFor="sf-cnpj">
                          CNPJ <span className="text-danger">*</span>{" "}
                          <span className="suppliers-form__label-hint">14 dígitos — obrigatório para gravar</span>
                        </label>
                        <input
                          id="sf-cnpj"
                          className="form-control suppliers-form__control"
                          placeholder="00.000.000/0001-00"
                          value={fullForm.cnpj}
                          onChange={(e) => setFullForm((p) => ({ ...p, cnpj: e.target.value }))}
                        />
                      </div>
                      <div className="suppliers-form__field">
                        <label className="suppliers-form__label" id="sf-type-label" htmlFor="sf-type">
                          Tipo de fornecedor *
                        </label>
                        <SuppliersGlassSelect
                          id="sf-type"
                          listLabelledBy="sf-type-label"
                          value={fullForm.supplierType}
                          onChange={(v) => setFullForm((p) => ({ ...p, supplierType: v }))}
                          options={SUPPLIER_TYPE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
                          placeholder="Selecione um tipo"
                          required={!editingId}
                        />
                      </div>
                      <div className="suppliers-form__field">
                        <label className="suppliers-form__label" id="sf-cat-label" htmlFor="sf-cat">
                          Categoria de produtos
                        </label>
                        <SuppliersGlassSelect
                          id="sf-cat"
                          listLabelledBy="sf-cat-label"
                          value={fullForm.category}
                          onChange={(v) => setFullForm((p) => ({ ...p, category: v }))}
                          options={CATEGORY_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
                          placeholder="Selecione uma categoria"
                        />
                      </div>
                      <div className="suppliers-form__field">
                        <label className="suppliers-form__label" htmlFor="sf-since">
                          Fornecedor desde
                        </label>
                        <div className="suppliers-form-date-field">
                          <ExpiryDateField
                            id="sf-since"
                            valueStr={sinceStr}
                            onChangeStr={(s) => {
                              setSinceStr(s);
                              if (s.trim() === "") {
                                setSinceDate(null);
                                setFullForm((p) => ({ ...p, since: "" }));
                                return;
                              }
                              const d = parseDMY(s);
                              if (d) {
                                setSinceDate(d);
                                setFullForm((p) => ({ ...p, since: isoFromDate(d) }));
                              }
                            }}
                            selectedDate={sinceDate}
                            onSelectDate={(d) => {
                              setSinceDate(d);
                              setSinceStr(d ? formatDMY(d) : "");
                              setFullForm((p) => ({ ...p, since: d ? isoFromDate(d) : "" }));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="suppliers-form-section">
                      <div className="suppliers-form-section__head">
                        <span className="suppliers-form-section__icon" aria-hidden>
                          <i className="ri-user-3-line" />
                        </span>
                        <h6 className="suppliers-form-section__title">Informações de contato</h6>
                      </div>
                      <div className="suppliers-form__field">
                        <label className="suppliers-form__label" htmlFor="sf-person">
                          Pessoa de contato *
                        </label>
                        <input
                          id="sf-person"
                          className="form-control suppliers-form__control"
                          placeholder="Ex.: João Silva"
                          value={fullForm.contactPerson}
                          onChange={(e) => setFullForm((p) => ({ ...p, contactPerson: e.target.value }))}
                          required={!editingId}
                        />
                      </div>
                      <div className="suppliers-form__field">
                        <label className="suppliers-form__label" htmlFor="sf-email">
                          E-mail *
                        </label>
                        <input
                          id="sf-email"
                          type="email"
                          className="form-control suppliers-form__control"
                          placeholder="contato@fornecedor.com"
                          value={fullForm.email}
                          onChange={(e) => setFullForm((p) => ({ ...p, email: e.target.value }))}
                          required={!editingId}
                        />
                      </div>
                      <div className="suppliers-form__field">
                        <label className="suppliers-form__label" htmlFor="sf-phone">
                          Telefone *
                        </label>
                        <input
                          id="sf-phone"
                          className="form-control suppliers-form__control"
                          placeholder="+55 (99) 9 9999-9999"
                          value={fullForm.phone}
                          onChange={(e) => setFullForm((p) => ({ ...p, phone: e.target.value }))}
                          required={!editingId}
                        />
                      </div>
                      <div className="suppliers-form__field">
                        <label className="suppliers-form__label" htmlFor="sf-address">
                          Endereço
                        </label>
                        <input
                          id="sf-address"
                          className="form-control suppliers-form__control"
                          placeholder="Rua, número, complemento"
                          value={fullForm.address}
                          onChange={(e) => setFullForm((p) => ({ ...p, address: e.target.value }))}
                        />
                      </div>
                      <div className="row g-2">
                        <div className="col-8">
                          <div className="suppliers-form__field mb-0">
                            <label className="suppliers-form__label" htmlFor="sf-city">
                              Cidade
                            </label>
                            <input
                              id="sf-city"
                              className="form-control suppliers-form__control"
                              value={fullForm.city}
                              onChange={(e) => setFullForm((p) => ({ ...p, city: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="suppliers-form__field mb-0">
                            <label className="suppliers-form__label" htmlFor="sf-state">
                              Estado
                            </label>
                            <input
                              id="sf-state"
                              className="form-control suppliers-form__control"
                              maxLength={2}
                              placeholder="UF"
                              value={fullForm.state}
                              onChange={(e) =>
                                setFullForm((p) => ({ ...p, state: e.target.value.toUpperCase() }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="suppliers-form-section mt-2">
                  <div className="suppliers-form-section__head">
                    <span className="suppliers-form-section__icon" aria-hidden>
                      <i className="ri-file-list-3-line" />
                    </span>
                    <h6 className="suppliers-form-section__title">Informações adicionais</h6>
                  </div>
                  <div className="row g-2">
                    <div className="col-md-6">
                      <div className="suppliers-form__field mb-0">
                        <label className="suppliers-form__label" htmlFor="sf-pay1">
                          1ª condição de pagamento
                        </label>
                        <div className="suppliers-pay-field__row">
                          <span className="suppliers-pay-field__currency" aria-hidden>
                            R$
                          </span>
                          <input
                            id="sf-pay1"
                            className="form-control suppliers-form__control suppliers-pay-field__input"
                            placeholder="À vista, 30/60 dias, boleto, cartão…"
                            value={fullForm.paymentTerms}
                            spellCheck={false}
                            onChange={(e) => setFullForm((p) => ({ ...p, paymentTerms: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="suppliers-form__field mb-0">
                        <label className="suppliers-form__label" htmlFor="sf-pay2">
                          2ª condição de pagamento
                        </label>
                        <div className="suppliers-pay-field__row">
                          <span className="suppliers-pay-field__currency" aria-hidden>
                            R$
                          </span>
                          <input
                            id="sf-pay2"
                            className="form-control suppliers-form__control suppliers-pay-field__input"
                            placeholder="Entrada + saldo, limite, desconto PIX…"
                            value={fullForm.paymentTerms2}
                            spellCheck={false}
                            onChange={(e) => setFullForm((p) => ({ ...p, paymentTerms2: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="suppliers-form__field">
                    <label className="suppliers-form__label" htmlFor="sf-notes">
                      Observações
                    </label>
                    <textarea
                      id="sf-notes"
                      className="form-control suppliers-form__control"
                      rows={3}
                      placeholder="Alguma informação adicional importante"
                      value={fullForm.notes}
                      onChange={(e) => setFullForm((p) => ({ ...p, notes: e.target.value }))}
                    />
                  </div>
                  <div className="suppliers-form-switch form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="sf-active"
                      checked={fullForm.active}
                      onChange={(e) => setFullForm((p) => ({ ...p, active: e.target.checked }))}
                    />
                    <label className="form-check-label suppliers-form__label mb-0" htmlFor="sf-active">
                      Ativo
                    </label>
                  </div>
                </div>

                <div className="suppliers-form-section">
                  <div className="suppliers-form-section__head">
                    <span className="suppliers-form-section__icon" aria-hidden>
                      <i className="ri-image-line" />
                    </span>
                    <h6 className="suppliers-form-section__title">Logomarca</h6>
                  </div>
                  <p className="suppliers-logo-section__hint small text-muted mb-3">
                    Opcional. PNG, JPEG, WebP ou GIF — até ~350 KB.
                  </p>
                  <input
                    ref={logoInputRef}
                    type="file"
                    className="d-none"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      try {
                        const dataUrl = await readLogoAsDataUrl(file);
                        setFullForm((p) => ({ ...p, logoUrl: dataUrl }));
                        setFeedback({ text: "", kind: "" });
                      } catch (err) {
                        setFeedback({ text: String(err?.message || err), kind: "danger" });
                      }
                    }}
                  />
                  <div className="suppliers-logo-row">
                    <div
                      className={`suppliers-logo-preview${fullForm.logoUrl ? " suppliers-logo-preview--filled" : ""}`}
                    >
                      {fullForm.logoUrl ? (
                        <img src={fullForm.logoUrl} alt="" className="suppliers-logo-preview__img" />
                      ) : (
                        <i className="ri-image-line suppliers-logo-preview__placeholder" aria-hidden />
                      )}
                    </div>
                    <div className="suppliers-logo-row__actions">
                      <button
                        type="button"
                        className="btn suppliers-docs-row__browse"
                        onClick={() => logoInputRef.current?.click()}
                      >
                        Escolher imagem
                      </button>
                      {fullForm.logoUrl ? (
                        <button
                          type="button"
                          className="btn btn-link suppliers-logo-remove p-0"
                          onClick={() => setFullForm((p) => ({ ...p, logoUrl: "" }))}
                        >
                          Remover logomarca
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="suppliers-form-section">
                  <div className="suppliers-form-section__head">
                    <span className="suppliers-form-section__icon" aria-hidden>
                      <i className="ri-folder-upload-line" />
                    </span>
                    <h6 className="suppliers-form-section__title">Documentos</h6>
                  </div>
                  <input ref={docsInputRef} type="file" className="d-none" multiple />
                  <div className="suppliers-docs-row">
                    <span className="suppliers-docs-row__hint">Nenhum arquivo selecionado</span>
                    <button
                      type="button"
                      className="btn suppliers-docs-row__browse"
                      onClick={() => docsInputRef.current?.click()}
                    >
                      Escolher arquivo
                    </button>
                  </div>
                </div>

                {feedback.text && formOpen ? (
                  <div className={`suppliers-page__alert suppliers-page__alert--${feedback.kind || "info"} mt-3`}>
                    {feedback.text}
                  </div>
                ) : null}

                <div className="suppliers-form__footer">
                  <button
                    type="button"
                    className="suppliers-form__btn-cancel"
                    onClick={() => !isSaving && setFormOpen(false)}
                  >
                    <i className="ri-close-line me-1" aria-hidden />
                    Cancelar
                  </button>
                  <button type="submit" className="suppliers-form__btn-save" disabled={isSaving}>
                    <i className="ri-save-line me-1" aria-hidden />
                    {isSaving ? "Salvando..." : "Salvar fornecedor"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default SuppliersPage;
