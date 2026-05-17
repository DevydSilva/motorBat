/**
 * CRUD de **matéria-prima** + query `?categoria&busca&ativo` na listagem.
 * `fornecedor_id` opcional na criação/atualização liga fornecedor “principal” (serviço).
 */
import type { Request, Response } from "express";
import * as svc from "../services/materiaPrima.service";
import { isValidObjectId, paramId } from "../utils/objectId";

export async function create(req: Request, res: Response) {
  const {
    nome,
    categoria,
    unidade,
    estoque_minimo,
    ativo,
    fornecedor_id,
    observacao,
    preco_custo,
    preco_venda,
  } = req.body ?? {};
  if (!nome || !categoria || !unidade || estoque_minimo === undefined) {
    return res.status(400).json({ error: "Campos obrigatórios" });
  }
  const fid =
    fornecedor_id != null && String(fornecedor_id).trim() !== ""
      ? String(fornecedor_id).trim()
      : undefined;
  const row = await svc.createMateriaPrima({
    nome,
    categoria,
    unidade,
    estoque_minimo: Number(estoque_minimo),
    ativo,
    fornecedor_id: fid,
    observacao:
      observacao != null && String(observacao).trim() !== ""
        ? String(observacao).trim()
        : null,
    preco_custo:
      preco_custo !== undefined && preco_custo !== null && preco_custo !== ""
        ? Number(preco_custo)
        : null,
    preco_venda:
      preco_venda !== undefined && preco_venda !== null && preco_venda !== ""
        ? Number(preco_venda)
        : null,
  });
  if (!row) {
    return res.status(500).json({ error: "Falha ao criar matéria-prima" });
  }
  return res.status(201).json(row);
}

/** `ativo` na query aceita strings `"true"` / `"false"`. */
export async function list(req: Request, res: Response) {
  const { categoria, busca } = req.query;
  let ativo: boolean | undefined;
  if (req.query.ativo === "true") ativo = true;
  else if (req.query.ativo === "false") ativo = false;
  const rows = await svc.listMateriaPrima({
    categoria: typeof categoria === "string" ? categoria : undefined,
    busca: typeof busca === "string" ? busca : undefined,
    ativo,
  });
  return res.status(200).json(rows);
}

export async function getById(req: Request, res: Response) {
  const id = paramId(req.params.id);
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Id inválido" });
  }
  const row = await svc.findMateriaPrima(id);
  if (!row) {
    return res.status(404).json({ error: "Matéria-prima não encontrada" });
  }
  return res.status(200).json(row);
}

/** Atualização exige enviar novamente nome, categoria, unidade e estoque_minimo (contrato do controller). */
export async function update(req: Request, res: Response) {
  const id = paramId(req.params.id);
  const {
    nome,
    categoria,
    unidade,
    estoque_minimo,
    ativo,
    fornecedor_id,
    observacao,
    preco_custo,
    preco_venda,
  } = req.body ?? {};
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Id inválido" });
  }
  if (!nome || !categoria || !unidade || estoque_minimo === undefined) {
    return res.status(400).json({ error: "Campos obrigatórios" });
  }
  const payload: Parameters<typeof svc.updateMateriaPrima>[1] = {
    nome,
    categoria,
    unidade,
    estoque_minimo: Number(estoque_minimo),
    ativo,
  };
  if (fornecedor_id !== undefined) {
    payload.fornecedor_id =
      fornecedor_id === null || String(fornecedor_id).trim() === ""
        ? null
        : String(fornecedor_id).trim();
  }
  if (observacao !== undefined) {
    payload.observacao =
      observacao === null || String(observacao).trim() === ""
        ? null
        : String(observacao).trim();
  }
  if (preco_custo !== undefined) {
    payload.preco_custo =
      preco_custo === null || preco_custo === ""
        ? null
        : Number(preco_custo);
  }
  if (preco_venda !== undefined) {
    payload.preco_venda =
      preco_venda === null || preco_venda === ""
        ? null
        : Number(preco_venda);
  }
  const row = await svc.updateMateriaPrima(id, payload);
  if (!row) {
    return res.status(404).json({ error: "Matéria-prima não encontrada" });
  }
  return res.status(200).json(row);
}

export async function remove(req: Request, res: Response) {
  const id = paramId(req.params.id);
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Id inválido" });
  }
  const row = await svc.deleteMateriaPrima(id);
  if (!row) {
    return res.status(404).json({ error: "Matéria-prima não encontrada" });
  }
  return res.status(200).json(row);
}
