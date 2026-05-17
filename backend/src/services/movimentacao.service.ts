/**
 * Movimentações de estoque (entrada/saída/ajuste) e atualização de `estoque_atual`.
 */
import { query } from "../lib/db";
import { Role, TipoMovimentacao } from "../types/domain";
import { isValidObjectId } from "../utils/objectId";

export type MovimentacaoCreateInput = {
  materia_prima_id: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  motivo?: string | null;
  usuario_id?: string;
};

function materiaJson(alias: string) {
  return `json_strip_nulls(json_build_object(
    'id', ${alias}.id::text,
    'nome', ${alias}.nome,
    'categoria', ${alias}.categoria,
    'unidade', ${alias}.unidade,
    'estoque_minimo', ${alias}.estoque_minimo,
    'ativo', ${alias}.ativo
  ))`;
}

async function aplicarEstoque(
  materiaId: string,
  tipo: TipoMovimentacao,
  qtd: number,
) {
  if (tipo === TipoMovimentacao.AJUSTE) {
    const est = await query<{ quantidade: number }>(
      `SELECT quantidade FROM estoque_atual WHERE materia_prima_id = $1::uuid`,
      [materiaId],
    );
    const atual = est[0]?.quantidade ?? 0;
    const novo = Math.max(0, atual + qtd);
    await query(
      `INSERT INTO estoque_atual (materia_prima_id, quantidade)
       VALUES ($1::uuid, $2)
       ON CONFLICT (materia_prima_id) DO UPDATE SET quantidade = EXCLUDED.quantidade`,
      [materiaId, novo],
    );
    return;
  }
  const inc = tipo === TipoMovimentacao.ENTRADA ? qtd : -qtd;
  await query(
    `INSERT INTO estoque_atual (materia_prima_id, quantidade)
     VALUES ($1::uuid, $2)
     ON CONFLICT (materia_prima_id) DO UPDATE SET
       quantidade = estoque_atual.quantidade + EXCLUDED.quantidade`,
    [materiaId, inc],
  );
}

type MovimentacaoDbRow = {
  id: string;
  tipo: string;
  quantidade: number;
  motivo: string | null;
  data_atual: Date;
  materia_prima_id: unknown;
  u_id: string | null;
  u_nome: string | null;
  u_email: string | null;
};

function shapeMovRow(r: MovimentacaoDbRow) {
  const u =
    r.u_id != null
      ? {
          id: r.u_id,
          nome: typeof r.u_nome === "string" ? r.u_nome : "—",
          email: typeof r.u_email === "string" ? r.u_email : "",
        }
      : null;

  return {
    materia_prima_id: r.materia_prima_id,
    tipo: r.tipo,
    quantidade: r.quantidade,
    motivo: r.motivo,
    data_atual: r.data_atual,
    id: r.id,
    usuario: u ?? { id: "", nome: "—", email: "" },
  };
}

export async function createMovimentacao(
  body: MovimentacaoCreateInput,
  auth: { userId: string; roles: Role[] },
) {
  const qtd = Number(body.quantidade);
  const materiaIdStr = String(body.materia_prima_id);

  if (!isValidObjectId(materiaIdStr)) {
    const err = new Error("materia_prima_id inválido");
    (err as Error & { status: number }).status = 400;
    throw err;
  }

  let usuarioIdStr = auth.userId;
  if (auth.roles.includes(Role.ADMIN) && body.usuario_id != null) {
    const u = String(body.usuario_id).trim();
    if (u && isValidObjectId(u)) usuarioIdStr = u;
  }
  if (!isValidObjectId(usuarioIdStr)) {
    const err = new Error("Usuário (operador) inválido para esta movimentação.");
    (err as Error & { status: number }).status = 400;
    throw err;
  }

  const materiaExiste = await query(
    `SELECT 1 FROM materia_prima WHERE id = $1::uuid`,
    [materiaIdStr],
  );
  if (!materiaExiste.length) {
    const err = new Error(
      "Matéria-prima não encontrada. Cadastre uma matéria-prima ou use um materia_prima_id válido (GET /materia-prima).",
    );
    (err as Error & { status: number }).status = 400;
    throw err;
  }

  const usuarioExiste = await query(
    `SELECT 1 FROM usuario WHERE id = $1::uuid`,
    [usuarioIdStr],
  );
  if (!usuarioExiste.length) {
    const err = new Error("Usuário (operador) não encontrado para esta movimentação.");
    (err as Error & { status: number }).status = 400;
    throw err;
  }

  if (body.tipo === TipoMovimentacao.SAIDA) {
    const estoque = await query<{ quantidade: number }>(
      `SELECT quantidade FROM estoque_atual WHERE materia_prima_id = $1::uuid`,
      [materiaIdStr],
    );
    const q = estoque[0]?.quantidade ?? 0;
    if (q < qtd) {
      const err = new Error("Estoque insuficiente para essa saída.");
      (err as Error & { status: number }).status = 400;
      throw err;
    }
  }

  const ins = await query<{ id: string }>(
    `INSERT INTO movimentacao (
      materia_prima_id, tipo, quantidade, motivo, usuario_id
    ) VALUES ($1::uuid, $2::batmotor_tipo_movimentacao, $3, $4, $5::uuid)
    RETURNING id`,
    [materiaIdStr, body.tipo, qtd, body.motivo ?? null, usuarioIdStr],
  );
  const mid = ins[0]?.id;
  if (!mid) throw new Error("Falha ao criar movimentação");

  await aplicarEstoque(materiaIdStr, body.tipo, qtd);

  const populated = await loadMovimentacao(mid);
  if (!populated) throw new Error("Falha ao carregar movimentação");
  return populated;
}

async function loadMovimentacao(id: string) {
  const sql = `
    SELECT m.id,
           m.tipo::text AS tipo,
           m.quantidade,
           m.motivo,
           m.data_atual,
           ${materiaJson("mp")} AS materia_prima_id,
           u.id::text AS u_id,
           u.nome AS u_nome,
           u.email AS u_email
    FROM movimentacao m
    INNER JOIN materia_prima mp ON mp.id = m.materia_prima_id
    LEFT JOIN usuario u ON u.id = m.usuario_id
    WHERE m.id = $1::uuid`;
  type Row = MovimentacaoDbRow;
  const rows = await query<Row>(sql, [id]);
  const r = rows[0];
  if (!r) return null;
  return shapeMovRow(r);
}

export async function usuarioEhFuncionarioAtivo(
  usuarioId: string,
): Promise<boolean> {
  if (!isValidObjectId(usuarioId)) return false;
  const rows = await query(
    `SELECT 1
     FROM usuario u
     INNER JOIN usuario_perfil up ON up.usuario_id = u.id
     INNER JOIN perfil p ON p.id = up.perfil_id
     WHERE u.id = $1::uuid AND u.ativo = TRUE AND p.role = $2::batmotor_role
     LIMIT 1`,
    [usuarioId, Role.FUNCIONARIO],
  );
  return rows.length > 0;
}

export async function listMovimentacoes() {
  const sql = `
    SELECT m.id,
           m.tipo::text AS tipo,
           m.quantidade,
           m.motivo,
           m.data_atual,
           ${materiaJson("mp")} AS materia_prima_id,
           u.id::text AS u_id,
           u.nome AS u_nome,
           u.email AS u_email
    FROM movimentacao m
    INNER JOIN materia_prima mp ON mp.id = m.materia_prima_id
    LEFT JOIN usuario u ON u.id = m.usuario_id
    ORDER BY m.data_atual DESC`;
  const rows = await query<MovimentacaoDbRow>(sql);
  return rows.map((r) => shapeMovRow(r));
}

export async function findMovimentacao(id: string) {
  if (!isValidObjectId(id)) return null;
  return loadMovimentacao(id);
}

export async function updateMovimentacao(
  id: string,
  data: {
    materia_prima_id?: string;
    tipo?: TipoMovimentacao;
    quantidade?: number;
    motivo?: string | null;
    usuario_id?: string;
  },
) {
  if (!isValidObjectId(id)) {
    const err = new Error("Id inválido") as Error & { status: number };
    err.status = 400;
    throw err;
  }

  const curRows = await query<{
    materia_prima_id: string;
    tipo: string;
    quantidade: number;
    motivo: string | null;
    usuario_id: string;
  }>(
    `SELECT materia_prima_id::text AS materia_prima_id,
            tipo::text AS tipo,
            quantidade,
            motivo,
            usuario_id::text AS usuario_id
     FROM movimentacao WHERE id = $1::uuid`,
    [id],
  );
  const cur = curRows[0];
  if (!cur) {
    const err = new Error("Não encontrado") as Error & { status: number };
    err.status = 404;
    throw err;
  }

  if (data.materia_prima_id !== undefined && !isValidObjectId(data.materia_prima_id)) {
    const err = new Error("materia_prima_id inválido") as Error & { status: number };
    err.status = 400;
    throw err;
  }
  if (data.usuario_id !== undefined && !isValidObjectId(data.usuario_id)) {
    const err = new Error("usuario_id inválido") as Error & { status: number };
    err.status = 400;
    throw err;
  }

  const materia_prima_id =
    data.materia_prima_id !== undefined ? data.materia_prima_id : cur.materia_prima_id;
  const tipo = data.tipo !== undefined ? data.tipo : (cur.tipo as TipoMovimentacao);
  const quantidade = data.quantidade !== undefined ? data.quantidade : cur.quantidade;
  const motivo = data.motivo !== undefined ? data.motivo : cur.motivo;
  const usuario_id = data.usuario_id !== undefined ? data.usuario_id : cur.usuario_id;

  await query(
    `UPDATE movimentacao SET
       materia_prima_id = $2::uuid,
       tipo = $3::batmotor_tipo_movimentacao,
       quantidade = $4,
       motivo = $5,
       usuario_id = $6::uuid
     WHERE id = $1::uuid`,
    [id, materia_prima_id, tipo, quantidade, motivo, usuario_id],
  );

  const updated = await loadMovimentacao(id);
  if (!updated) {
    const err = new Error("Não encontrado") as Error & { status: number };
    err.status = 404;
    throw err;
  }
  return updated;
}

export async function deleteMovimentacao(id: string) {
  if (!isValidObjectId(id)) {
    const err = new Error("Id inválido") as Error & { status: number };
    err.status = 400;
    throw err;
  }
  const rows = await query(`DELETE FROM movimentacao WHERE id = $1::uuid RETURNING id`, [
    id,
  ]);
  if (!rows.length) {
    const err = new Error("Não encontrado") as Error & { status: number };
    err.status = 404;
    throw err;
  }
  return rows[0];
}
