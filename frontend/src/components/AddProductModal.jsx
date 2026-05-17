/**
 * Modal para criar/editar produto com imagem local, categoria e campos alinhados ao inventário.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ExpiryDateField } from "./OrangeCalendarPopover";
import ProductOrangeSelect from "./ProductOrangeSelect";
import { getProductImageDataUrl } from "@/utils/productImageStorage.js";

const UNIT_OPTIONS = [
  { value: "UN", label: "UN (unidade)" },
  { value: "kg", label: "kg (quilograma)" },
  { value: "g", label: "g (grama)" },
  { value: "L", label: "L (litro)" },
  { value: "mL", label: "mL (mililitro)" },
  { value: "m", label: "m (metro)" },
  { value: "m²", label: "m² (metro quadrado)" },
  { value: "m³", label: "m³ (metro cúbico)" },
  { value: "cx", label: "cx (caixa)" },
  { value: "pct", label: "pct (pacote)" },
  { value: "par", label: "par" }
];

const INITIAL_FORM = {
  name: "",
  productCode: "",
  description: "",
  category: "",
  supplierId: "",
  costPrice: "0",
  salePrice: "0",
  quantity: "0",
  minQuantity: "0",
  barcode: "",
  stockLocation: "",
  active: true,
  weightKg: "0,00",
  dimensions: "",
  expiryStr: "",
  unit: "UN"
};

function genProductCode() {
  return `PRD-${String(Math.floor(100 + Math.random() * 900))}`;
}

function genBarcode() {
  return String(Math.floor(1e12 + Math.random() * 9e12));
}

function formatProductCodeFromId(id, index = 0) {
  const n = Number(id);
  if (Number.isFinite(n)) return `PRD-${String(n).padStart(3, "0")}`;
  return `PRD-${String(index + 1).padStart(3, "0")}`;
}

/**
 * Modal “Adicionar Novo Produto” — layout duas colunas, seção inventário, calendário de validade.
 */
export default function AddProductModal({
  open,
  onClose,
  suppliers = [],
  categoriesFromDb = [],
  editingMaterial = null,
  onSave,
  isSaving = false
}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [expiryDate, setExpiryDate] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const imageInputRef = useRef(null);
  const imageFileRef = useRef(null);

  /** Só categorias vindas dos produtos no banco; na edição inclui a categoria do item atual. */
  const categorySelectOptions = useMemo(() => {
    const s = new Set((categoriesFromDb || []).filter(Boolean));
    if (editingMaterial?.category) s.add(editingMaterial.category);
    return [...s].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [categoriesFromDb, editingMaterial]);

  useEffect(() => {
    if (!open) return;
    if (editingMaterial) {
      const rawU = editingMaterial.unit || "UN";
      const unitNorm = String(rawU).toLowerCase() === "un" ? "UN" : rawU;
      setForm({
        ...INITIAL_FORM,
        name: editingMaterial.name || "",
        productCode: editingMaterial.productCode || formatProductCodeFromId(editingMaterial.id),
        description: editingMaterial.description || "",
        category: editingMaterial.category || "",
        supplierId: editingMaterial.supplierId != null ? String(editingMaterial.supplierId) : "",
        quantity: String(editingMaterial.currentStock ?? 0),
        minQuantity: String(editingMaterial.minStock ?? 0),
        active: editingMaterial.active !== false,
        unit: unitNorm,
        costPrice:
          editingMaterial.costPrice != null && editingMaterial.costPrice !== ""
            ? String(editingMaterial.costPrice)
            : "0",
        salePrice:
          editingMaterial.salePrice != null && editingMaterial.salePrice !== ""
            ? String(editingMaterial.salePrice)
            : "0",
        barcode: editingMaterial.barcode || "",
        stockLocation: editingMaterial.stockLocation || "",
        weightKg: editingMaterial.weightKg || "0,00",
        dimensions: editingMaterial.dimensions || "",
        expiryStr: editingMaterial.expiryStr || ""
      });
      setExpiryDate(null);
      imageFileRef.current = null;
      const sid = editingMaterial.id != null ? String(editingMaterial.id) : "";
      const stored = sid ? getProductImageDataUrl(sid) : "";
      setImagePreview(stored || editingMaterial.imageDataUrl || null);
    } else {
      setForm({ ...INITIAL_FORM, productCode: genProductCode() });
      setExpiryDate(null);
      imageFileRef.current = null;
      setImagePreview(null);
    }
  }, [open, editingMaterial]);

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const onImageFiles = (files) => {
    const f = files?.[0];
    if (!f || !/^image\//.test(f.type)) return;
    if (imagePreview && imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    imageFileRef.current = f;
    setImagePreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category?.trim()) return;
    if (!form.name?.trim()) return;
    const qty = Number(String(form.quantity).replace(",", ".")) || 0;
    const minQ = Number(String(form.minQuantity).replace(",", ".")) || 0;

    let imageDataUrl = "";
    const file = imageFileRef.current;
    if (file) {
      imageDataUrl = await new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(typeof r.result === "string" ? r.result : "");
        r.onerror = () => resolve("");
        r.readAsDataURL(file);
      });
    } else if (imagePreview && String(imagePreview).startsWith("data:")) {
      imageDataUrl = imagePreview;
    }

    onSave?.({
      name: form.name.trim(),
      category: form.category.trim(),
      description: form.description.trim(),
      productCode: form.productCode.trim(),
      barcode: form.barcode.trim(),
      stockLocation: form.stockLocation.trim(),
      costPrice: Number(String(form.costPrice).replace(",", ".")) || 0,
      salePrice: Number(String(form.salePrice).replace(",", ".")) || 0,
      quantity: qty,
      minQuantity: minQ,
      supplierId: form.supplierId || undefined,
      active: form.active,
      unit: form.unit || "UN",
      weightKg: form.weightKg,
      dimensions: form.dimensions.trim(),
      expiryStr: form.expiryStr.trim(),
      imageDataUrl: imageDataUrl || undefined
    });
  };

  if (!open) return null;

  const isEdit = editingMaterial != null;

  return (
    <>
      <div className="add-product-modal__backdrop" role="presentation" onClick={onClose} />
      <div className="add-product-modal" role="dialog" aria-modal="true" aria-labelledby="add-product-modal-title">
        <div className="add-product-modal__dialog">
          <header className="add-product-modal__header">
            <h2 id="add-product-modal-title" className="add-product-modal__title">
              {isEdit ? "Editar produto" : "Adicionar Novo Produto"}
            </h2>
            <button type="button" className="add-product-modal__close-red" onClick={onClose} aria-label="Fechar">
              <i className="ri-close-line" aria-hidden />
            </button>
          </header>

          <form className="add-product-modal__form" onSubmit={handleSubmit}>
            <div className="row g-4">
              <div className="col-lg-6">
                <label className="add-product-modal__label">Imagem do Produto</label>
                <div
                  className="add-product-modal__image-zone"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      imageInputRef.current?.click();
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    onImageFiles(e.dataTransfer?.files);
                  }}
                  onClick={() => imageInputRef.current?.click()}
                >
                  <input
                    ref={imageInputRef}
                    type="file"
                    className="add-product-modal__image-input"
                    accept="image/png,image/jpeg,image/gif"
                    onChange={(e) => onImageFiles(e.target.files)}
                  />
                  {imagePreview ? (
                    <img src={imagePreview} alt="" className="add-product-modal__image-preview" />
                  ) : (
                    <>
                      <i className="ri-image-2-line add-product-modal__image-icon" aria-hidden />
                      <p className="add-product-modal__image-text">Enviar uma imagem ou arraste e solte</p>
                      <p className="add-product-modal__image-hint">PNG, JPG, GIF até 5MB</p>
                    </>
                  )}
                </div>

                <label className="add-product-modal__label" htmlFor="apm-name">
                  Nome do Produto <span className="text-danger">*</span>
                </label>
                <input
                  id="apm-name"
                  className="form-control add-product-modal__control"
                  placeholder="Ex.: Notebook Dell Inspiron 15"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />

                <label className="add-product-modal__label" htmlFor="apm-code">
                  Código do Produto <span className="text-danger">*</span>
                </label>
                <div className="add-product-modal__input-with-btn">
                  <input
                    id="apm-code"
                    className="form-control add-product-modal__control"
                    placeholder="Ex.: PRD-001"
                    value={form.productCode}
                    onChange={(e) => setForm((p) => ({ ...p, productCode: e.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    className="add-product-modal__yellow-icon-btn"
                    title="Gerar código"
                    aria-label="Gerar código"
                    onClick={() => setForm((p) => ({ ...p, productCode: genProductCode() }))}
                  >
                    <i className="ri-refresh-line" aria-hidden />
                  </button>
                </div>

                <label className="add-product-modal__label" htmlFor="apm-desc">
                  Descrição
                </label>
                <textarea
                  id="apm-desc"
                  className="form-control add-product-modal__textarea"
                  rows={4}
                  placeholder="Descreva detalhes sobre o produto"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="col-lg-6">
                <div className="row g-3">
                  <div className="col-sm-6">
                    <label className="add-product-modal__label" id="apm-cat-label" htmlFor="apm-cat">
                      Categoria <span className="text-danger">*</span>
                    </label>
                    <ProductOrangeSelect
                      id="apm-cat"
                      listLabelledBy="apm-cat-label"
                      value={form.category}
                      onChange={(v) => setForm((p) => ({ ...p, category: v }))}
                      options={categorySelectOptions.map((c) => ({ value: c, label: c }))}
                      placeholder="Selecione um tipo"
                      required
                    />
                  </div>
                  <div className="col-sm-6">
                    <label className="add-product-modal__label" id="apm-supplier-label" htmlFor="apm-supplier">
                      Fornecedor
                    </label>
                    <ProductOrangeSelect
                      id="apm-supplier"
                      listLabelledBy="apm-supplier-label"
                      value={form.supplierId}
                      onChange={(v) => setForm((p) => ({ ...p, supplierId: String(v) }))}
                      options={suppliers.map((s) => ({ value: String(s.id), label: s.name }))}
                      placeholder="Selecione"
                    />
                  </div>
                </div>

                <div className="row g-3 mt-0">
                  <div className="col-12">
                    <label className="add-product-modal__label" id="apm-unit-label" htmlFor="apm-unit">
                      Unidade de medida <span className="text-danger">*</span>
                    </label>
                    <ProductOrangeSelect
                      id="apm-unit"
                      listLabelledBy="apm-unit-label"
                      value={form.unit}
                      onChange={(v) => setForm((p) => ({ ...p, unit: String(v) }))}
                      options={UNIT_OPTIONS}
                      placeholder="Selecione a unidade"
                      required
                    />
                  </div>
                </div>

                <div className="row g-3 mt-0">
                  <div className="col-sm-6">
                    <label className="add-product-modal__label" htmlFor="apm-cost">
                      Preço de Custo <span className="text-danger">*</span>
                    </label>
                    <div className="add-product-modal__money-wrap">
                      <span className="add-product-modal__money-prefix">R$</span>
                      <input
                        id="apm-cost"
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control add-product-modal__control add-product-modal__money-input"
                        placeholder="0,00"
                        value={form.costPrice}
                        onChange={(e) => setForm((p) => ({ ...p, costPrice: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <label className="add-product-modal__label" htmlFor="apm-sale">
                      Preço de Venda <span className="text-danger">*</span>
                    </label>
                    <div className="add-product-modal__money-wrap">
                      <span className="add-product-modal__money-prefix">R$</span>
                      <input
                        id="apm-sale"
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control add-product-modal__control add-product-modal__money-input"
                        placeholder="0,00"
                        value={form.salePrice}
                        onChange={(e) => setForm((p) => ({ ...p, salePrice: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="row g-3 mt-0">
                  <div className="col-sm-6">
                    <label className="add-product-modal__label" htmlFor="apm-qty">
                      Quantidade
                    </label>
                    <input
                      id="apm-qty"
                      type="number"
                      min="0"
                      className="form-control add-product-modal__control"
                      value={form.quantity}
                      onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                      disabled={isEdit}
                    />
                  </div>
                  <div className="col-sm-6">
                    <label className="add-product-modal__label" htmlFor="apm-minqty">
                      Quantidade mínima <span className="text-danger">*</span>
                    </label>
                    <input
                      id="apm-minqty"
                      type="number"
                      min="0"
                      className="form-control add-product-modal__control"
                      value={form.minQuantity}
                      onChange={(e) => setForm((p) => ({ ...p, minQuantity: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <label className="add-product-modal__label" htmlFor="apm-barcode">
                  Código de Barras
                </label>
                <div className="add-product-modal__input-with-btn">
                  <input
                    id="apm-barcode"
                    className="form-control add-product-modal__control"
                    placeholder="Digite ou escaneie"
                    value={form.barcode}
                    onChange={(e) => setForm((p) => ({ ...p, barcode: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="add-product-modal__yellow-icon-btn"
                    title="Gerar código"
                    aria-label="Gerar código de barras"
                    onClick={() => setForm((p) => ({ ...p, barcode: genBarcode() }))}
                  >
                    <i className="ri-refresh-line" aria-hidden />
                  </button>
                </div>

                <label className="add-product-modal__label" htmlFor="apm-loc">
                  Localização no Estoque
                </label>
                <input
                  id="apm-loc"
                  className="form-control add-product-modal__control"
                  placeholder="Ex.: Prateleira A3, Caixa 5"
                  value={form.stockLocation}
                  onChange={(e) => setForm((p) => ({ ...p, stockLocation: e.target.value }))}
                />

                <div className="add-product-modal__status-row">
                  <span className="add-product-modal__label mb-0">Status</span>
                  <label className="add-product-modal__switch">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                    />
                    <span className="add-product-modal__switch-track" />
                    <span className="add-product-modal__switch-label">Ativo</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="add-product-modal__divider" />

            <div className="add-product-modal__inventory-block">
              <h3 className="add-product-modal__section-title">
                <span className="add-product-modal__section-icon" aria-hidden>
                  <i className="ri-error-warning-line" />
                </span>
                Inventário de produtos
              </h3>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="add-product-modal__label" htmlFor="apm-weight">
                    Peso (kg)
                  </label>
                  <input
                    id="apm-weight"
                    className="form-control add-product-modal__control"
                    value={form.weightKg}
                    onChange={(e) => setForm((p) => ({ ...p, weightKg: e.target.value }))}
                  />
                </div>
                <div className="col-md-4">
                  <label className="add-product-modal__label" htmlFor="apm-dim">
                    Dimensões (cm)
                  </label>
                  <input
                    id="apm-dim"
                    className="form-control add-product-modal__control"
                    placeholder="L x A x C"
                    value={form.dimensions}
                    onChange={(e) => setForm((p) => ({ ...p, dimensions: e.target.value }))}
                  />
                </div>
                <div className="col-md-4">
                  <label className="add-product-modal__label" htmlFor="apm-expiry">
                    Data de Validade
                  </label>
                  <ExpiryDateField
                    id="apm-expiry"
                    valueStr={form.expiryStr}
                    onChangeStr={(s) => setForm((p) => ({ ...p, expiryStr: s }))}
                    selectedDate={expiryDate}
                    onSelectDate={setExpiryDate}
                  />
                </div>
              </div>
            </div>

            <footer className="add-product-modal__footer">
              <button type="button" className="add-product-modal__btn-cancel" onClick={onClose}>
                <i className="ri-close-line me-1" aria-hidden />
                Cancelar
              </button>
              <button type="submit" className="add-product-modal__btn-save" disabled={isSaving}>
                <i className="ri-save-3-line me-1" aria-hidden />
                {isSaving ? "Salvando…" : "Salvar produto"}
              </button>
            </footer>
          </form>
        </div>
      </div>
    </>
  );
}
