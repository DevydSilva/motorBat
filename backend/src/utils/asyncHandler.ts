/**
 * Wrapper para handlers **async** do Express.
 *
 * Em Express, exceções em funções `async` não são automaticamente passadas a `next(err)`;
 * sem este helper, o cliente pode ficar à espera até timeout. Aqui qualquer rejeição da
 * Promise do handler é encaminhada para `next`, onde o `errorHandler` devolve JSON de erro.
 *
 * Uso típico: `router.get("/recurso", asyncHandler(controller))`.
 */
import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Devolve um `RequestHandler` que executa `fn` e encadeia `.catch(next)` na Promise resultante.
 *
 * Aceita handlers que retornem `Promise` (com ou sem valor) ou que só chamem `res.*` e terminem;
 * o tipo `Promise<unknown>` cobre ambos os casos no TypeScript.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
}
