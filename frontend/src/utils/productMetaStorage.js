/**
 * Metadados extra do produto (código de barras, local) — a API de matéria-prima não tem estes campos;
 * guardamos no browser para a pesquisa e o modal funcionarem de forma coerente.
 */
const PREFIX = "batmotor-product-meta:";

function key(materialId) {
  return `${PREFIX}${String(materialId)}`;
}

export function getProductMeta(materialId) {
  if (materialId == null || materialId === "") return { barcode: "", stockLocation: "" };
  try {
    const raw = localStorage.getItem(key(materialId));
    if (!raw) return { barcode: "", stockLocation: "" };
    const o = JSON.parse(raw);
    return {
      barcode: typeof o.barcode === "string" ? o.barcode : "",
      stockLocation: typeof o.stockLocation === "string" ? o.stockLocation : ""
    };
  } catch {
    return { barcode: "", stockLocation: "" };
  }
}

export function removeProductMeta(materialId) {
  if (materialId == null || materialId === "") return;
  try {
    localStorage.removeItem(key(materialId));
  } catch {
    /* ignore */
  }
}

export function setProductMeta(materialId, partial) {
  if (materialId == null || materialId === "") return;
  try {
    const prev = getProductMeta(materialId);
    const next = {
      barcode: partial.barcode != null ? String(partial.barcode) : prev.barcode,
      stockLocation: partial.stockLocation != null ? String(partial.stockLocation) : prev.stockLocation
    };
    const json = JSON.stringify(next);
    if (json.length > 100_000) return;
    localStorage.setItem(key(materialId), json);
  } catch {
    /* quota */
  }
}
