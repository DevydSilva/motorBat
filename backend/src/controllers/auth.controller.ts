/**
 * Autenticação HTTP: **login** público (`POST /auth/login`).
 *
 * Validação mínima de body; regras de senha/ativo/perfis ficam em `auth.service`.
 * Erros com `.status` são tratados pelo `errorHandler`.
 */
import type { Request, Response } from "express";
import * as authService from "../services/auth.service";

/**
 * `POST /auth/login` — corpo `{ email, senha }`.
 * Resposta `{ token, user }` para o cliente guardar o JWT e enviar `Authorization: Bearer`.
 */
export async function login(req: Request, res: Response) {
  const { email, senha } = req.body ?? {};
  if (!email || !senha) {
    return res.status(400).json({ error: "Informe e-mail e senha" });
  }
  const result = await authService.login(String(email), String(senha));
  return res.status(200).json(result);
}
