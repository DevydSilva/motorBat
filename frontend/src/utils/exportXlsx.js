import ExcelJS from "exceljs";
import { getBatmotorWordmarkPngBase64 } from "./batmotorExportBrand.js";

/** Tamanho da logomarca na planilha (px). */
const BRAND_IMG_EXT = { width: 268, height: 56 };

/** Primeira linha da tabela de dados (após área da marca). */
const HEADER_ROW = 4;

function saveWorkbookBuffer(buffer, filename) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function embedBrandImage(wb, ws) {
  const base64 = await getBatmotorWordmarkPngBase64();
  const imageId = wb.addImage({
    base64,
    extension: "png"
  });
  ws.addImage(imageId, {
    tl: { col: 0, row: 0 },
    ext: BRAND_IMG_EXT
  });
  ws.getRow(1).height = 42;
  ws.getRow(2).height = 8;
  ws.getRow(3).height = 8;
}

function styleHeaderCell(cell) {
  cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A8A" }
  };
}

/**
 * Gera .xlsx com logomarca Batmotor no topo.
 * @param {string} filename
 * @param {string} sheetName
 * @param {Record<string, string>} columns
 * @param {object[]} rows
 */
export async function downloadXlsx(filename, sheetName, columns, rows) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Batmotor";
  const ws = wb.addWorksheet(sheetName.slice(0, 31) || "Dados");
  await embedBrandImage(wb, ws);

  const keys = Object.keys(columns);
  const headerRow = ws.getRow(HEADER_ROW);
  keys.forEach((k, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = columns[k];
    styleHeaderCell(cell);
  });

  const list = Array.isArray(rows) ? rows : [];
  list.forEach((row, ri) => {
    const excelRow = ws.getRow(HEADER_ROW + 1 + ri);
    keys.forEach((k, ci) => {
      const v = row[k];
      let val = v;
      if (v === null || v === undefined) val = "";
      else if (typeof v === "object") val = JSON.stringify(v);
      excelRow.getCell(ci + 1).value = val;
    });
  });

  const buf = await wb.xlsx.writeBuffer();
  saveWorkbookBuffer(buf, filename);
}

/**
 * Livro com várias folhas, cada uma com a logomarca.
 * @param {string} filename
 * @param {{ name: string; columns: Record<string, string>; rows: object[] }[]} sheets
 */
export async function downloadXlsxWorkbook(filename, sheets) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Batmotor";
  for (const sh of sheets) {
    const ws = wb.addWorksheet(sh.name.slice(0, 31) || "Sheet");
    await embedBrandImage(wb, ws);
    const keys = Object.keys(sh.columns);
    const headerRow = ws.getRow(HEADER_ROW);
    keys.forEach((k, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = sh.columns[k];
      styleHeaderCell(cell);
    });
    const list = Array.isArray(sh.rows) ? sh.rows : [];
    list.forEach((row, ri) => {
      const excelRow = ws.getRow(HEADER_ROW + 1 + ri);
      keys.forEach((k, ci) => {
        const v = row[k];
        let val = v;
        if (v === null || v === undefined) val = "";
        else if (typeof v === "object") val = JSON.stringify(v);
        excelRow.getCell(ci + 1).value = val;
      });
    });
  }
  const buf = await wb.xlsx.writeBuffer();
  saveWorkbookBuffer(buf, filename);
}
