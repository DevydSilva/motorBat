/**
 * Pesquisa tolerante: minúsculas, sem acentos, e comparação por dígitos (CNPJ, códigos).
 */

export function normalizeForSearch(s) {
  if (s == null) return "";
  try {
    return String(s)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  } catch {
    return String(s).toLowerCase().trim();
  }
}

export function digitsOnly(s) {
  return String(s ?? "").replace(/\D/g, "");
}

/** Termos muito genéricos: não filtram (mostram tudo), para não parecer que a pesquisa “não funciona”. */
const GENERIC_SHOW_ALL_PRODUCTS = new Set([
  "produto",
  "produtos",
  "item",
  "itens",
  "todos",
  "tudo",
  "lista",
  "catalogo",
  "inventario"
]);

const GENERIC_SHOW_ALL_SUPPLIERS = new Set([
  "fornecedor",
  "fornecedores",
  "empresa",
  "empresas",
  "todos",
  "tudo",
  "lista"
]);

const GENERIC_SHOW_ALL_STOCK = new Set([
  "estoque",
  "stock",
  "material",
  "materiais",
  "insumo",
  "insumos",
  "produto",
  "produtos",
  "item",
  "itens",
  "todos",
  "tudo",
  "lista"
]);

export function isGenericShowAllProductsQuery(rawQuery) {
  const q = normalizeForSearch(rawQuery);
  return q.length > 0 && GENERIC_SHOW_ALL_PRODUCTS.has(q);
}

export function isGenericShowAllSuppliersQuery(rawQuery) {
  const q = normalizeForSearch(rawQuery);
  return q.length > 0 && GENERIC_SHOW_ALL_SUPPLIERS.has(q);
}

export function isGenericShowAllStockQuery(rawQuery) {
  const q = normalizeForSearch(rawQuery);
  return q.length > 0 && GENERIC_SHOW_ALL_STOCK.has(q);
}

/** Painel (/): termos que não devem esvaziar o resumo nem a tabela inferior. */
const GENERIC_DASHBOARD_PANEL = new Set([
  "painel",
  "dashboard",
  "inicio",
  "resumo",
  "home",
  "batmotor",
  "grafico",
  "graficos",
  "movimentacao",
  "movimentacoes",
  "alerta",
  "alertas",
  "kpi",
  "indicador",
  "indicadores"
]);

/**
 * No dashboard, estes termos mostram todos os itens do resumo (como pesquisa vazia).
 * Inclui os mesmos genéricos de produtos/estoque/fornecedores.
 */
export function isGenericDashboardPanelQuery(rawQuery) {
  if (isGenericShowAllProductsQuery(rawQuery)) return true;
  if (isGenericShowAllStockQuery(rawQuery)) return true;
  if (isGenericShowAllSuppliersQuery(rawQuery)) return true;
  const q = normalizeForSearch(rawQuery);
  return q.length > 0 && GENERIC_DASHBOARD_PANEL.has(q);
}

/**
 * @param {string} rawQuery — texto do utilizador
 * @param {unknown[]} fields — valores a pesquisar (nome, código, CNPJ, id, etc.)
 */
export function rowMatchesQuery(rawQuery, fields) {
  const q = normalizeForSearch(rawQuery);
  if (!q) return true;

  const list = Array.isArray(fields) ? fields : [];
  for (const field of list) {
    if (field == null) continue;
    const str = String(field);
    if (normalizeForSearch(str).includes(q)) return true;
  }

  const qDigits = digitsOnly(rawQuery);
  if (qDigits.length >= 2) {
    for (const field of list) {
      if (field == null) continue;
      const fd = digitsOnly(field);
      if (fd.includes(qDigits)) return true;
    }
  }

  return false;
}
