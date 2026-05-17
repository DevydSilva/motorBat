/**
 * CRUD de exemplo (demo).
 */
import { query } from "../lib/db";
import { isValidObjectId } from "../utils/objectId";

export async function listTeste() {
  return query(
    `SELECT id, nome, email, senha FROM teste ORDER BY nome`,
  );
}

export async function findTeste(id: string) {
  if (!isValidObjectId(id)) return null;
  const rows = await query(`SELECT id, nome, email, senha FROM teste WHERE id = $1`, [
    id,
  ]);
  return rows[0] ?? null;
}

export async function createTeste(data: { nome: string; email: string; senha: string }) {
  const rows = await query(
    `INSERT INTO teste (nome, email, senha) VALUES ($1, $2, $3)
     RETURNING id, nome, email, senha`,
    [data.nome, data.email, data.senha],
  );
  return rows[0];
}

export async function updateTeste(
  id: string,
  data: { nome?: string; email?: string; senha?: string },
) {
  if (!isValidObjectId(id)) return null;
  const cur = await findTeste(id);
  if (!cur) return null;
  const rows = await query(
    `UPDATE teste SET nome = $2, email = $3, senha = $4
     WHERE id = $1
     RETURNING id, nome, email, senha`,
    [
      id,
      data.nome !== undefined ? data.nome : cur.nome,
      data.email !== undefined ? data.email : cur.email,
      data.senha !== undefined ? data.senha : cur.senha,
    ],
  );
  return rows[0] ?? null;
}

export async function deleteTeste(id: string) {
  if (!isValidObjectId(id)) return null;
  const rows = await query(`DELETE FROM teste WHERE id = $1 RETURNING id, nome, email, senha`, [
    id,
  ]);
  return rows[0] ?? null;
}
