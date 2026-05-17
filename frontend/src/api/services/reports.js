/**
 * =============================================================================
 * reports.js — CLIENTE HTTP DOS RELATÓRIOS + fallback
 * =============================================================================
 * fetchMinStockAlerts  → GET /relatorios/estoque-baixo; mapeia nomes PT do JSON.
 * fetchStockSummary    → agrega totais (remoto via materiais ou mock).
 * fetchMovimentacoesPorDia → série para gráficos.
 * sendLowStockAlertEmail   → POST /relatorios/estoque-baixo/enviar-email (só gestão).
 *
 * Em erro de rede, algumas funções degradam para fetchMaterials() local (UX tolerante).
 * UI: ReportsPage.jsx | Guia: docs/GUIA_PEDAGOGICO_BATMOTOR.md
 * =============================================================================
 */
import { api, getUseMock } from "../client.js";
import { mockDb, mockDelay, mockStockSummary } from "../mock/store.js";
import { stockSummaryFromMaterials } from "../batmotorAdapters.js";
import { fetchMaterials } from "./materials.js";
import { toApiError } from "./errors.js";

export async function fetchMinStockAlerts() {
  if (getUseMock()) {
    await mockDelay();
    return mockDb.materials.filter((m) => Number(m.currentStock) <= Number(m.minStock));
  }
  try {
    const { data } = await api.get("/relatorios/estoque-baixo");
    const itens = Array.isArray(data?.itens) ? data.itens : [];
    return itens.map((r) => ({
      id: r.materia_prima_id,
      name: r.nome,
      category: r.categoria,
      unit: r.unidade,
      minStock: r.estoque_minimo,
      currentStock: r.quantidade_atual,
      active: true,
      deficit: r.deficit
    }));
  } catch {
    const materials = await fetchMaterials();
    return materials.filter((m) => Number(m.currentStock) <= Number(m.minStock));
  }
}

export async function fetchStockSummary() {
  if (getUseMock()) {
    await mockDelay();
    return mockStockSummary();
  }
  const materials = await fetchMaterials();
  return stockSummaryFromMaterials(materials);
}

/** Série diária real: entrada / saída / ajuste (GET /relatorios/movimentacoes-por-dia). */
export async function fetchMovimentacoesPorDia(dias = 14) {
  if (getUseMock()) {
    await mockDelay();
    const n = Math.min(90, Math.max(7, Number(dias) || 14));
    const serie = Array.from({ length: n }, (_, i) => ({
      data_iso: `mock-${i}`,
      label: `D${i + 1}`,
      entrada: (i * 3 + 5) % 40,
      saida: (i * 2 + 8) % 35,
      ajuste: i % 5 === 0 ? 2 : 0
    }));
    return { dias: n, serie };
  }
  try {
    const { data } = await api.get("/relatorios/movimentacoes-por-dia", {
      params: { dias }
    });
    return {
      dias: data?.dias ?? (Array.isArray(data?.serie) ? data.serie.length : 0),
      serie: Array.isArray(data?.serie) ? data.serie : []
    };
  } catch (e) {
    throw toApiError(e, "Não foi possível carregar as movimentações do relatório.");
  }
}

/** Dispara e-mail de alerta de estoque mínimo (ADMIN/GERENTE). Requer SMTP no backend. */
export async function sendLowStockAlertEmail() {
  if (getUseMock()) {
    await mockDelay();
    return { message: "Mock: e-mail não enviado.", enviado: false, total_alertas: 0 };
  }
  try {
    const { data } = await api.post("/relatorios/estoque-baixo/enviar-email");
    return data;
  } catch (e) {
    throw toApiError(e, "Não foi possível enviar o e-mail de alerta.");
  }
}
