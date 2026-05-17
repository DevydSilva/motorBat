/**
 * CRUD de **perfis** (`Role` + descrição). Rotas restritas a ADMIN.
 * IDs de rota validados com `isValidObjectId`.
 */
import type { Request, Response } from "express";
import { Role } from "../types/domain";
import * as perfilService from "../services/perfil.service";
import { isValidObjectId, paramId } from "../utils/objectId";

export async function create(req: Request, res: Response) {
  const { role, descricao } = req.body ?? {};
  const rolesValidos = Object.values(Role) as string[];
  if (!role || !rolesValidos.includes(String(role))) {
    return res.status(400).json({
      error: "Campo role inválido (use ADMIN, GERENTE ou FUNCIONARIO)",
    });
  }
  const row = await perfilService.createPerfil({
    role: role as Role,
    descricao,
  });
  return res.status(201).json(row);
}

export async function list(_req: Request, res: Response) {
  const rows = await perfilService.listPerfis();
  return res.status(200).json(rows);
}

export async function getById(req: Request, res: Response) {
  const id = paramId(req.params.id);
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Id inválido" });
  }
  const row = await perfilService.findPerfil(id);
  if (!row) {
    return res.status(404).json({ error: "Perfil não encontrado" });
  }
  return res.status(200).json(row);
}

export async function update(req: Request, res: Response) {
  const id = paramId(req.params.id);
  const { role, descricao } = req.body ?? {};
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Id inválido" });
  }
  const row = await perfilService.updatePerfil(id, { role, descricao });
  if (!row) {
    return res.status(404).json({ error: "Perfil não encontrado" });
  }
  return res.status(200).json({
    perfil: row,
    message: "Perfil atualizado com sucesso",
  });
}

export async function remove(req: Request, res: Response) {
  const id = paramId(req.params.id);
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Id inválido" });
  }
  const row = await perfilService.deletePerfil(id);
  if (!row) {
    return res.status(404).json({ error: "Perfil não encontrado" });
  }
  return res.status(200).json({
    perfil: row,
    message: "Perfil deletado com sucesso",
  });
}
