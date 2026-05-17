/**
 * CRUD de **permissões por perfil e módulo** (flags ler/criar/atualizar/excluir). Rotas ADMIN.
 */
import type { Request, Response } from "express";
import * as svc from "../services/permissaoModulo.service";
import { isValidObjectId, paramId } from "../utils/objectId";

export async function create(req: Request, res: Response) {
  const {
    perfil_id,
    modulo_id,
    pode_ler,
    pode_criar,
    pode_atualizar,
    pode_excluir,
  } = req.body ?? {};
  const pid = perfil_id != null ? String(perfil_id).trim() : "";
  const mid = modulo_id != null ? String(modulo_id).trim() : "";
  if (!pid || !mid || !isValidObjectId(pid) || !isValidObjectId(mid)) {
    return res.status(400).json({
      error: "Campos perfil_id e modulo_id são obrigatórios (ObjectIds válidos)",
    });
  }
  const row = await svc.createPermissaoModulo({
    perfil_id: pid,
    modulo_id: mid,
    pode_ler,
    pode_criar,
    pode_atualizar,
    pode_excluir,
  });
  return res.status(201).json(row);
}

export async function list(_req: Request, res: Response) {
  const rows = await svc.listPermissaoModulo();
  return res.status(200).json(rows);
}

export async function getById(req: Request, res: Response) {
  const id = paramId(req.params.id);
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Id inválido" });
  }
  const row = await svc.findPermissaoModulo(id);
  if (!row) {
    return res.status(404).json({ error: "Permissão não encontrada" });
  }
  return res.status(200).json(row);
}

export async function update(req: Request, res: Response) {
  const id = paramId(req.params.id);
  const {
    perfil_id,
    modulo_id,
    pode_ler,
    pode_criar,
    pode_atualizar,
    pode_excluir,
  } = req.body ?? {};
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Id inválido" });
  }
  const pid =
    perfil_id != null ? String(perfil_id).trim() : undefined;
  const mid =
    modulo_id != null ? String(modulo_id).trim() : undefined;
  if (pid !== undefined && pid !== "" && !isValidObjectId(pid)) {
    return res.status(400).json({ error: "perfil_id inválido" });
  }
  if (mid !== undefined && mid !== "" && !isValidObjectId(mid)) {
    return res.status(400).json({ error: "modulo_id inválido" });
  }
  const row = await svc.updatePermissaoModulo(id, {
    perfil_id: pid || undefined,
    modulo_id: mid || undefined,
    pode_ler,
    pode_criar,
    pode_atualizar,
    pode_excluir,
  });
  if (!row) {
    return res.status(404).json({ error: "Permissão não encontrada" });
  }
  return res.status(200).json({
    permissao: row,
    message: "Permissão atualizada com sucesso",
  });
}

export async function remove(req: Request, res: Response) {
  const id = paramId(req.params.id);
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Id inválido" });
  }
  const row = await svc.deletePermissaoModulo(id);
  if (!row) {
    return res.status(404).json({ error: "Permissão não encontrada" });
  }
  return res.status(200).json({
    permissao: row,
    message: "Permissão deletada com sucesso",
  });
}
