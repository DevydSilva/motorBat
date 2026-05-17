/**
 * Permissões por perfil e módulo (CRUD + flags).
 */
import { query } from "../lib/db";
import { isValidObjectId } from "../utils/objectId";

function perfilJson(alias: string) {
  return `json_strip_nulls(json_build_object(
    'id', ${alias}.id::text,
    'role', ${alias}.role::text,
    'descricao', ${alias}.descricao
  ))`;
}

function moduloJson(alias: string) {
  return `json_strip_nulls(json_build_object(
    'id', ${alias}.id::text,
    'nome', ${alias}.nome,
    'descricao', ${alias}.descricao
  ))`;
}

export async function createPermissaoModulo(data: {
  perfil_id: string;
  modulo_id: string;
  pode_ler?: boolean;
  pode_criar?: boolean;
  pode_atualizar?: boolean;
  pode_excluir?: boolean;
}) {
  const rows = await query(
    `INSERT INTO permissao_modulo (
      perfil_id, modulo_id, pode_ler, pode_criar, pode_atualizar, pode_excluir
    ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)
    RETURNING id, perfil_id, modulo_id, pode_ler, pode_criar, pode_atualizar, pode_excluir`,
    [
      data.perfil_id,
      data.modulo_id,
      data.pode_ler ?? false,
      data.pode_criar ?? false,
      data.pode_atualizar ?? false,
      data.pode_excluir ?? false,
    ],
  );
  return rows[0];
}

export async function listPermissaoModulo() {
  const sql = `
    SELECT pm.id,
           ${perfilJson("p")} AS perfil_id,
           ${moduloJson("m")} AS modulo_id,
           pm.pode_ler,
           pm.pode_criar,
           pm.pode_atualizar,
           pm.pode_excluir
    FROM permissao_modulo pm
    INNER JOIN perfil p ON p.id = pm.perfil_id
    INNER JOIN modulo m ON m.id = pm.modulo_id
    ORDER BY pm.id`;
  return query(sql);
}

export async function findPermissaoModulo(id: string) {
  if (!isValidObjectId(id)) return null;
  const sql = `
    SELECT pm.id,
           ${perfilJson("p")} AS perfil_id,
           ${moduloJson("mo")} AS modulo_id,
           pm.pode_ler,
           pm.pode_criar,
           pm.pode_atualizar,
           pm.pode_excluir
    FROM permissao_modulo pm
    INNER JOIN perfil p ON p.id = pm.perfil_id
    INNER JOIN modulo mo ON mo.id = pm.modulo_id
    WHERE pm.id = $1::uuid`;
  const rows = await query(sql, [id]);
  return rows[0] ?? null;
}

export async function updatePermissaoModulo(
  id: string,
  data: {
    perfil_id?: string;
    modulo_id?: string;
    pode_ler?: boolean;
    pode_criar?: boolean;
    pode_atualizar?: boolean;
    pode_excluir?: boolean;
  },
) {
  if (!isValidObjectId(id)) return Promise.resolve(null);

  const curRows = await query<{
    perfil_id: string;
    modulo_id: string;
    pode_ler: boolean;
    pode_criar: boolean;
    pode_atualizar: boolean;
    pode_excluir: boolean;
  }>(
    `SELECT perfil_id::text AS perfil_id,
            modulo_id::text AS modulo_id,
            pode_ler, pode_criar, pode_atualizar, pode_excluir
     FROM permissao_modulo WHERE id = $1::uuid`,
    [id],
  );
  const cur = curRows[0];
  if (!cur) return null;

  if (data.perfil_id !== undefined && !isValidObjectId(data.perfil_id)) return null;
  if (data.modulo_id !== undefined && !isValidObjectId(data.modulo_id)) return null;

  const perfil_id =
    data.perfil_id !== undefined ? data.perfil_id : cur.perfil_id;
  const modulo_id =
    data.modulo_id !== undefined ? data.modulo_id : cur.modulo_id;

  await query(
    `UPDATE permissao_modulo SET
       perfil_id = $2::uuid,
       modulo_id = $3::uuid,
       pode_ler = $4,
       pode_criar = $5,
       pode_atualizar = $6,
       pode_excluir = $7
     WHERE id = $1::uuid`,
    [
      id,
      perfil_id,
      modulo_id,
      data.pode_ler !== undefined ? data.pode_ler : cur.pode_ler,
      data.pode_criar !== undefined ? data.pode_criar : cur.pode_criar,
      data.pode_atualizar !== undefined ? data.pode_atualizar : cur.pode_atualizar,
      data.pode_excluir !== undefined ? data.pode_excluir : cur.pode_excluir,
    ],
  );

  return findPermissaoModulo(id);
}

export async function deletePermissaoModulo(id: string) {
  if (!isValidObjectId(id)) return Promise.resolve(null);
  const rows = await query(
    `DELETE FROM permissao_modulo WHERE id = $1::uuid
     RETURNING id, perfil_id, modulo_id, pode_ler, pode_criar, pode_atualizar, pode_excluir`,
    [id],
  );
  return rows[0] ?? null;
}
