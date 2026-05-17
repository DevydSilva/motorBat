/**
 * Relatórios agregados: movimentações por dia e itens abaixo do estoque mínimo.
 */
import { query } from "../lib/db";

function labelDiaPt(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

export async function movimentacoesPorDia(diasParam?: number) {
  const dias = Math.min(90, Math.max(7, Number(diasParam) || 14));
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(end.getDate() - (dias - 1));
  start.setHours(0, 0, 0, 0);

  const movs = await query<{ tipo: string; quantidade: number; data_atual: Date }>(
    `SELECT tipo::text AS tipo, quantidade, data_atual
     FROM movimentacao
     WHERE data_atual >= $1 AND data_atual <= $2`,
    [start, end],
  );

  const map = new Map<
    string,
    { entrada: number; saida: number; ajuste: number }
  >();

  for (let i = 0; i < dias; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { entrada: 0, saida: 0, ajuste: 0 });
  }

  for (const m of movs) {
    const key = new Date(m.data_atual).toISOString().slice(0, 10);
    const cell = map.get(key);
    if (!cell) continue;
    if (m.tipo === "ENTRADA") cell.entrada += m.quantidade;
    else if (m.tipo === "SAIDA") cell.saida += m.quantidade;
    else if (m.tipo === "AJUSTE") cell.ajuste += m.quantidade;
  }

  return Array.from(map.entries()).map(([data_iso, v]) => ({
    data_iso,
    label: labelDiaPt(data_iso),
    entrada: v.entrada,
    saida: v.saida,
    ajuste: v.ajuste,
  }));
}

export async function listEstoqueAbaixoMinimo() {
  const rows = await query<{
    materia_prima_id: string;
    nome: string;
    categoria: string;
    unidade: string;
    estoque_minimo: number;
    quantidade_atual: number;
  }>(
    `SELECT mp.id::text AS materia_prima_id,
            mp.nome,
            mp.categoria,
            mp.unidade,
            mp.estoque_minimo,
            COALESCE(e.quantidade, 0)::float8 AS quantidade_atual
     FROM materia_prima mp
     LEFT JOIN estoque_atual e ON e.materia_prima_id = mp.id
     WHERE mp.ativo = TRUE
     ORDER BY mp.nome`,
  );

  return rows
    .map((m) => ({
      materia_prima_id: m.materia_prima_id,
      nome: m.nome,
      categoria: m.categoria,
      unidade: m.unidade,
      estoque_minimo: m.estoque_minimo,
      quantidade_atual: m.quantidade_atual,
      deficit: m.estoque_minimo - m.quantidade_atual,
    }))
    .filter((row) => row.quantidade_atual < row.estoque_minimo);
}
