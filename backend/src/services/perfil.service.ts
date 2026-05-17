/**
 * Perfis de acesso (enum Role): CRUD. Só pode existir um perfil GERENTE.
 */
import { query } from "../lib/db";
import { Role } from "../types/domain";
import { isValidObjectId } from "../utils/objectId";

export async function createPerfil(data: {
  role: Role;
  descricao?: string | null;
}) {
  if (data.role === Role.GERENTE) {
    const exists = await query(`SELECT id FROM perfil WHERE role = $1::batmotor_role LIMIT 1`, [
      Role.GERENTE,
    ]);
    if (exists.length) {
      const err = new Error("Já existe um perfil GERENTE no sistema");
      (err as Error & { status: number }).status = 400;
      throw err;
    }
  }

  const rows = await query(
    `INSERT INTO perfil (role, descricao) VALUES ($1::batmotor_role, $2)
     RETURNING id, role::text AS role, descricao`,
    [data.role, data.descricao ?? null],
  );
  return rows[0];
}

export async function listPerfis() {
  return query(`SELECT id, role::text AS role, descricao FROM perfil ORDER BY role`);
}

export async function findPerfil(id: string) {
  if (!isValidObjectId(id)) return null;
  const rows = await query(
    `SELECT id, role::text AS role, descricao FROM perfil WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function updatePerfil(
  id: string,
  data: { role?: Role; descricao?: string | null },
) {
  if (!isValidObjectId(id)) return null;

  const cur = await findPerfil(id);
  if (!cur) return null;
  const roleNext =
    data.role !== undefined ? data.role : (cur.role as Role);
  const descNext =
    data.descricao !== undefined ? data.descricao : cur.descricao;

  if (roleNext === Role.GERENTE) {
    const other = await query(
      `SELECT id FROM perfil WHERE role = $1::batmotor_role AND id <> $2::uuid LIMIT 1`,
      [Role.GERENTE, id],
    );
    if (other.length) {
      const err = new Error("Já existe um perfil GERENTE no sistema");
      (err as Error & { status: number }).status = 400;
      throw err;
    }
  }

  const rows = await query(
    `UPDATE perfil SET role = $2::batmotor_role, descricao = $3
     WHERE id = $1
     RETURNING id, role::text AS role, descricao`,
    [id, roleNext, descNext],
  );
  return rows[0] ?? null;
}

export async function deletePerfil(id: string) {
  if (!isValidObjectId(id)) return null;
  const rows = await query(`DELETE FROM perfil WHERE id = $1 RETURNING id, role::text AS role, descricao`, [
    id,
  ]);
  return rows[0] ?? null;
}
