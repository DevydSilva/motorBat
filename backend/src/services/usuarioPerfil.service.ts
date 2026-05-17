/**
 * Associação utilizador ↔ perfil (`usuario_perfil`).
 */
import { query } from "../lib/db";
import { isValidObjectId } from "../utils/objectId";

function usuarioJson(alias: string) {
  return `json_strip_nulls(json_build_object(
    'id', ${alias}.id::text,
    'nome', ${alias}.nome,
    'email', ${alias}.email
  ))`;
}

function perfilJson(alias: string) {
  return `json_strip_nulls(json_build_object(
    'id', ${alias}.id::text,
    'role', ${alias}.role::text,
    'descricao', ${alias}.descricao
  ))`;
}

export async function createUsuarioPerfil(data: {
  usuario_id: string;
  perfil_id: string;
}) {
  await query(
    `INSERT INTO usuario_perfil (usuario_id, perfil_id)
     VALUES ($1::uuid, $2::uuid)
     ON CONFLICT (usuario_id, perfil_id) DO NOTHING`,
    [data.usuario_id, data.perfil_id],
  );
  const rows = await query(
    `SELECT usuario_id::text AS usuario_id, perfil_id::text AS perfil_id
     FROM usuario_perfil WHERE usuario_id = $1::uuid AND perfil_id = $2::uuid`,
    [data.usuario_id, data.perfil_id],
  );
  return rows[0];
}

export async function listUsuarioPerfis() {
  const sql = `
    SELECT ${usuarioJson("u")} AS usuario_id,
           ${perfilJson("p")} AS perfil_id
    FROM usuario_perfil up
    INNER JOIN usuario u ON u.id = up.usuario_id
    INNER JOIN perfil p ON p.id = up.perfil_id
    ORDER BY u.nome, p.role`;
  return query(sql);
}

export async function findUsuarioPerfil(usuarioId: string, perfilId: string) {
  if (
    !isValidObjectId(usuarioId) ||
    !isValidObjectId(perfilId)
  ) {
    return null;
  }
  const sql = `
    SELECT ${usuarioJson("u")} AS usuario_id,
           ${perfilJson("p")} AS perfil_id
    FROM usuario_perfil up
    INNER JOIN usuario u ON u.id = up.usuario_id
    INNER JOIN perfil p ON p.id = up.perfil_id
    WHERE up.usuario_id = $1::uuid AND up.perfil_id = $2::uuid`;
  const rows = await query(sql, [usuarioId, perfilId]);
  return rows[0] ?? null;
}

export async function updateUsuarioPerfil(
  usuarioId: string,
  perfilId: string,
  body: { novo_usuario_id?: string; novo_perfil_id?: string },
) {
  if (
    !isValidObjectId(usuarioId) ||
    !isValidObjectId(perfilId)
  ) {
    throw new Error("Ids inválidos");
  }
  const usuarioUpdate = body.novo_usuario_id ?? usuarioId;
  const perfilUpdate = body.novo_perfil_id ?? perfilId;
  if (
    !isValidObjectId(usuarioUpdate) ||
    !isValidObjectId(perfilUpdate)
  ) {
    throw new Error("Ids inválidos");
  }

  await query(
    `DELETE FROM usuario_perfil
     WHERE usuario_id = $1::uuid AND perfil_id = $2::uuid`,
    [usuarioId, perfilId],
  );

  await query(
    `INSERT INTO usuario_perfil (usuario_id, perfil_id)
     VALUES ($1::uuid, $2::uuid)
     ON CONFLICT (usuario_id, perfil_id) DO NOTHING`,
    [usuarioUpdate, perfilUpdate],
  );

  return findUsuarioPerfil(usuarioUpdate, perfilUpdate);
}

export async function deleteUsuarioPerfil(usuarioId: string, perfilId: string) {
  if (
    !isValidObjectId(usuarioId) ||
    !isValidObjectId(perfilId)
  ) {
    return Promise.resolve(null);
  }
  const rows = await query(
    `DELETE FROM usuario_perfil
     WHERE usuario_id = $1::uuid AND perfil_id = $2::uuid
     RETURNING usuario_id::text AS usuario_id, perfil_id::text AS perfil_id`,
    [usuarioId, perfilId],
  );
  return rows[0] ?? null;
}
