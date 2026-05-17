/**
 * Serviço de matéria-prima: CRUD e enriquecimento com fornecedor_id “principal”.
 */
import { query } from "../lib/db";
import {
  mapPrimeiroFornecedorPorMateria,
  setFornecedorPrimarioMateria,
} from "./materiaFornecedor.service";
import { isValidObjectId } from "../utils/objectId";

type MateriaRow = {
  id: string;
  nome: string;
  categoria: string;
  unidade: string;
  estoque_minimo: number;
  ativo: boolean;
  observacao: string | null;
  preco_custo: number | null;
  preco_venda: number | null;
};

function enrichWithFornecedor<T extends MateriaRow>(
  row: T,
  map: Map<string, string>,
): T & { fornecedor_id: string | null } {
  return {
    ...row,
    fornecedor_id: map.get(row.id) ?? null,
  };
}

export async function createMateriaPrima(data: {
  nome: string;
  categoria: string;
  unidade: string;
  estoque_minimo: number;
  ativo?: boolean;
  fornecedor_id?: string | null;
  observacao?: string | null;
  preco_custo?: number | null;
  preco_venda?: number | null;
}) {
  const rows = await query<MateriaRow>(
    `INSERT INTO materia_prima (
      nome, categoria, unidade, estoque_minimo, ativo, observacao, preco_custo, preco_venda
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, nome, categoria, unidade, estoque_minimo, ativo, observacao, preco_custo, preco_venda`,
    [
      data.nome,
      data.categoria,
      data.unidade,
      data.estoque_minimo,
      data.ativo ?? true,
      data.observacao ?? null,
      data.preco_custo ?? null,
      data.preco_venda ?? null,
    ],
  );
  const row = rows[0];
  if (!row) return null;

  const fid =
    data.fornecedor_id != null ? String(data.fornecedor_id).trim() : "";
  if (fid && isValidObjectId(fid)) {
    await setFornecedorPrimarioMateria(row.id, fid);
  }
  const map = await mapPrimeiroFornecedorPorMateria([row.id]);
  return enrichWithFornecedor(row, map);
}

export async function listMateriaPrima(filters?: {
  categoria?: string;
  busca?: string;
  ativo?: boolean;
}) {
  const conds: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (filters?.categoria?.trim()) {
    conds.push(`categoria = $${i++}`);
    params.push(filters.categoria.trim());
  }
  if (filters?.ativo !== undefined) {
    conds.push(`ativo = $${i++}`);
    params.push(filters.ativo);
  }
  if (filters?.busca?.trim()) {
    conds.push(`(nome ILIKE $${i} OR categoria ILIKE $${i})`);
    params.push(`%${filters.busca.trim()}%`);
    i++;
  }

  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const rows = await query<MateriaRow>(
    `SELECT id, nome, categoria, unidade, estoque_minimo, ativo, observacao, preco_custo, preco_venda
     FROM materia_prima ${where}
     ORDER BY nome`,
    params,
  );
  if (rows.length === 0) return rows;
  const map = await mapPrimeiroFornecedorPorMateria(rows.map((r) => r.id));
  return rows.map((r) => enrichWithFornecedor(r, map));
}

export async function findMateriaPrima(id: string) {
  if (!isValidObjectId(id)) return null;
  const rows = await query<MateriaRow>(
    `SELECT id, nome, categoria, unidade, estoque_minimo, ativo, observacao, preco_custo, preco_venda
     FROM materia_prima WHERE id = $1`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  const map = await mapPrimeiroFornecedorPorMateria([row.id]);
  return enrichWithFornecedor(row, map);
}

export async function updateMateriaPrima(
  id: string,
  data: {
    nome?: string;
    categoria?: string;
    unidade?: string;
    estoque_minimo?: number;
    ativo?: boolean;
    fornecedor_id?: string | null;
    observacao?: string | null;
    preco_custo?: number | null;
    preco_venda?: number | null;
  },
) {
  if (!isValidObjectId(id)) {
    return Promise.resolve(null);
  }
  const curRows = await query<MateriaRow>(
    `SELECT id, nome, categoria, unidade, estoque_minimo, ativo, observacao, preco_custo, preco_venda
     FROM materia_prima WHERE id = $1`,
    [id],
  );
  const cur = curRows[0];
  if (!cur) return null;

  const { fornecedor_id, ...fields } = data;

  const updatedRows = await query<MateriaRow>(
    `UPDATE materia_prima SET
       nome = $2,
       categoria = $3,
       unidade = $4,
       estoque_minimo = $5,
       ativo = $6,
       observacao = $7,
       preco_custo = $8,
       preco_venda = $9
     WHERE id = $1
     RETURNING id, nome, categoria, unidade, estoque_minimo, ativo, observacao, preco_custo, preco_venda`,
    [
      id,
      fields.nome !== undefined ? fields.nome : cur.nome,
      fields.categoria !== undefined ? fields.categoria : cur.categoria,
      fields.unidade !== undefined ? fields.unidade : cur.unidade,
      fields.estoque_minimo !== undefined ? fields.estoque_minimo : cur.estoque_minimo,
      fields.ativo !== undefined ? fields.ativo : cur.ativo,
      fields.observacao !== undefined ? fields.observacao : cur.observacao,
      fields.preco_custo !== undefined ? fields.preco_custo : cur.preco_custo,
      fields.preco_venda !== undefined ? fields.preco_venda : cur.preco_venda,
    ],
  );
  const row = updatedRows[0];
  if (!row) return null;

  if (fornecedor_id !== undefined) {
    await setFornecedorPrimarioMateria(id, fornecedor_id);
  }
  const map = await mapPrimeiroFornecedorPorMateria([row.id]);
  return enrichWithFornecedor(row, map);
}

export async function deleteMateriaPrima(id: string) {
  if (!isValidObjectId(id)) {
    return Promise.resolve(null);
  }
  await query(`DELETE FROM materia_fornecedor WHERE materia_prima_id = $1::uuid`, [id]);
  const rows = await query<MateriaRow>(
    `DELETE FROM materia_prima WHERE id = $1::uuid
     RETURNING id, nome, categoria, unidade, estoque_minimo, ativo, observacao, preco_custo, preco_venda`,
    [id],
  );
  return rows[0] ?? null;
}
