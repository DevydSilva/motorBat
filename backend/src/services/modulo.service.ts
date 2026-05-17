/**
 * Módulos da aplicação (menus/áreas).
 */
import { query } from "../lib/db";
import { isValidObjectId } from "../utils/objectId";

export async function createModulo(data: { nome: string; descricao?: string | null }) {
  const rows = await query(
    `INSERT INTO modulo (nome, descricao) VALUES ($1, $2)
     RETURNING id, nome, descricao`,
    [data.nome, data.descricao ?? null],
  );
  return rows[0];
}

export async function listModulos() {
  return query(`SELECT id, nome, descricao FROM modulo ORDER BY nome`);
}

export async function findModulo(id: string) {
  if (!isValidObjectId(id)) return null;
  const rows = await query(`SELECT id, nome, descricao FROM modulo WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function updateModulo(
  id: string,
  data: { nome?: string; descricao?: string | null },
) {
  if (!isValidObjectId(id)) return null;
  const cur = await findModulo(id);
  if (!cur) return null;
  const nome = data.nome !== undefined ? data.nome : cur.nome;
  const descricao = data.descricao !== undefined ? data.descricao : cur.descricao;
  const rows = await query(
    `UPDATE modulo SET nome = $2, descricao = $3 WHERE id = $1 RETURNING id, nome, descricao`,
    [id, nome, descricao],
  );
  return rows[0] ?? null;
}

export async function deleteModulo(id: string) {
  if (!isValidObjectId(id)) return null;
  const rows = await query(`DELETE FROM modulo WHERE id = $1 RETURNING id, nome, descricao`, [
    id,
  ]);
  return rows[0] ?? null;
}
