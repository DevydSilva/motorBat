/** Fotos de produto: guardadas no browser (API de matéria-prima ainda não persiste ficheiros). */
const PREFIX = "batmotor-product-image:";

export function productImageKey(materialId) {
  return `${PREFIX}${String(materialId)}`;
}

export function getProductImageDataUrl(materialId) {
  if (materialId == null || materialId === "") return "";
  try {
    return localStorage.getItem(productImageKey(materialId)) || "";
  } catch {
    return "";
  }
}

export function setProductImageDataUrl(materialId, dataUrl) {
  if (materialId == null || materialId === "") return;
  try {
    if (!dataUrl || typeof dataUrl !== "string") {
      localStorage.removeItem(productImageKey(materialId));
      return;
    }
    if (dataUrl.length > 2_400_000) {
      console.warn("[BatMotor] Imagem demasiado grande para guardar localmente.");
      return;
    }
    localStorage.setItem(productImageKey(materialId), dataUrl);
  } catch {
    /* quota excedida ou modo privado */
  }
}
