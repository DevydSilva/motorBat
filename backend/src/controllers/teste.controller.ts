/**
 * CRUD de exemplo sobre o modelo `Teste` (desenvolvimento/demos).
 * Rotas protegidas por ADMIN em `routes/index.ts`.
 */
import type { Request, Response } from "express";
import * as svc from "../services/teste.service";
import { isValidObjectId, paramId } from "../utils/objectId";

export async function list(_req: Request, res: Response) {
  return res.status(200).json(await svc.listTeste());
}

export async function getById(req: Request, res: Response) {
  const id = paramId(req.params.id);
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Id inválido" });
  }
  const row = await svc.findTeste(id);
  if (!row) {
    return res.status(404).json({ error: "Registro não encontrado" });
  }
  return res.status(200).json(row);
}

export async function create(req: Request, res: Response) {
  const { nome, email, senha } = req.body ?? {};
  if (!nome || !email || !senha) {
    return res.status(400).json({ error: "Campos obrigatórios" });
  }
  const row = await svc.createTeste({ nome, email, senha });
  return res.status(201).json(row);
}

export async function update(req: Request, res: Response) {
  const id = paramId(req.params.id);
  const { nome, email, senha } = req.body ?? {};
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Id inválido" });
  }
  const row = await svc.updateTeste(id, { nome, email, senha });
  if (!row) {
    return res.status(404).json({ error: "Registro não encontrado" });
  }
  return res.status(200).json(row);
}

/** Resposta **204** sem corpo em caso de sucesso. */
export async function remove(req: Request, res: Response) {
  const id = paramId(req.params.id);
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Id inválido" });
  }
  const row = await svc.deleteTeste(id);
  if (!row) {
    return res.status(404).json({ error: "Registro não encontrado" });
  }
  return res.status(204).send();
}
