/**
 * Identidade do pedido HTTP via **JWT** emitido em `POST /auth/login` (`auth.service` + `signToken`).
 *
 * O Express não associa utilizador ao pedido sozinho: estes middlewares leem o token, validam com
 * `verifyToken` e preenchem `req.auth` (tipagem em `types/express.d.ts`).
 *
 * Exportações:
 * - **`authenticate`** — exige token válido; sem token ou token inválido → **401** JSON.
 * - **`optionalAuthenticate`** — se existir token válido, preenche `req.auth`; se não houver token,
 *   continua sem erro (rotas híbridas, ex.: `POST /movimentacao` com `usuario_id` no body).
 */
import type { RequestHandler } from "express";
import { verifyToken } from "../utils/token";

/**
 * Mensagem devolvida quando não se encontra JWT em nenhuma das fontes suportadas.
 * Indica `Authorization: Bearer`, body/query `token`, e lembra que o valor vem de `/auth/login`.
 */
const msgSemToken =
  "Falta o JWT. Envie Authorization: Bearer <token> ou o campo \"token\" no body/query. " +
  "No Postman: POST, Body → raw → JSON e header Content-Type: application/json; " +
  "ou Body → x-www-form-urlencoded com os campos (incluindo token). " +
  "O token vem de POST /auth/login — não use a senha no lugar do token.";

/**
 * Obtém o JWT bruto na seguinte ordem:
 * 1. Cabeçalho `Authorization: Bearer <jwt>` (recomendado).
 * 2. Query `?token=` (útil em testes rápidos).
 * 3. Campo `token` no body JSON (objeto não array).
 *
 * Devolve `null` se nada for encontrado ou strings vazias.
 */
function readJwtFromRequest(req: Parameters<RequestHandler>[0]): string | null {
  const header = req.headers.authorization;
  if (header) {
    const m = /^Bearer\s+(\S+)/i.exec(header.trim());
    if (m?.[1]) return m[1].trim();
  }
  const q = req.query.token;
  if (typeof q === "string" && q.trim()) return q.trim();

  const body = req.body;
  if (
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    typeof (body as { token?: unknown }).token === "string"
  ) {
    const t = (body as { token: string }).token.trim();
    if (t) return t;
  }
  return null;
}

/** Obriga JWT válido; preenche `req.auth` com `userId`, `email` e `roles` do payload. */
export const authenticate: RequestHandler = (req, res, next) => {
  const raw = readJwtFromRequest(req);
  if (!raw) {
    return res.status(401).json({ error: msgSemToken });
  }
  try {
    const payload = verifyToken(raw);
    req.auth = {
      userId: String(payload.sub),
      email: payload.email,
      roles: payload.roles,
    };
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
};

/**
 * Se houver token e for válido, comporta-se como `authenticate`.
 * Se **não** houver token, chama `next()` sem definir `req.auth` (não é erro).
 * Se houver token **inválido/expirado**, responde **401** (não se ignora o token malformado).
 */
export const optionalAuthenticate: RequestHandler = (req, res, next) => {
  const raw = readJwtFromRequest(req);
  if (!raw) {
    return next();
  }
  try {
    const payload = verifyToken(raw);
    req.auth = {
      userId: String(payload.sub),
      email: payload.email,
      roles: payload.roles,
    };
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
};
