/**
 * Logomarca Batmotor (wordmark + tagline) para PDF e Excel.
 * Usa o mesmo SVG da tela de login (`TextoDALOGO (1).svg`), rasterizado no browser.
 */
import wordmarkSrc from "@/assets/TextoDALOGO (1).svg?url";

/** @type {Promise<string> | null} */
let pngDataUrlPromise = null;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar a logomarca."));
    img.src = src;
  });
}

/**
 * @returns {Promise<string>} data URL PNG (fundo branco)
 */
export function getBatmotorWordmarkPngDataUrl() {
  if (!pngDataUrlPromise) {
    pngDataUrlPromise = (async () => {
      const img = await loadImage(wordmarkSrc);
      const scale = 2;
      const maxW = 720;
      const nw = img.naturalWidth || img.width;
      const nh = img.naturalHeight || img.height;
      const w = Math.min(nw, maxW);
      const h = (nh / nw) * w;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas não disponível.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, w, h);
      return canvas.toDataURL("image/png");
    })();
  }
  return pngDataUrlPromise;
}

/**
 * Base64 cru (sem prefixo data:) para ExcelJS no browser.
 */
export async function getBatmotorWordmarkPngBase64() {
  const dataUrl = await getBatmotorWordmarkPngDataUrl();
  const i = dataUrl.indexOf(",");
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
}

/**
 * Cabeçalho PDF com logomarca (substitui título textual “Batmotor”).
 * @param {import("jspdf").default} doc
 * @param {{ x?: number; y?: number; maxWidthMm?: number }} [options]
 * @returns {Promise<number>} Y inicial (mm) para linhas de texto / autoTable abaixo da marca
 */
export async function addBatmotorPdfHeader(doc, options = {}) {
  const x = options.x ?? 14;
  const y0 = options.y ?? 10;
  const maxWidthMm = options.maxWidthMm ?? 56;
  const dataUrl = await getBatmotorWordmarkPngDataUrl();
  const img = await loadImage(dataUrl);
  const wMm = maxWidthMm;
  const hMm = ((img.naturalHeight || img.height) / (img.naturalWidth || img.width)) * wMm;
  doc.addImage(dataUrl, "PNG", x, y0, wMm, hMm);
  return y0 + hMm + 5;
}
