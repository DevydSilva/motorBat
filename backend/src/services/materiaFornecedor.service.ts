/**
 * Liga matéria-prima a fornecedores (N:N).
 */
import { query } from "../lib/db";
import { isValidObjectId } from "../utils/objectId";

function rowMateriaJson(alias: string) {
  return `json_strip_nulls(json_build_object(
    'id', ${alias}.id::text,
    'nome', ${alias}.nome,
    'categoria', ${alias}.categoria,
    'unidade', ${alias}.unidade,
    'estoque_minimo', ${alias}.estoque_minimo,
    'ativo', ${alias}.ativo,
    'observacao', ${alias}.observacao,
    'preco_custo', ${alias}.preco_custo,
    'preco_venda', ${alias}.preco_venda
  ))`;
}

function rowFornecedorJson(alias: string) {
  return `json_strip_nulls(json_build_object(
    'id', ${alias}.id::text,
    'nome', ${alias}.nome,
    'cnpj', ${alias}.cnpj,
    'email', ${alias}.email,
    'telefone', ${alias}.telefone,
    'ativo', ${alias}.ativo,
    'nome_contato', ${alias}.nome_contato,
    'endereco', ${alias}.endereco,
    'cidade', ${alias}.cidade,
    'estado', ${alias}.estado,
    'categoria', ${alias}.categoria,
    'tipo_fornecedor', ${alias}.tipo_fornecedor,
    'data_inicio', ${alias}.data_inicio,
    'condicoes_pagamento', ${alias}.condicoes_pagamento,
    'observacoes', ${alias}.observacoes,
    'logo_data_url', ${alias}.logo_data_url
  ))`;
}

export async function createMateriaFornecedor(data: {
  materia_prima_id: string;
  fornecedor_id: string;
}) {
  const rows = await query(
    `INSERT INTO materia_fornecedor (materia_prima_id, fornecedor_id)
     VALUES ($1::uuid, $2::uuid)
     RETURNING id, materia_prima_id, fornecedor_id`,
    [data.materia_prima_id, data.fornecedor_id],
  );
  return rows[0];
}

export async function listMateriaFornecedor() {
  const sql = `
    SELECT mf.id,
           ${rowMateriaJson("mp")} AS materia_prima_id,
           ${rowFornecedorJson("f")} AS fornecedor_id
    FROM materia_fornecedor mf
    INNER JOIN materia_prima mp ON mp.id = mf.materia_prima_id
    INNER JOIN fornecedor f ON f.id = mf.fornecedor_id
    ORDER BY mf.id`;
  return query(sql);
}

export async function findMateriaFornecedor(
  materiaPrimaId: string,
  fornecedorId: string,
) {
  if (!isValidObjectId(materiaPrimaId) || !isValidObjectId(fornecedorId)) {
    return null;
  }
  const sql = `
    SELECT mf.id,
           ${rowMateriaJson("mp")} AS materia_prima_id,
           ${rowFornecedorJson("f")} AS fornecedor_id
    FROM materia_fornecedor mf
    INNER JOIN materia_prima mp ON mp.id = mf.materia_prima_id
    INNER JOIN fornecedor f ON f.id = mf.fornecedor_id
    WHERE mf.materia_prima_id = $1::uuid AND mf.fornecedor_id = $2::uuid
    LIMIT 1`;
  const rows = await query(sql, [materiaPrimaId, fornecedorId]);
  return rows[0] ?? null;
}

export async function updateMateriaFornecedor(
  materiaId: string,
  fornecedorId: string,
  body: { nova_materia_id?: string; novo_fornecedor_id?: string },
) {
  if (
    !isValidObjectId(materiaId) ||
    !isValidObjectId(fornecedorId)
  ) {
    throw new Error("Ids inválidos");
  }
  const materiaUpdate = body.nova_materia_id ?? materiaId;
  const fornecedorUpdate = body.novo_fornecedor_id ?? fornecedorId;
  if (
    !isValidObjectId(materiaUpdate) ||
    !isValidObjectId(fornecedorUpdate)
  ) {
    throw new Error("Ids inválidos");
  }

  await query(
    `DELETE FROM materia_fornecedor
     WHERE materia_prima_id = $1::uuid AND fornecedor_id = $2::uuid`,
    [materiaId, fornecedorId],
  );

  return createMateriaFornecedor({
    materia_prima_id: materiaUpdate,
    fornecedor_id: fornecedorUpdate,
  });
}

export async function deleteMateriaFornecedor(
  materiaPrimaId: string,
  fornecedorId: string,
) {
  if (
    !isValidObjectId(materiaPrimaId) ||
    !isValidObjectId(fornecedorId)
  ) {
    return null;
  }
  const rows = await query(
    `DELETE FROM materia_fornecedor
     WHERE materia_prima_id = $1::uuid AND fornecedor_id = $2::uuid
     RETURNING id, materia_prima_id, fornecedor_id`,
    [materiaPrimaId, fornecedorId],
  );
  return rows[0] ?? null;
}

export async function mapPrimeiroFornecedorPorMateria(
  materiaIds: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!materiaIds.length) return out;
  const rows = await query<{ materia_prima_id: string; fornecedor_id: string }>(
    `SELECT DISTINCT ON (materia_prima_id)
       materia_prima_id::text AS materia_prima_id,
       fornecedor_id::text AS fornecedor_id
     FROM materia_fornecedor
     WHERE materia_prima_id = ANY($1::uuid[])
     ORDER BY materia_prima_id, id ASC`,
    [materiaIds],
  );
  for (const l of rows) {
    out.set(l.materia_prima_id, l.fornecedor_id);
  }
  return out;
}

export async function setFornecedorPrimarioMateria(
  materiaPrimaId: string,
  fornecedorId: string | null | undefined,
) {
  if (!isValidObjectId(materiaPrimaId)) return;
  await query(`DELETE FROM materia_fornecedor WHERE materia_prima_id = $1::uuid`, [
    materiaPrimaId,
  ]);
  const fid =
    fornecedorId != null ? String(fornecedorId).trim() : "";
  if (!fid || !isValidObjectId(fid)) return;
  await createMateriaFornecedor({
    materia_prima_id: materiaPrimaId,
    fornecedor_id: fid,
  });
}
