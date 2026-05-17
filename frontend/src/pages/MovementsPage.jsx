/**
 * Registo e histórico de movimentações (entrada/saída/ajuste), exportações e permissões por perfil.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { downloadXlsx } from "@/utils/exportXlsx";
import { addBatmotorPdfHeader } from "@/utils/batmotorExportBrand";
import { useEffect, useMemo, useState } from "react";
import { createMovement, fetchMaterials, fetchMovements } from "@/api";
import { usePermissions } from "@/context/PermissionsContext";
import { useHeaderSearch } from "@/context/HeaderSearchContext";
import { ExpiryDateField, formatDMY, parseDMY } from "../components/OrangeCalendarPopover";
import SuppliersGlassSelect from "@/components/SuppliersGlassSelect";

const MOTIVO_OPTIONS = [
  "Construção",
  "Eletrônicos",
  "Alimentos",
  "Material de Escritório",
  "Têxtil",
  "Ajuste de inventário",
  "Venda",
  "Outro"
];

const HISTORY_RANGE_OPTIONS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "all", label: "Todo o período" }
];

const PAGE_SIZE = 8;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function getNowTimeStr() {
  const n = new Date();
  return `${pad2(n.getHours())}:${pad2(n.getMinutes())}`;
}

function combineDateTimeISO(dateStr, timeStr) {
  const d = parseDMY(String(dateStr || "").trim());
  if (!d) return new Date().toISOString();
  const parts = String(timeStr || "00:00").split(":");
  const hh = Math.min(23, parseInt(parts[0], 10) || 0);
  const mm = Math.min(59, parseInt(parts[1], 10) || 0);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

function formatMovementDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function notesParts(notes) {
  const raw = String(notes || "");
  const m = raw.match(/^Motivo:\s*([^.]+)\.\s*((?:.|\n)*)$/);
  if (m) return { motivo: m[1].trim(), obs: m[2].trim() || "—" };
  return { motivo: "—", obs: raw.trim() || "—" };
}

function movementLabel(type) {
  if (type === "IN") return "Entrada";
  if (type === "OUT") return "Saída";
  return "Ajuste";
}

function MovementsPage() {
  const { query: headerSearch } = useHeaderSearch();
  const [materials, setMaterials] = useState([]);
  const [movements, setMovements] = useState([]);
  const [form, setForm] = useState({
    type: "IN",
    materialId: "",
    quantity: 1,
    motivo: "",
    observations: ""
  });
  const [movementDateStr, setMovementDateStr] = useState(() => formatDMY(new Date()));
  const [movementDate, setMovementDate] = useState(() => new Date());
  const [movementTimeStr, setMovementTimeStr] = useState(() => getNowTimeStr());
  const [productQuery, setProductQuery] = useState("");
  const [historyRange, setHistoryRange] = useState("7");
  const [historyPage, setHistoryPage] = useState(1);
  const [feedback, setFeedback] = useState({ text: "", kind: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const responsibleName = () => localStorage.getItem("batmotor-user") || "—";

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [materialsData, movementsData] = await Promise.all([fetchMaterials(), fetchMovements()]);
      setMaterials(materialsData);
      setMovements(movementsData);
      if (materialsData[0]?.id) {
        setForm((prev) => ({
          ...prev,
          materialId: prev.materialId || materialsData[0].id
        }));
        const m0 = materialsData[0];
        setProductQuery(m0?.name || "");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData().catch(() => {
      setMaterials([]);
      setMovements([]);
      setFeedback({ text: "Não foi possível carregar as movimentações.", kind: "danger" });
    });
  }, []);

  const materialsById = useMemo(
    () => Object.fromEntries(materials.map((material) => [material.id, material])),
    [materials]
  );

  const filteredMaterialsPick = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return materials.slice(0, 12);
    return materials
      .filter(
        (m) =>
          (m.name || "").toLowerCase().includes(q) ||
          String(m.id).toLowerCase().includes(q) ||
          String(m.category || "")
            .toLowerCase()
            .includes(q)
      )
      .slice(0, 12);
  }, [materials, productQuery]);

  const rangeCutoffMs = useMemo(() => {
    const now = Date.now();
    if (historyRange === "7") return now - 7 * 24 * 60 * 60 * 1000;
    if (historyRange === "30") return now - 30 * 24 * 60 * 60 * 1000;
    return 0;
  }, [historyRange]);

  const filteredHistory = useMemo(() => {
    const byDate = movements.filter((mv) => {
      if (!rangeCutoffMs) return true;
      const t = mv.createdAt ? new Date(mv.createdAt).getTime() : 0;
      return t >= rangeCutoffMs;
    });
    const q = headerSearch.trim().toLowerCase();
    if (!q) return byDate;
    return byDate.filter((mv) => {
      const mat = materialsById[mv.materialId];
      const name = (mat?.name || "").toLowerCase();
      const cat = String(mat?.category || "")
        .toLowerCase();
      const notes = String(mv.notes || "").toLowerCase();
      const motivo = notesParts(mv.notes).motivo.toLowerCase();
      const tipo = movementLabel(mv.type).toLowerCase();
      const qty = String(mv.quantity ?? "");
      return (
        name.includes(q) ||
        cat.includes(q) ||
        notes.includes(q) ||
        motivo.includes(q) ||
        tipo.includes(q) ||
        qty.includes(q)
      );
    });
  }, [movements, rangeCutoffMs, headerSearch, materialsById]);

  const historyTotalPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
  const historySafePage = Math.min(historyPage, historyTotalPages);
  const historySlice = useMemo(() => {
    const p = Math.min(historyPage, historyTotalPages);
    const start = (p - 1) * PAGE_SIZE;
    return filteredHistory.slice(start, start + PAGE_SIZE);
  }, [filteredHistory, historyPage, historyTotalPages]);

  useEffect(() => {
    if (historyPage > historyTotalPages) setHistoryPage(historyTotalPages);
  }, [historyPage, historyTotalPages]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyRange, headerSearch]);

  const onSelectMaterial = (m) => {
    setForm((prev) => ({ ...prev, materialId: m.id }));
    setProductQuery(m.name || "");
  };

  const resetForm = () => {
    const first = materials[0];
    const now = new Date();
    setForm({
      type: "IN",
      materialId: first?.id || "",
      quantity: 1,
      motivo: "",
      observations: ""
    });
    setMovementDateStr(formatDMY(now));
    setMovementDate(now);
    setMovementTimeStr(getNowTimeStr());
    setProductQuery(first?.name || "");
    setFeedback({ text: "", kind: "" });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.materialId) {
      setFeedback({ text: "Selecione um produto.", kind: "danger" });
      return;
    }
    setFeedback({ text: "", kind: "" });
    setIsSaving(true);

    const motivoLine = form.motivo?.trim() ? `Motivo: ${form.motivo.trim()}. ` : "";
    const obsLine = (form.observations || "").trim();
    const notes = `${motivoLine}${obsLine}`.trim();

    try {
      await createMovement({
        type: form.type,
        materialId: form.materialId,
        quantity: Number(form.quantity),
        notes,
        createdAt: combineDateTimeISO(movementDateStr, movementTimeStr)
      });

      setFeedback({ text: "Movimentação registrada com sucesso.", kind: "success" });
      await loadData();
      resetForm();
    } catch (err) {
      setFeedback({ text: err?.message || "Falha ao registrar movimentação.", kind: "danger" });
    } finally {
      setIsSaving(false);
    }
  };

  const exportHistoryPdf = async () => {
    if (!filteredHistory.length) {
      setFeedback({ text: "Não há registros para exportar.", kind: "info" });
      return;
    }
    try {
    const doc = new jsPDF({ orientation: "landscape" });
    let y = await addBatmotorPdfHeader(doc, { x: 14, y: 10, maxWidthMm: 62 });
    doc.setFontSize(11);
    doc.setTextColor(0, 51, 102);
    doc.text("Histórico de movimentações", 14, y);
    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, y);
    y += 8;
    const body = filteredHistory.map((mv) => {
      const mat = materialsById[mv.materialId];
      const { motivo } = notesParts(mv.notes);
      return [
        formatMovementDate(mv.createdAt),
        movementLabel(mv.type),
        mat?.name || "—",
        String(mv.quantity),
        String(mat?.currentStock ?? "—"),
        responsibleName(),
        motivo
      ];
    });
    autoTable(doc, {
      startY: 28,
      head: [["Data/Hora", "Tipo", "Produto", "Qtd", "Estoque atual", "Responsável", "Motivo"]],
      body,
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [30, 58, 138], textColor: 255 }
    });
    doc.save(`movimentacoes-batmotor-${new Date().toISOString().slice(0, 10)}.pdf`);
    setFeedback({ text: "PDF exportado.", kind: "success" });
    } catch (err) {
      setFeedback({ text: err?.message || "Não foi possível gerar o PDF.", kind: "danger" });
    }
  };

  const exportHistoryXlsx = async () => {
    if (!filteredHistory.length) {
      setFeedback({ text: "Não há registros para exportar.", kind: "info" });
      return;
    }
    try {
    const day = new Date().toISOString().slice(0, 10);
    await downloadXlsx(
      `movimentacoes-batmotor-${day}.xlsx`,
      "Movimentacoes",
      {
        dataHora: "Data/Hora",
        tipo: "Tipo",
        produto: "Produto",
        qtd: "Quantidade",
        estoqueAtual: "Estoque atual",
        responsavel: "Responsavel",
        motivo: "Motivo"
      },
      filteredHistory.map((mv) => {
        const mat = materialsById[mv.materialId];
        const { motivo } = notesParts(mv.notes);
        return {
          dataHora: formatMovementDate(mv.createdAt),
          tipo: movementLabel(mv.type),
          produto: mat?.name || "—",
          qtd: mv.quantity,
          estoqueAtual: mat?.currentStock ?? "—",
          responsavel: responsibleName(),
          motivo
        };
      })
    );
    setFeedback({ text: "Planilha Excel exportada.", kind: "success" });
    } catch (err) {
      setFeedback({ text: err?.message || "Não foi possível exportar o Excel.", kind: "danger" });
    }
  };

  const qtyDisplay = (type, qty) => {
    const n = Number(qty) || 0;
    if (type === "IN") return { text: `+${n}`, className: "movements-estocae__qty--in" };
    if (type === "OUT") return { text: `-${n}`, className: "movements-estocae__qty--out" };
    return { text: String(n), className: "movements-estocae__qty--adj" };
  };

  const pageNumbers = useMemo(() => {
    const maxVis = 5;
    const tp = historyTotalPages;
    const sp = historySafePage;
    if (tp <= maxVis) return Array.from({ length: tp }, (_, i) => i + 1);
    const half = Math.floor(maxVis / 2);
    let start = Math.max(1, sp - half);
    let end = start + maxVis - 1;
    if (end > tp) {
      end = tp;
      start = Math.max(1, end - maxVis + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [historyTotalPages, historySafePage]);

  return (
    <div className="movements-estocae">
      <section className="movements-estocae__card movements-estocae__card--form">
        <div className="movements-estocae__card-head">
          <span className="movements-estocae__card-icon" aria-hidden>
            <i className="ri-add-circle-line" />
          </span>
          <h2 className="movements-estocae__card-title">Nova Movimentação</h2>
        </div>

        <form className="movements-estocae__form" onSubmit={onSubmit}>
          <div className="row g-4">
            <div className="col-lg-6">
              <label className="movements-estocae__label">Tipo de Movimentação</label>
              <div className="movements-estocae__segmented" role="group" aria-label="Tipo">
                {[
                  { value: "IN", label: "Entrada" },
                  { value: "OUT", label: "Saída" },
                  { value: "ADJ", label: "Ajuste" }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`movements-estocae__segment${form.type === opt.value ? " is-active" : ""}`}
                    onClick={() => setForm((p) => ({ ...p, type: opt.value }))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <label className="movements-estocae__label mt-3" htmlFor="mov-product">
                Produto
              </label>
              <div className="movements-estocae__search-wrap">
                <i className="ri-search-line movements-estocae__search-icon" aria-hidden />
                <input
                  id="mov-product"
                  type="text"
                  className="form-control movements-estocae__control movements-estocae__search-input"
                  placeholder="Busque por nome ou código"
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  autoComplete="off"
                />
              </div>
              {productQuery.trim() ? (
                <ul className="movements-estocae__suggest list-unstyled mb-0">
                  {filteredMaterialsPick.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        className={`movements-estocae__suggest-item${
                          String(form.materialId) === String(m.id) ? " is-picked" : ""
                        }`}
                        onClick={() => onSelectMaterial(m)}
                      >
                        <span className="movements-estocae__suggest-name">{m.name}</span>
                        <span className="movements-estocae__suggest-meta">
                          {m.category} · {m.id}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <label className="movements-estocae__label mt-3" htmlFor="mov-qty">
                Quantidade
              </label>
              <input
                id="mov-qty"
                type="number"
                min="0"
                step="1"
                className="form-control movements-estocae__control"
                value={form.quantity}
                onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
              />
            </div>

            <div className="col-lg-6">
              <label className="movements-estocae__label" id="mov-motivo-label" htmlFor="mov-motivo">
                Motivo
              </label>
              <SuppliersGlassSelect
                id="mov-motivo"
                listLabelledBy="mov-motivo-label"
                value={form.motivo}
                onChange={(v) => setForm((p) => ({ ...p, motivo: v }))}
                options={MOTIVO_OPTIONS.map((o) => ({ value: o, label: o }))}
                placeholder="Selecione uma categoria"
                large
              />

              <div className="movements-estocae__label mt-3">Data/Hora</div>
              <div className="row g-2 movements-estocae__datetime-row align-items-stretch">
                <div className="col-sm-7 d-flex align-items-center">
                  <div className="movements-estocae__date-field w-100">
                    <ExpiryDateField
                      id="mov-dt"
                      valueStr={movementDateStr}
                      onChangeStr={setMovementDateStr}
                      selectedDate={movementDate}
                      onSelectDate={setMovementDate}
                    />
                  </div>
                </div>
                <div className="col-sm-5 d-flex align-items-center">
                  <label className="visually-hidden" htmlFor="mov-time">
                    Hora
                  </label>
                  <div className="movements-estocae__time-wrap w-100">
                    <input
                      id="mov-time"
                      type="time"
                      step={60}
                      className="form-control movements-estocae__control movements-estocae__time-input"
                      value={movementTimeStr}
                      onChange={(e) => setMovementTimeStr(e.target.value)}
                    />
                    <span className="movements-estocae__time-icon" aria-hidden>
                      <i className="ri-time-line" />
                    </span>
                  </div>
                </div>
              </div>

              <label className="movements-estocae__label mt-3" htmlFor="mov-obs">
                Observações
              </label>
              <textarea
                id="mov-obs"
                className="form-control movements-estocae__control movements-estocae__textarea"
                rows={4}
                placeholder="Adicione observações relevantes"
                value={form.observations}
                onChange={(e) => setForm((p) => ({ ...p, observations: e.target.value }))}
              />
            </div>
          </div>

          {feedback.text ? (
            <div className={`movements-estocae__feedback movements-estocae__feedback--${feedback.kind || "info"}`}>
              {feedback.text}
            </div>
          ) : null}

          <div className="movements-estocae__form-actions">
            <button type="button" className="btn movements-estocae__btn-cancel" onClick={resetForm}>
              <i className="ri-close-line me-1" aria-hidden />
              Cancelar
            </button>
            <button type="submit" className="btn movements-estocae__btn-save" disabled={isSaving}>
              <i className="ri-save-3-line me-1" aria-hidden />
              {isSaving ? "Salvando…" : "Salvar movimentação"}
            </button>
          </div>
        </form>
      </section>

      <section className="movements-estocae__card movements-estocae__card--table mt-4">
        <div className="movements-estocae__table-toolbar">
          <div className="movements-estocae__table-head">
            <span className="movements-estocae__table-icon" aria-hidden>
              <i className="ri-history-line" />
            </span>
            <h2 className="movements-estocae__card-title mb-0">Histórico de Movimentações</h2>
          </div>
          <div className="movements-estocae__table-tools">
            <div className="movements-estocae__range-select">
              <SuppliersGlassSelect
                id="mov-range"
                listLabelledBy="mov-range"
                value={historyRange}
                onChange={(v) => setHistoryRange(v)}
                options={HISTORY_RANGE_OPTIONS}
                allowEmpty={false}
              />
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button type="button" className="btn movements-estocae__btn-export" onClick={exportHistoryPdf}>
                <i className="ri-file-pdf-line me-1" aria-hidden />
                PDF
              </button>
              <button type="button" className="btn movements-estocae__btn-export" onClick={exportHistoryXlsx}>
                <i className="ri-file-excel-2-line me-1" aria-hidden />
                Excel
              </button>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table align-middle mb-0 movements-estocae__table">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Tipo</th>
                <th>Produto</th>
                <th>Quantidade</th>
                <th>Estoque atual</th>
                <th>Responsável</th>
                <th>Motivo</th>
                <th className="text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8}>
                    <div className="movements-estocae__empty py-5 text-center text-muted">
                      Carregando movimentações...
                    </div>
                  </td>
                </tr>
              ) : historySlice.length ? (
                historySlice.map((mv) => {
                  const mat = materialsById[mv.materialId];
                  const { motivo } = notesParts(mv.notes);
                  const qd = qtyDisplay(mv.type, mv.quantity);
                  return (
                    <tr key={mv.id}>
                      <td className="movements-estocae__mono">{formatMovementDate(mv.createdAt)}</td>
                      <td>
                        <span
                          className={`movements-estocae__badge movements-estocae__badge--${mv.type === "ADJ" ? "adj" : mv.type === "OUT" ? "out" : "in"}`}
                        >
                          {movementLabel(mv.type)}
                        </span>
                      </td>
                      <td>
                        <div className="movements-estocae__product-name">{mat?.name || "—"}</div>
                        <div className="movements-estocae__product-sub">{mat?.category || ""}</div>
                      </td>
                      <td className={`fw-semibold ${qd.className}`}>{qd.text}</td>
                      <td className="movements-estocae__mono">{mat?.currentStock ?? "—"}</td>
                      <td>{responsibleName()}</td>
                      <td className="movements-estocae__muted small">{motivo}</td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="movements-estocae__icon-btn"
                          title="Detalhes"
                          aria-label="Ver"
                          onClick={() =>
                            window.alert(
                              `${movementLabel(mv.type)} · ${mat?.name || "—"}\n${formatMovementDate(mv.createdAt)}\n${mv.notes || "—"}`
                            )
                          }
                        >
                          <i className="ri-eye-line" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="movements-estocae__icon-btn movements-estocae__icon-btn--muted"
                          title="Exclusão não disponível na API"
                          aria-label="Excluir"
                          disabled
                        >
                          <i className="ri-delete-bin-line" aria-hidden />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8}>
                    <div className="movements-estocae__empty py-5 text-center text-muted">
                      Nenhuma movimentação no período.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredHistory.length > 0 ? (
          <nav className="movements-estocae__pagination" aria-label="Paginação">
            <button
              type="button"
              className="movements-estocae__page-btn"
              disabled={historySafePage <= 1}
              onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
              aria-label="Anterior"
            >
              &lt;
            </button>
            {pageNumbers.map((n) => (
              <button
                key={n}
                type="button"
                className={`movements-estocae__page-btn${n === historySafePage ? " is-active" : ""}`}
                onClick={() => setHistoryPage(n)}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              className="movements-estocae__page-btn"
              disabled={historySafePage >= historyTotalPages}
              onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
              aria-label="Próxima"
            >
              &gt;
            </button>
          </nav>
        ) : null}
      </section>
    </div>
  );
}

export default MovementsPage;
