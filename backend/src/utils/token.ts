/**
 * JWT (JSON Web Token): assinatura na autenticação e verificação nas rotas protegidas.
 *
 * Usa `env.jwtSecret` e `env.jwtExpiresIn` de `config/env`. O payload transporta identidade
 * e perfis para o middleware popular `req.auth` sem nova ida à base em cada pedido.
 */
import jwt from "jsonwebtoken";
import type { Role } from "../types/domain";
import { env } from "../config/env";

/**
 * Conteúdo mínimo esperado no token após decode.
 * `sub` corresponde ao `_id` do utilizador em MongoDB (string hex).
 */
export type JwtPayload = {
  sub: string;
  email: string;
  roles: Role[];
};

/**
 * Assina um token HS256 com expiração configurável (`JWT_EXPIRES_IN`, ex.: `"7d"`, `"24h"`).
 * Chamado após login bem-sucedido em `auth.service`.
 */
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as jwt.SignOptions);
}

/**
 * Verifica assinatura e expiração; devolve payload tipado ou lança `Error("Token inválido")`.
 *
 * Valida que `decoded` é objeto com `sub`, `email` e `roles`; `sub` aceita string ou número
 * finito (normalizado para string). Erros nativos do `jwt.verify` (expirado, assinatura errada)
 * propagam-se para o chamador (middleware costuma mapear para 401).
 */
export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("sub" in decoded) ||
    !("email" in decoded) ||
    !("roles" in decoded)
  ) {
    throw new Error("Token inválido");
  }
  const { sub, email, roles } = decoded as Record<string, unknown>;
  let subStr: string;
  if (typeof sub === "string" && sub.length > 0) subStr = sub;
  else if (typeof sub === "number" && Number.isFinite(sub)) subStr = String(sub);
  else throw new Error("Token inválido");
  if (typeof email !== "string" || !Array.isArray(roles)) {
    throw new Error("Token inválido");
  }
  return { sub: subStr, email, roles: roles as Role[] };
}
