/**
 * Middleware de erro **final** do Express: resposta JSON uniforme para falhas nas rotas e serviços.
 *
 * Deve ser registado **depois** de todas as rotas (ver `app.ts`). Recebe erros passados via
 * `next(err)` — em handlers `async`, usar `asyncHandler` para que `throw`/`reject` cheguem aqui.
 *
 * Mapeamento:
 * - Propriedade **`status`** numérica (400–599) no erro → mesmo HTTP status + `err.message` em `{ error }`.
 * - Códigos **`P2002` / `P2025` / `P2003`** (convenção estilo Prisma, útil se alguma camada ou migração
 *   ainda emitir estes códigos) → 409, 404, 400 respetivamente com mensagens fixas.
 * - Caso contrário → **500** genérico; detalhe completo só em `console.error` (não expor stack ao cliente).
 */
import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error("[error]", err);

  if (typeof err === "object" && err !== null && "status" in err) {
    const status = Number((err as { status: unknown }).status);
    const message =
      err instanceof Error ? err.message : "Erro na requisição";
    if (status >= 400 && status < 600) {
      return res.status(status).json({ error: message });
    }
  }

  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code)
      : "";

  if (code === "P2002") {
    return res
      .status(409)
      .json({ error: "Registro duplicado (violação de campo único)" });
  }
  if (code === "P2025") {
    return res.status(404).json({ error: "Registro não encontrado" });
  }
  if (code === "P2003") {
    return res.status(400).json({ error: "Referência inválida (FK)" });
  }

  const status =
    typeof err === "object" && err !== null && "status" in err
      ? Number((err as { status: unknown }).status)
      : 500;
  const message =
    typeof err === "object" && err !== null && "message" in err
      ? String((err as { message: unknown }).message)
      : "Erro interno do servidor";

  if (status >= 400 && status < 600) {
    return res.status(status).json({ error: message });
  }

  return res.status(500).json({ error: "Erro interno do servidor" });
};
