/**
 * Leitura do estoque atual agregado com dados da matéria-prima.
 */
import { query } from "../lib/db";

export async function listEstoqueAtual() {
  const rows = await query<{
    id: string;
    materia_prima_id: string;
    quantidade: number;
    m_id: string | null;
    m_nome: string | null;
    m_categoria: string | null;
    m_unidade: string | null;
    m_estoque_minimo: number | null;
    m_ativo: boolean | null;
  }>(
    `SELECT e.id,
            e.materia_prima_id::text AS materia_prima_id,
            e.quantidade,
            mp.id::text AS m_id,
            mp.nome AS m_nome,
            mp.categoria AS m_categoria,
            mp.unidade AS m_unidade,
            mp.estoque_minimo AS m_estoque_minimo,
            mp.ativo AS m_ativo
     FROM estoque_atual e
     LEFT JOIN materia_prima mp ON mp.id = e.materia_prima_id
     ORDER BY e.id`,
  );

  return rows.map((r) => {
    if (!r.m_id) {
      return {
        id: r.id,
        materia_prima_id: r.materia_prima_id,
        quantidade: r.quantidade,
        materia: null,
      };
    }
    return {
      id: r.id,
      materia_prima_id: r.m_id,
      quantidade: r.quantidade,
      materia: {
        id: r.m_id,
        nome: r.m_nome ?? "—",
        categoria: r.m_categoria ?? "",
        unidade: r.m_unidade ?? "",
        estoque_minimo: r.m_estoque_minimo ?? 0,
        ativo: r.m_ativo ?? false,
      },
    };
  });
}
