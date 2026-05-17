/**
 * Autenticação: valida credenciais, perfis e emite JWT.
 */
import { query } from "../lib/db";
import type { Role } from "../types/domain";
import { verifyPassword } from "../utils/password";
import { signToken } from "../utils/token";

export async function login(email: string, senha: string) {
  const users = await query<{
    id: string;
    nome: string;
    email: string;
    senha: string;
    ativo: boolean;
  }>(
    `SELECT id, nome, email, senha, ativo FROM usuario WHERE email = $1 LIMIT 1`,
    [email],
  );
  const usuario = users[0];
  if (!usuario) {
    const err = new Error("E-mail ou senha inválidos");
    (err as Error & { status: number }).status = 401;
    throw err;
  }

  if (!usuario.ativo) {
    const err = new Error("Usuário inativo");
    (err as Error & { status: number }).status = 403;
    throw err;
  }

  const ok = await verifyPassword(senha, usuario.senha);
  if (!ok) {
    const err = new Error("E-mail ou senha inválidos");
    (err as Error & { status: number }).status = 401;
    throw err;
  }

  const roleRows = await query<{ role: string }>(
    `SELECT p.role::text AS role
     FROM usuario_perfil up
     INNER JOIN perfil p ON p.id = up.perfil_id
     WHERE up.usuario_id = $1`,
    [usuario.id],
  );

  const roles = roleRows.map((r) => r.role as Role);

  const token = signToken({
    sub: usuario.id,
    email: usuario.email,
    roles,
  });

  return {
    token,
    user: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      roles,
    },
  };
}
