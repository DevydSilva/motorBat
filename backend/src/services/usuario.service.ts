/**
 * Utilizadores: CRUD, unicidade e-mail/CPF, atribuição de perfil na criação (não-ADMIN).
 */
import { query } from "../lib/db";
import { Role } from "../types/domain";
import { hashPassword } from "../utils/password";
import { isValidObjectId } from "../utils/objectId";

export type UsuarioComPerfisJson = {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  ativo: boolean;
  data_atual: Date;
  usuarioPerfis: {
    perfil_id: string;
    perfil: { id: string; role: Role };
  }[];
};

async function shapeUsuarioComPerfis(u: {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  ativo: boolean;
  data_atual: Date;
}): Promise<UsuarioComPerfisJson> {
  const ups = await query<{ perfil_id: string; role: string }>(
    `SELECT p.id AS perfil_id, p.role::text AS role
     FROM usuario_perfil up
     INNER JOIN perfil p ON p.id = up.perfil_id
     WHERE up.usuario_id = $1`,
    [u.id],
  );
  const usuarioPerfis = ups.map((up) => ({
    perfil_id: up.perfil_id,
    perfil: { id: up.perfil_id, role: up.role as Role },
  }));

  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    cpf: u.cpf,
    ativo: u.ativo,
    data_atual: u.data_atual,
    usuarioPerfis,
  };
}

export async function getRolesForUsuario(userId: string): Promise<Role[]> {
  if (!isValidObjectId(userId)) return [];
  const ups = await query<{ role: string }>(
    `SELECT p.role::text AS role
     FROM usuario_perfil up
     INNER JOIN perfil p ON p.id = up.perfil_id
     WHERE up.usuario_id = $1`,
    [userId],
  );
  return ups.map((r) => r.role as Role);
}

function conflictError(message: string) {
  const err = new Error(message) as Error & { status: number };
  err.status = 409;
  return err;
}

async function ensureUsuarioUniqueFields(data: {
  email?: string;
  cpf?: string;
  excludeId?: string;
}) {
  const { email, cpf, excludeId } = data;

  if (email !== undefined && email !== "") {
    const rows = await query<{ id: string; ativo: boolean }>(
      `SELECT id, ativo FROM usuario WHERE email = $1
       AND ($2::uuid IS NULL OR id <> $2::uuid) LIMIT 1`,
      [email, excludeId && isValidObjectId(excludeId) ? excludeId : null],
    );
    const byEmail = rows[0];
    if (byEmail) {
      throw conflictError(
        `E-mail já utilizado por outro usuário (id ${byEmail.id}${byEmail.ativo ? "" : ", inativo"})`,
      );
    }
  }

  if (cpf !== undefined && cpf !== "") {
    const rows = await query<{ id: string; ativo: boolean }>(
      `SELECT id, ativo FROM usuario WHERE cpf = $1
       AND ($2::uuid IS NULL OR id <> $2::uuid) LIMIT 1`,
      [cpf, excludeId && isValidObjectId(excludeId) ? excludeId : null],
    );
    const byCpf = rows[0];
    if (byCpf) {
      throw conflictError(
        `CPF já utilizado por outro usuário (id ${byCpf.id}${byCpf.ativo ? "" : ", inativo"})`,
      );
    }
  }
}

export async function listUsuarios(): Promise<UsuarioComPerfisJson[]> {
  const rows = await query<{
    id: string;
    nome: string;
    email: string;
    cpf: string;
    ativo: boolean;
    data_atual: Date;
  }>(`SELECT id, nome, email, cpf, ativo, data_atual FROM usuario ORDER BY nome`);
  const out: UsuarioComPerfisJson[] = [];
  for (const u of rows) {
    out.push(await shapeUsuarioComPerfis(u));
  }
  return out;
}

export async function findUsuario(id: string): Promise<UsuarioComPerfisJson | null> {
  if (!isValidObjectId(id)) return null;
  const rows = await query<{
    id: string;
    nome: string;
    email: string;
    cpf: string;
    ativo: boolean;
    data_atual: Date;
  }>(`SELECT id, nome, email, cpf, ativo, data_atual FROM usuario WHERE id = $1`, [id]);
  const u = rows[0];
  if (!u) return null;
  return shapeUsuarioComPerfis(u);
}

export async function createUsuario(data: {
  nome: string;
  email: string;
  senha: string;
  cpf: string;
  ativo?: boolean;
  perfil_role?: Role;
}): Promise<UsuarioComPerfisJson> {
  await ensureUsuarioUniqueFields({ email: data.email, cpf: data.cpf });
  const senhaHash = await hashPassword(data.senha);

  if (data.perfil_role === Role.ADMIN) {
    const err = new Error(
      "Não é permitido criar outro administrador por esta rota.",
    ) as Error & { status: number };
    err.status = 400;
    throw err;
  }

  const inserted = await query<{ id: string }>(
    `INSERT INTO usuario (nome, email, senha, cpf, ativo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [data.nome, data.email, senhaHash, data.cpf, data.ativo ?? true],
  );
  const createdId = inserted[0]?.id;
  if (!createdId) throw new Error("Falha ao criar usuário");

  if (data.perfil_role) {
    if (
      data.perfil_role !== Role.GERENTE &&
      data.perfil_role !== Role.FUNCIONARIO
    ) {
      const err = new Error("perfil_role deve ser GERENTE ou FUNCIONARIO") as Error & {
        status: number;
      };
      err.status = 400;
      throw err;
    }
    const perfilRows = await query<{ id: string }>(
      `SELECT id FROM perfil WHERE role = $1::batmotor_role LIMIT 1`,
      [data.perfil_role],
    );
    const perfil = perfilRows[0];
    if (!perfil) {
      const err = new Error(
        `Perfil ${data.perfil_role} não encontrado. Execute npm run db:seed.`,
      ) as Error & { status: number };
      err.status = 400;
      throw err;
    }
    await query(
      `INSERT INTO usuario_perfil (usuario_id, perfil_id) VALUES ($1::uuid, $2::uuid)
       ON CONFLICT (usuario_id, perfil_id) DO NOTHING`,
      [createdId, perfil.id],
    );
  }

  const u = await findUsuario(createdId);
  if (!u) throw new Error("Falha ao recarregar usuário");
  return u;
}

export async function updateUsuario(
  id: string,
  data: {
    nome?: string;
    email?: string;
    senha?: string;
    cpf?: string;
    ativo?: boolean;
  },
) {
  if (!isValidObjectId(id)) {
    const err = new Error("Id inválido") as Error & { status: number };
    err.status = 400;
    throw err;
  }
  await ensureUsuarioUniqueFields({
    email: data.email,
    cpf: data.cpf,
    excludeId: id,
  });

  const curRows = await query<{
    id: string;
    nome: string;
    email: string;
    cpf: string;
    ativo: boolean;
  }>(`SELECT id, nome, email, cpf, ativo FROM usuario WHERE id = $1`, [id]);
  const cur = curRows[0];
  if (!cur) {
    const err = new Error("Usuário não encontrado") as Error & { status: number };
    err.status = 404;
    throw err;
  }

  const nome = data.nome !== undefined ? data.nome : cur.nome;
  const email = data.email !== undefined ? data.email : cur.email;
  const cpf = data.cpf !== undefined ? data.cpf : cur.cpf;
  const ativo = data.ativo !== undefined ? data.ativo : cur.ativo;
  const senha =
    data.senha !== undefined ? await hashPassword(data.senha) : undefined;

  const updatedRows = await query<{
    id: string;
    nome: string;
    email: string;
    cpf: string;
    ativo: boolean;
    data_atual: Date;
  }>(
    senha
      ? `UPDATE usuario SET nome = $2, email = $3, cpf = $4, ativo = $5, senha = $6, data_atual = NOW()
         WHERE id = $1
         RETURNING id, nome, email, cpf, ativo, data_atual`
      : `UPDATE usuario SET nome = $2, email = $3, cpf = $4, ativo = $5, data_atual = NOW()
         WHERE id = $1
         RETURNING id, nome, email, cpf, ativo, data_atual`,
    senha
      ? [id, nome, email, cpf, ativo, senha]
      : [id, nome, email, cpf, ativo],
  );

  const updated = updatedRows[0];
  if (!updated) {
    const err = new Error("Usuário não encontrado") as Error & { status: number };
    err.status = 404;
    throw err;
  }
  return {
    id: updated.id,
    nome: updated.nome,
    email: updated.email,
    cpf: updated.cpf,
    ativo: updated.ativo,
    data_atual: updated.data_atual,
  };
}

export async function deleteUsuario(id: string) {
  if (!isValidObjectId(id)) {
    const err = new Error("Id inválido") as Error & { status: number };
    err.status = 400;
    throw err;
  }
  await query(`DELETE FROM movimentacao WHERE usuario_id = $1`, [id]);
  await query(`DELETE FROM usuario_perfil WHERE usuario_id = $1`, [id]);
  const rows = await query(`DELETE FROM usuario WHERE id = $1 RETURNING id`, [id]);
  if (!rows.length) {
    const err = new Error("Usuário não encontrado") as Error & { status: number };
    err.status = 404;
    throw err;
  }
  return rows[0];
}
