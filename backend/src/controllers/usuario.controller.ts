/**
 * Gestão de **utilizadores**: CRUD (ADMIN), listagem (ADMIN/GERENTE com papéis na BD),
 * leitura por id com restrição para FUNCIONARIO, e
 * **`PATCH /users/me`** para o próprio utilizador alterar dados (regras por papel).
 *
 * IDs são ObjectIds em string (MongoDB).
 */
import type { Request, Response } from "express";
import { Role } from "../types/domain";
import * as usuarioService from "../services/usuario.service";
import { isValidObjectId, paramId } from "../utils/objectId";

/** E-mail do administrador seed — não pode ser apagado (regra de negócio). */
const EMAIL_ADMIN_PRINCIPAL = "admin@batmotor.com";

/**
 * `PATCH /users/me` — utilizador autenticado altera o próprio cadastro.
 * FUNCIONARIO só pode mudar `nome`; GERENTE/ADMIN podem alterar também e-mail e senha.
 */
export async function updateMe(req: Request, res: Response) {
  const auth = req.auth!;
  const id = auth.userId;
  const body = req.body ?? {};
  const nome =
    body.nome != null && String(body.nome).trim() !== ""
      ? String(body.nome).trim()
      : undefined;
  const email =
    body.email != null && String(body.email).trim() !== ""
      ? String(body.email).trim()
      : undefined;
  const senha =
    body.senha != null && String(body.senha) !== "" ? String(body.senha) : undefined;

  const roles = await usuarioService.getRolesForUsuario(id);
  const canChangeCredentials =
    roles.includes(Role.ADMIN) || roles.includes(Role.GERENTE);

  if (!canChangeCredentials) {
    if (email !== undefined || senha !== undefined) {
      return res.status(403).json({
        error:
          "Funcionários não podem alterar e-mail nem senha. Peça à gerência para atualizar o cadastro.",
      });
    }
    if (!nome) {
      return res.status(400).json({ error: "Informe o nome." });
    }
    const row = await usuarioService.updateUsuario(id, { nome });
    return res.status(200).json({
      usuario: row,
      message: "Usuário atualizado com sucesso",
    });
  }

  const payload: { nome?: string; email?: string; senha?: string } = {};
  if (nome) payload.nome = nome;
  if (email) payload.email = email;
  if (senha) payload.senha = senha;

  if (Object.keys(payload).length === 0) {
    return res.status(400).json({ error: "Nenhum campo para atualizar." });
  }

  const row = await usuarioService.updateUsuario(id, payload);
  return res.status(200).json({
    usuario: row,
    message: "Usuário atualizado com sucesso",
  });
}

export async function list(_req: Request, res: Response) {
  const rows = await usuarioService.listUsuarios();
  return res.status(200).json(rows);
}

/** FUNCIONARIO só pode ver o próprio id; ADMIN/GERENTE veem qualquer um. */
export async function getById(req: Request, res: Response) {
  const id = paramId(req.params.id);
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Id inválido" });
  }
  const auth = req.auth!;
  const canSeeAll =
    auth.roles.includes(Role.ADMIN) || auth.roles.includes(Role.GERENTE);
  if (!canSeeAll && auth.userId !== id) {
    return res.status(403).json({ error: "Sem permissão para ver este usuário" });
  }
  const row = await usuarioService.findUsuario(id);
  if (!row) {
    return res.status(404).json({ error: "Usuário não encontrado" });
  }
  return res.status(200).json(row);
}

/**
 * Cria utilizador com `perfil_role` opcional GERENTE ou FUNCIONARIO (nunca ADMIN por esta rota).
 */
export async function create(req: Request, res: Response) {
  const { nome, email, senha, cpf, ativo, perfil_role } = req.body ?? {};
  if (!nome || !email || !senha || !cpf) {
    return res
      .status(400)
      .json({ error: "Campos obrigatórios: nome, email, senha, cpf" });
  }

  let perfilRoleParsed: Role | undefined;
  if (perfil_role != null && String(perfil_role).trim() !== "") {
    const pr = String(perfil_role).trim().toUpperCase();
    if (pr === "ADMIN") {
      return res.status(400).json({
        error: "Não é permitido criar outro administrador por esta rota.",
      });
    }
    if (pr !== "GERENTE" && pr !== "FUNCIONARIO") {
      return res.status(400).json({
        error:
          "perfil_role deve ser GERENTE ou FUNCIONARIO (ou omita para criar sem perfil).",
      });
    }
    perfilRoleParsed = pr as Role;
  }

  const row = await usuarioService.createUsuario({
    nome,
    email,
    senha,
    cpf,
    ativo,
    perfil_role: perfilRoleParsed,
  });
  return res.status(201).json(row);
}

export async function update(req: Request, res: Response) {
  const id = paramId(req.params.id);
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Id inválido" });
  }
  const { nome, email, senha, cpf, ativo } = req.body ?? {};
  try {
    const row = await usuarioService.updateUsuario(id, {
      nome,
      email,
      senha,
      cpf,
      ativo,
    });
    return res.status(200).json({
      usuario: row,
      message: "Usuário atualizado com sucesso",
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 404) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    throw e;
  }
}

/** Bloqueia apagar o administrador principal identificado por `EMAIL_ADMIN_PRINCIPAL`. */
export async function remove(req: Request, res: Response) {
  const id = paramId(req.params.id);
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Id inválido" });
  }
  const existing = await usuarioService.findUsuario(id);
  if (existing?.email === EMAIL_ADMIN_PRINCIPAL) {
    return res.status(403).json({
      error: "Não é permitido excluir o administrador principal do sistema.",
    });
  }
  try {
    const row = await usuarioService.deleteUsuario(id);
    return res.status(200).json({
      usuario: row,
      message: "Usuário deletado com sucesso.",
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 404) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    throw e;
  }
}
