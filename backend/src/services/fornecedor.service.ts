/**
 * Serviço de fornecedores: CRUD.
 */
import { query } from "../lib/db";
import { isValidObjectId } from "../utils/objectId";

export type FornecedorExtras = {
  nome_contato?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  categoria?: string | null;
  tipo_fornecedor?: string | null;
  data_inicio?: string | null;
  condicoes_pagamento?: string | null;
  observacoes?: string | null;
  logo_data_url?: string | null;
};

const RETURNING = `RETURNING id, nome, cnpj, email, telefone, ativo,
  nome_contato, endereco, cidade, estado, categoria, tipo_fornecedor,
  data_inicio, condicoes_pagamento, observacoes, logo_data_url`;

export async function createFornecedor(
  data: {
    nome: string;
    cnpj: string;
    email?: string | null;
    telefone?: string | null;
    ativo?: boolean;
  } & FornecedorExtras,
) {
  const rows = await query(
    `INSERT INTO fornecedor (
      nome, cnpj, email, telefone, ativo,
      nome_contato, endereco, cidade, estado, categoria, tipo_fornecedor,
      data_inicio, condicoes_pagamento, observacoes, logo_data_url
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10, $11,
      $12, $13, $14, $15
    ) ${RETURNING}`,
    [
      data.nome,
      data.cnpj,
      data.email ?? null,
      data.telefone ?? null,
      data.ativo ?? true,
      data.nome_contato ?? null,
      data.endereco ?? null,
      data.cidade ?? null,
      data.estado ?? null,
      data.categoria ?? null,
      data.tipo_fornecedor ?? null,
      data.data_inicio ?? null,
      data.condicoes_pagamento ?? null,
      data.observacoes ?? null,
      data.logo_data_url ?? null,
    ],
  );
  return rows[0];
}

export async function listFornecedores() {
  return query(
    `SELECT id, nome, cnpj, email, telefone, ativo,
      nome_contato, endereco, cidade, estado, categoria, tipo_fornecedor,
      data_inicio, condicoes_pagamento, observacoes, logo_data_url
     FROM fornecedor ORDER BY nome`,
  );
}

export async function findFornecedor(id: string) {
  if (!isValidObjectId(id)) return null;
  const rows = await query(
    `SELECT id, nome, cnpj, email, telefone, ativo,
      nome_contato, endereco, cidade, estado, categoria, tipo_fornecedor,
      data_inicio, condicoes_pagamento, observacoes, logo_data_url
     FROM fornecedor WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function updateFornecedor(
  id: string,
  data: {
    nome?: string;
    email?: string | null;
    telefone?: string | null;
    ativo?: boolean;
  } & FornecedorExtras,
) {
  if (!isValidObjectId(id)) return null;
  const cur = await findFornecedor(id);
  if (!cur) return null;

  const rows = await query(
    `UPDATE fornecedor SET
      nome = $2,
      email = $3,
      telefone = $4,
      ativo = $5,
      nome_contato = $6,
      endereco = $7,
      cidade = $8,
      estado = $9,
      categoria = $10,
      tipo_fornecedor = $11,
      data_inicio = $12,
      condicoes_pagamento = $13,
      observacoes = $14,
      logo_data_url = $15
    WHERE id = $1
    ${RETURNING}`,
    [
      id,
      data.nome !== undefined ? data.nome : cur.nome,
      data.email !== undefined ? data.email : cur.email,
      data.telefone !== undefined ? data.telefone : cur.telefone,
      data.ativo !== undefined ? data.ativo : cur.ativo,
      data.nome_contato !== undefined ? data.nome_contato : cur.nome_contato,
      data.endereco !== undefined ? data.endereco : cur.endereco,
      data.cidade !== undefined ? data.cidade : cur.cidade,
      data.estado !== undefined ? data.estado : cur.estado,
      data.categoria !== undefined ? data.categoria : cur.categoria,
      data.tipo_fornecedor !== undefined ? data.tipo_fornecedor : cur.tipo_fornecedor,
      data.data_inicio !== undefined ? data.data_inicio : cur.data_inicio,
      data.condicoes_pagamento !== undefined
        ? data.condicoes_pagamento
        : cur.condicoes_pagamento,
      data.observacoes !== undefined ? data.observacoes : cur.observacoes,
      data.logo_data_url !== undefined ? data.logo_data_url : cur.logo_data_url,
    ],
  );
  return rows[0] ?? null;
}

export async function deleteFornecedor(id: string) {
  if (!isValidObjectId(id)) return null;
  const rows = await query(
    `DELETE FROM fornecedor WHERE id = $1
     RETURNING id, nome, cnpj, email, telefone, ativo,
      nome_contato, endereco, cidade, estado, categoria, tipo_fornecedor,
      data_inicio, condicoes_pagamento, observacoes, logo_data_url`,
    [id],
  );
  return rows[0] ?? null;
}
