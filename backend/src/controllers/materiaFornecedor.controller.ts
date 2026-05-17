/**
 * Ligações **matéria-prima ↔ fornecedor** (N:N). Parâmetros de rota: `materiaid`, `fornecedorid`.
 */
import type { Request, Response } from "express";
import * as svc from "../services/materiaFornecedor.service";
import { isValidObjectId, paramId } from "../utils/objectId";

export async function create(req: Request, res: Response) {
  const { materia_prima_id, fornecedor_id } = req.body ?? {};
  const mp = materia_prima_id != null ? String(materia_prima_id).trim() : "";
  const fo = fornecedor_id != null ? String(fornecedor_id).trim() : "";
  if (!mp || !fo || !isValidObjectId(mp) || !isValidObjectId(fo)) {
    return res.status(400).json({ error: "Campos obrigatórios (ObjectIds válidos)" });
  }
  const row = await svc.createMateriaFornecedor({
    materia_prima_id: mp,
    fornecedor_id: fo,
  });
  return res.status(201).json(row);
}

export async function list(_req: Request, res: Response) {
  const rows = await svc.listMateriaFornecedor();
  return res.status(200).json(rows);
}

export async function getByPair(req: Request, res: Response) {
  const mp = paramId(req.params.materiaid);
  const fo = paramId(req.params.fornecedorid);
  if (!isValidObjectId(mp) || !isValidObjectId(fo)) {
    return res.status(400).json({ error: "IDs inválidos" });
  }
  const row = await svc.findMateriaFornecedor(mp, fo);
  if (!row) {
    return res.status(404).json({ error: "Relação não encontrada" });
  }
  return res.status(200).json(row);
}

export async function updatePair(req: Request, res: Response) {
  const mp = paramId(req.params.materiaid);
  const fo = paramId(req.params.fornecedorid);
  const { nova_materia_id, novo_fornecedor_id } = req.body ?? {};
  if (!isValidObjectId(mp) || !isValidObjectId(fo)) {
    return res.status(400).json({ error: "IDs inválidos" });
  }
  if (nova_materia_id == null && novo_fornecedor_id == null) {
    return res.status(400).json({ error: "Informe pelo menos um novo ID" });
  }
  const existente = await svc.findMateriaFornecedor(mp, fo);
  if (!existente) {
    return res.status(404).json({ error: "Relação não encontrada" });
  }
  const nm =
    nova_materia_id != null ? String(nova_materia_id).trim() : undefined;
  const nf =
    novo_fornecedor_id != null ? String(novo_fornecedor_id).trim() : undefined;
  if (nm !== undefined && nm !== "" && !isValidObjectId(nm)) {
    return res.status(400).json({ error: "nova_materia_id inválido" });
  }
  if (nf !== undefined && nf !== "" && !isValidObjectId(nf)) {
    return res.status(400).json({ error: "novo_fornecedor_id inválido" });
  }
  const row = await svc.updateMateriaFornecedor(mp, fo, {
    nova_materia_id: nm,
    novo_fornecedor_id: nf,
  });
  return res.status(200).json({
    relacao: row,
    message: "Relação atualizada com sucesso",
  });
}

export async function removePair(req: Request, res: Response) {
  const mp = paramId(req.params.materiaid);
  const fo = paramId(req.params.fornecedorid);
  if (!isValidObjectId(mp) || !isValidObjectId(fo)) {
    return res.status(400).json({ error: "IDs inválidos" });
  }
  const row = await svc.deleteMateriaFornecedor(mp, fo);
  if (!row) {
    return res.status(404).json({ error: "Relação não encontrada" });
  }
  return res.status(200).json({
    relacao: row,
    message: "Relação deletada com sucesso",
  });
}
