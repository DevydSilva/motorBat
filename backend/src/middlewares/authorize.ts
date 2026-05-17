/**
 * **Autorização por papel** (depois da autenticação).
 *
 * - Autenticação responde “quem é?” (`req.auth`).
 * - Autorização responde “pode executar esta ação?” comparando papéis com os permitidos na rota.
 *
 * Estratégias:
 * - **`requireRole`** — usa só `req.auth.roles` (copiadas do JWT na emissão do token).
 * - **`requireRoleFromDb`** — re-lê perfis em `UsuarioPerfil`/`Perfil` e faz união com o JWT,
 *   evitando **403** injusto se o administrador alterou perfis na base e o token ainda está antigo.
 *
 * Regra explícita: utilizador com **ADMIN** no conjunto de papéis efetivos passa sempre nas verificações
 * deste ficheiro (`hasAnyAllowedRole`).
 */
import type { RequestHandler } from "express";
import { Role } from "../types/domain";
import { getRolesForUsuario } from "../services/usuario.service";

/**
 * Verifica se `userRoles` contém **ADMIN** (liberta tudo) ou algum dos `allowed`.
 */
function hasAnyAllowedRole(userRoles: Role[], ...allowed: Role[]): boolean {
  if (userRoles.includes(Role.ADMIN)) return true;
  return allowed.some((r) => userRoles.includes(r));
}

/**
 * União de papéis da BD com os do JWT (sem duplicar), para uma única lista de decisão.
 */
function mergeJwtAndDbRoles(jwtRoles: Role[] | undefined, dbRoles: Role[]): Role[] {
  const out: Role[] = [...dbRoles];
  for (const r of jwtRoles ?? []) {
    if (!out.includes(r)) out.push(r);
  }
  return out;
}

/**
 * Garante que `req.auth` existe (utilizar **após** `authenticate` em rotas que só precisam de “alguém logado”).
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  next();
};

/**
 * Fábrica de middleware: exige pelo menos um dos papéis `allowed` em `req.auth.roles`
 * (com regra ADMIN acima). **401** se não autenticado; **403** se autenticado mas sem papel.
 */
export function requireRole(...allowed: Role[]): RequestHandler {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    if (!hasAnyAllowedRole(req.auth.roles, ...allowed)) {
      return res.status(403).json({
        error:
          "Sem permissão para esta ação. Verifique o perfil do usuário (ADMIN / GERENTE / FUNCIONARIO).",
      });
    }
    next();
  };
}

/**
 * Igual a `requireRole`, mas os papéis efetivos são `mergeJwtAndDbRoles(req.auth.roles, rolesDaBd)`.
 * Implementação assíncrona: envolve `getRolesForUsuario` e delega falhas inesperadas a `next(err)`.
 */
export function requireRoleFromDb(...allowed: Role[]): RequestHandler {
  return (req, res, next) => {
    void (async () => {
      if (!req.auth) {
        res.status(401).json({ error: "Não autenticado" });
        return;
      }
      try {
        const dbRoles = await getRolesForUsuario(req.auth.userId);
        const roles = mergeJwtAndDbRoles(req.auth.roles, dbRoles);
        if (!hasAnyAllowedRole(roles, ...allowed)) {
          res.status(403).json({
            error:
              "Sem permissão para esta ação. Verifique o perfil do usuário (ADMIN / GERENTE / FUNCIONARIO).",
          });
          return;
        }
        next();
      } catch (err) {
        next(err);
      }
    })();
  };
}
