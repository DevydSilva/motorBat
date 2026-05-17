/**
 * **Movimentações** de estoque: criação com fluxo JWT opcional ou `usuario_id` (funcionário),
 * regras de “grande baixa” (env `LARGE_OUT_THRESHOLD`), e CRUD autenticado para listagem/edição.
 */
import type { Request, Response } from "express";
import { Role, TipoMovimentacao } from "../types/domain";
import * as svc from "../services/movimentacao.service";
import { isValidObjectId, paramId } from "../utils/objectId";

/** Limite de unidades em SAÍDA acima do qual só ADMIN/GERENTE podem registar (default 500). */
function parseLargeOutThreshold(): number {
  const n = Number(process.env.LARGE_OUT_THRESHOLD);
  if (Number.isFinite(n) && n > 0) return n;
  return 500;
}

function isTipoValido(t: unknown): t is TipoMovimentacao {
  return (
    t === TipoMovimentacao.ENTRADA ||
    t === TipoMovimentacao.SAIDA ||
    t === TipoMovimentacao.AJUSTE
  );
}

/**
 * `POST /movimentacao` — `optionalAuthenticate` nas rotas.
 * Com JWT: papéis ADMIN/GERENTE/FUNCIONARIO; saídas ≥ limite exigem GERENTE/ADMIN.
 * Sem JWT: obrigatório `usuario_id` de funcionário ativo (validado no serviço).
 * ADMIN pode enviar `usuario_id` para atribuir o operador a outro utilizador.
 */
export async function create(req: Request, res: Response) {
  const { materia_prima_id, tipo, quantidade, motivo, usuario_id } =
    req.body ?? {};
  if (
    materia_prima_id == null ||
    tipo == null ||
    quantidade === undefined ||
    quantidade === null
  ) {
    return res.status(400).json({
      error:
        "Campos obrigatórios: materia_prima_id, tipo (ENTRADA|SAIDA|AJUSTE), quantidade",
    });
  }
  if (!isTipoValido(tipo)) {
    return res
      .status(400)
      .json({ error: "tipo deve ser ENTRADA, SAIDA ou AJUSTE" });
  }

  const mpId = String(materia_prima_id).trim();
  if (!isValidObjectId(mpId)) {
    return res.status(400).json({ error: "materia_prima_id inválido (ObjectId)" });
  }

  const authHeader = req.auth;
  let authCtx: { userId: string; roles: Role[] };

  if (authHeader) {
    const podeMovimentar =
      authHeader.roles.includes(Role.ADMIN) ||
      authHeader.roles.includes(Role.GERENTE) ||
      authHeader.roles.includes(Role.FUNCIONARIO);
    if (!podeMovimentar) {
      return res.status(403).json({
        error:
          "Com login JWT, apenas ADMIN, GERENTE ou FUNCIONARIO podem registrar movimentação.",
      });
    }
    const qtdNum = Number(quantidade);
    if (
      tipo === TipoMovimentacao.SAIDA &&
      qtdNum >= parseLargeOutThreshold()
    ) {
      const podeGrandeBaixa =
        authHeader.roles.includes(Role.ADMIN) ||
        authHeader.roles.includes(Role.GERENTE);
      if (!podeGrandeBaixa) {
        return res.status(403).json({
          error: `Saídas de ${parseLargeOutThreshold()} unidades ou mais exigem perfil GERENTE ou ADMIN (Batmotor: controle de baixas críticas).`,
        });
      }
    }
    authCtx = { userId: authHeader.userId, roles: authHeader.roles };
  } else {
    if (usuario_id == null || usuario_id === "") {
      return res.status(400).json({
        error:
          "Sem JWT: informe usuario_id (ObjectId do funcionário). " +
          "Alternativa: POST /auth/login + Authorization: Bearer <token>.",
      });
    }
    const uid = String(usuario_id).trim();
    if (!isValidObjectId(uid)) {
      return res.status(400).json({ error: "usuario_id inválido (ObjectId)" });
    }
    const ok = await svc.usuarioEhFuncionarioAtivo(uid);
    if (!ok) {
      return res.status(403).json({
        error:
          "usuario_id deve ser de um usuário ativo com perfil FUNCIONARIO.",
      });
    }
    authCtx = { userId: uid, roles: [Role.FUNCIONARIO] };
  }

  let adminOverrideUsuario: string | undefined;
  if (
    authHeader?.roles.includes(Role.ADMIN) &&
    usuario_id != null &&
    String(usuario_id).trim() !== ""
  ) {
    const u = String(usuario_id).trim();
    if (isValidObjectId(u)) adminOverrideUsuario = u;
  }

  const row = await svc.createMovimentacao(
    {
      materia_prima_id: mpId,
      tipo,
      quantidade: Number(quantidade),
      motivo,
      usuario_id: adminOverrideUsuario,
    },
    authCtx,
  );
  return res.status(201).json(row);
}

export async function list(_req: Request, res: Response) {
  const rows = await svc.listMovimentacoes();
  return res.status(200).json(rows);
}

export async function getById(req: Request, res: Response) {
  const id = paramId(req.params.id);
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Id inválido" });
  }
  const row = await svc.findMovimentacao(id);
  if (!row) {
    return res.status(404).json({ error: "Movimentação não encontrada" });
  }
  return res.status(200).json(row);
}

export async function update(req: Request, res: Response) {
  const id = paramId(req.params.id);
  const { materia_prima_id, tipo, quantidade, motivo, usuario_id } =
    req.body ?? {};
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Id inválido" });
  }
  if (tipo != null && !isTipoValido(tipo)) {
    return res
      .status(400)
      .json({ error: "tipo deve ser ENTRADA, SAIDA ou AJUSTE" });
  }
  const mp =
    materia_prima_id != null ? String(materia_prima_id).trim() : undefined;
  if (mp !== undefined && mp !== "" && !isValidObjectId(mp)) {
    return res.status(400).json({ error: "materia_prima_id inválido" });
  }
  const uOp =
    usuario_id != null && String(usuario_id).trim() !== ""
      ? String(usuario_id).trim()
      : undefined;
  if (uOp !== undefined && !isValidObjectId(uOp)) {
    return res.status(400).json({ error: "usuario_id inválido" });
  }
  try {
    const row = await svc.updateMovimentacao(id, {
      materia_prima_id: mp,
      tipo,
      quantidade:
        quantidade !== undefined && quantidade !== null
          ? Number(quantidade)
          : undefined,
      motivo,
      usuario_id: uOp,
    });
    return res.status(200).json({
      movimentacao: row,
      message: "Movimentação atualizada",
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 404) {
      return res.status(404).json({ error: "Movimentação não encontrada" });
    }
    throw e;
  }
}

export async function remove(req: Request, res: Response) {
  const id = paramId(req.params.id);
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Id inválido" });
  }
  try {
    const row = await svc.deleteMovimentacao(id);
    return res.status(200).json({
      movimentacao: row,
      message: "Movimentação deletada",
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 404) {
      return res.status(404).json({ error: "Movimentação não encontrada" });
    }
    throw e;
  }
}
