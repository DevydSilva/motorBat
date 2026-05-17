/**
 * CRUD de **fornecedores** + campos comerciais extra mapeados em `extrasFromBody`.
 * Leituras para qualquer utilizador autenticado; escrita ADMIN/GERENTE (ver rotas).
 */
import type { Request, Response } from "express";
import * as svc from "../services/fornecedor.service";
import { isValidObjectId, paramId } from "../utils/objectId";

/** Normaliza string opcional: vazio ou só espaços → `null`. */
function trimOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

const MAX_LOGO_DATA_URL_CHARS = 500_000;

function validateLogoDataUrl(v: string | null): string | null {
  if (v == null) return null;
  if (v.length > MAX_LOGO_DATA_URL_CHARS) {
    return `Logomarca excede ${MAX_LOGO_DATA_URL_CHARS.toLocaleString("pt-BR")} caracteres. Use uma imagem menor.`;
  }
  return null;
}

/**
 * Extrai chaves extra do body. Em **create** todas as chaves conhecidas são aplicadas;
 * em **update** só chaves presentes no body (omitir chave não força limpeza aqui).
 */
function extrasFromBody(body: Record<string, unknown>, mode: "create" | "update") {
  const keys = [
    "nome_contato",
    "endereco",
    "cidade",
    "estado",
    "categoria",
    "tipo_fornecedor",
    "data_inicio",
    "condicoes_pagamento",
    "observacoes",
    "logo_data_url",
  ] as const;
  const out: Record<string, string | null> = {};
  for (const k of keys) {
    if (mode === "create" || Object.prototype.hasOwnProperty.call(body, k)) {
      out[k] = trimOrNull(body[k]);
    }
  }
  return out;
}

export async function create(req: Request, res: Response) {
  const { nome, cnpj, email, telefone, ativo } = req.body ?? {};
  if (!nome || !cnpj) {
    return res.status(400).json({ error: "Campos obrigatórios: nome, cnpj" });
  }
  const extras = extrasFromBody((req.body ?? {}) as Record<string, unknown>, "create");
  const row = await svc.createFornecedor({
    nome,
    cnpj,
    email,
    telefone,
    ativo: ativo === undefined ? undefined : Boolean(ativo),
    ...extras,
  });
  return res.status(201).json(row);
}

export async function list(_req: Request, res: Response) {
  const rows = await svc.listFornecedores();
  return res.status(200).json(rows);
}

export async function getById(req: Request, res: Response) {
  const id = paramId(req.params.id);
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Id inválido" });
  }
  const row = await svc.findFornecedor(id);
  if (!row) {
    return res.status(404).json({ error: "Fornecedor não encontrado" });
  }
  return res.status(200).json(row);
}

/** Atualização parcial: campos base só se enviados; extras via `extrasFromBody("update")`. */
export async function update(req: Request, res: Response) {
  const id = paramId(req.params.id);
  const { nome, email, telefone, ativo } = req.body ?? {};
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Id inválido" });
  }
  const extras = extrasFromBody((req.body ?? {}) as Record<string, unknown>, "update");
  if (Object.prototype.hasOwnProperty.call(extras, "logo_data_url")) {
    const logoErr = validateLogoDataUrl(extras.logo_data_url ?? null);
    if (logoErr) {
      return res.status(400).json({ error: logoErr });
    }
  }
  const data: Parameters<typeof svc.updateFornecedor>[1] = { ...extras };
  if (nome !== undefined) data.nome = nome;
  if (email !== undefined) data.email = email;
  if (telefone !== undefined) data.telefone = telefone;
  if (ativo !== undefined) data.ativo = Boolean(ativo);
  const row = await svc.updateFornecedor(id, data);
  if (!row) {
    return res.status(404).json({ error: "Fornecedor não encontrado" });
  }
  return res.status(200).json(row);
}

export async function remove(req: Request, res: Response) {
  const id = paramId(req.params.id);
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Id inválido" });
  }
  const row = await svc.deleteFornecedor(id);
  if (!row) {
    return res.status(404).json({ error: "Fornecedor não encontrado" });
  }
  return res.status(200).json({
    fornecedor: row,
    message: "Fornecedor removido com sucesso",
  });
}
