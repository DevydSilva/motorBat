/**
 * Associações **utilizador ↔ perfil** (tabela de junção). Rotas ADMIN.
 * `list` devolve forma simplificada `{ usuario, perfil }` a partir dos documentos populados.
 */
import type { Request, Response } from "express";
import * as svc from "../services/usuarioPerfil.service";
import { isValidObjectId, paramId } from "../utils/objectId";

export async function create(req: Request, res: Response) {
  const { usuario_id, perfil_id } = req.body ?? {};
  const uid = usuario_id != null ? String(usuario_id).trim() : "";
  const pid = perfil_id != null ? String(perfil_id).trim() : "";
  if (!uid || !pid || !isValidObjectId(uid) || !isValidObjectId(pid)) {
    return res.status(400).json({
      error: "Campos obrigatórios: usuario_id, perfil_id (ObjectIds válidos)",
    });
  }
  const row = await svc.createUsuarioPerfil({
    usuario_id: uid,
    perfil_id: pid,
  });
  return res.status(201).json(row);
}

export async function list(_req: Request, res: Response) {
  const rows = await svc.listUsuarioPerfis();
  const resultado = rows.map((up) => ({
    usuario: up.usuario_id,
    perfil: up.perfil_id,
  }));
  return res.status(200).json(resultado);
}

export async function getByPair(req: Request, res: Response) {
  const usuarioId = paramId(req.params.usuario_id);
  const perfilId = paramId(req.params.perfil_id);
  if (!isValidObjectId(usuarioId) || !isValidObjectId(perfilId)) {
    return res.status(400).json({ error: "IDs inválidos" });
  }
  const row = await svc.findUsuarioPerfil(usuarioId, perfilId);
  if (!row) {
    return res.status(404).json({ error: "Relacionamento não encontrado" });
  }
  return res.status(200).json(row);
}

/** Troca utilizador e/ou perfil do vínculo; exige pelo menos um campo novo no body. */
export async function updatePair(req: Request, res: Response) {
  const usuarioId = paramId(req.params.usuario_id);
  const perfilId = paramId(req.params.perfil_id);
  const { novo_usuario_id, novo_perfil_id } = req.body ?? {};
  if (!isValidObjectId(usuarioId) || !isValidObjectId(perfilId)) {
    return res.status(400).json({ error: "IDs inválidos" });
  }
  if (novo_usuario_id == null && novo_perfil_id == null) {
    return res.status(400).json({ error: "Informe pelo menos um novo ID" });
  }
  const existente = await svc.findUsuarioPerfil(usuarioId, perfilId);
  if (!existente) {
    return res.status(404).json({ error: "Relacionamento não encontrado" });
  }
  const nu =
    novo_usuario_id != null ? String(novo_usuario_id).trim() : undefined;
  const np =
    novo_perfil_id != null ? String(novo_perfil_id).trim() : undefined;
  if (nu !== undefined && nu !== "" && !isValidObjectId(nu)) {
    return res.status(400).json({ error: "novo_usuario_id inválido" });
  }
  if (np !== undefined && np !== "" && !isValidObjectId(np)) {
    return res.status(400).json({ error: "novo_perfil_id inválido" });
  }
  const row = await svc.updateUsuarioPerfil(usuarioId, perfilId, {
    novo_usuario_id: nu,
    novo_perfil_id: np,
  });
  return res.status(200).json({
    relacionamento: row,
    message: "Relacionamento atualizado com sucesso",
  });
}

export async function removePair(req: Request, res: Response) {
  const usuarioId = paramId(req.params.usuario_id);
  const perfilId = paramId(req.params.perfil_id);
  if (!isValidObjectId(usuarioId) || !isValidObjectId(perfilId)) {
    return res.status(400).json({ error: "IDs inválidos" });
  }
  const row = await svc.deleteUsuarioPerfil(usuarioId, perfilId);
  if (!row) {
    return res.status(404).json({ error: "Relacionamento não encontrado" });
  }
  return res.status(200).json({
    relacionamento: row,
    message: "Relacionamento deletado com sucesso",
  });
}
