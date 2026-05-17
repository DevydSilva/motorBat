/**
 * Migra dados do MongoDB (Mongoose) para PostgreSQL já configurado em DATABASE_URL.
 *
 * Defina MONGODB_URI (ex.: mongodb://127.0.0.1:27017/batmotor).
 * Opcional: BATMOTOR_RUN_SCHEMA=false se o schema já foi aplicado pelo servidor.
 *
 * Descobre nomes de coleções automaticamente (usuarios, perfils, materiaprimas, …).
 * Executar uma vez; repetir pode duplicar chaves únicas (email/cnpj).
 *
 * Uso: npm run db:migrate-from-mongo
 */
import "dotenv/config";
import { randomUUID } from "crypto";
import { MongoClient, ObjectId } from "mongodb";
import { connectDb, disconnectDb, pool } from "../src/lib/db";

function oidKey(id: unknown): string | null {
  if (id instanceof ObjectId) return id.toHexString();
  if (id && typeof id === "object" && "$oid" in (id as object)) {
    return String((id as { $oid: string }).$oid);
  }
  return null;
}

function oidFromDoc(doc: Record<string, unknown>, field: string): string | null {
  const v = doc[field];
  if (v instanceof ObjectId) return v.toHexString();
  if (typeof v === "string" && /^[a-f0-9]{24}$/i.test(v)) return v;
  return oidKey(v);
}

async function main() {
  const mongoUri = process.env.MONGODB_URI?.trim();
  if (!mongoUri) {
    throw new Error("Defina MONGODB_URI para ler o MongoDB de origem.");
  }

  await connectDb();

  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(process.env.MONGO_DB_NAME || undefined);
  const collNames = (await db.listCollections().toArray()).map((c) => c.name);

  const pick = (...patterns: RegExp[]) => {
    for (const p of patterns) {
      const hit = collNames.find((n) => p.test(n));
      if (hit) return hit;
    }
    return null;
  };

  const mapOidUuid = new Map<string, string>();
  const mapUuid = (oidHex: string) => {
    if (!mapOidUuid.has(oidHex)) mapOidUuid.set(oidHex, randomUUID());
    return mapOidUuid.get(oidHex)!;
  };

  const cPerfils = pick(/^perfils$/i);
  const cUsuarios = pick(/^usuarios$/i);
  const cUsuPerf = pick(/^usuarioperfils$/i);
  const cFornec = pick(/^fornecedors$/i);
  const cMat = pick(/^materiaprimas$/i);
  const cMF = pick(/^materiafornecedors$/i);
  const cEst = pick(/^estoqueatuals$/i);
  const cMov = pick(/^movimentacaos$/i);
  const cMod = pick(/^modulos$/i);
  const cPerm = pick(/^permissaomodulos$/i);

  console.log("[migrate] Coleções encontradas:", {
    cPerfils,
    cUsuarios,
    cUsuPerf,
    cFornec,
    cMat,
    cMF,
    cEst,
    cMov,
    cMod,
    cPerm,
  });

  const pg = await pool.connect();
  try {
    await pg.query("BEGIN");

    if (cPerfils) {
      const docs = await db.collection(cPerfils).find({}).toArray();
      for (const raw of docs) {
        const d = raw as Record<string, unknown>;
        const oid = oidKey(d._id);
        if (!oid) continue;
        const id = mapUuid(oid);
        const role = String(d.role ?? "").trim();
        const descricao =
          d.descricao == null ? null : String(d.descricao);
        await pg.query(
          `INSERT INTO perfil (id, role, descricao)
           VALUES ($1::uuid, $2::batmotor_role, $3)
           ON CONFLICT (id) DO NOTHING`,
          [id, role, descricao],
        );
      }
      console.log(`[migrate] Perfis: ${docs.length} documentos processados.`);
    }

    if (cUsuarios) {
      const docs = await db.collection(cUsuarios).find({}).toArray();
      for (const raw of docs) {
        const d = raw as Record<string, unknown>;
        const oid = oidKey(d._id);
        if (!oid) continue;
        const id = mapUuid(oid);
        await pg.query(
          `INSERT INTO usuario (id, nome, email, senha, cpf, ativo, data_atual)
           VALUES ($1::uuid, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, NOW()))
           ON CONFLICT (id) DO NOTHING`,
          [
            id,
            String(d.nome ?? ""),
            String(d.email ?? ""),
            String(d.senha ?? ""),
            String(d.cpf ?? ""),
            d.ativo !== false,
            d.data_atual instanceof Date
              ? d.data_atual
              : d.data_atual
                ? new Date(String(d.data_atual))
                : null,
          ],
        );
      }
      console.log(`[migrate] Usuários: ${docs.length} documentos processados.`);
    }

    if (cUsuPerf && cUsuarios && cPerfils) {
      const docs = await db.collection(cUsuPerf).find({}).toArray();
      for (const raw of docs) {
        const d = raw as Record<string, unknown>;
        const uOid = oidFromDoc(d, "usuario_id");
        const pOid = oidFromDoc(d, "perfil_id");
        if (!uOid || !pOid) continue;
        const uid = mapOidUuid.get(uOid);
        const pid = mapOidUuid.get(pOid);
        if (!uid || !pid) continue;
        await pg.query(
          `INSERT INTO usuario_perfil (usuario_id, perfil_id) VALUES ($1::uuid, $2::uuid)
           ON CONFLICT (usuario_id, perfil_id) DO NOTHING`,
          [uid, pid],
        );
      }
      console.log(`[migrate] usuario_perfil: ${docs.length} vínculos processados.`);
    }

    if (cMod) {
      const docs = await db.collection(cMod).find({}).toArray();
      for (const raw of docs) {
        const d = raw as Record<string, unknown>;
        const oid = oidKey(d._id);
        if (!oid) continue;
        const id = mapUuid(oid);
        await pg.query(
          `INSERT INTO modulo (id, nome, descricao) VALUES ($1::uuid, $2, $3)
           ON CONFLICT (id) DO NOTHING`,
          [
            id,
            String(d.nome ?? ""),
            d.descricao == null ? null : String(d.descricao),
          ],
        );
      }
      console.log(`[migrate] Módulos: ${docs.length}.`);
    }

    if (cFornec) {
      const docs = await db.collection(cFornec).find({}).toArray();
      for (const raw of docs) {
        const d = raw as Record<string, unknown>;
        const oid = oidKey(d._id);
        if (!oid) continue;
        const id = mapUuid(oid);
        await pg.query(
          `INSERT INTO fornecedor (
            id, nome, cnpj, email, telefone, ativo,
            nome_contato, endereco, cidade, estado, categoria, tipo_fornecedor,
            data_inicio, condicoes_pagamento, observacoes, logo_data_url
          ) VALUES (
            $1::uuid, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12,
            $13, $14, $15, $16
          )
          ON CONFLICT (id) DO NOTHING`,
          [
            id,
            String(d.nome ?? ""),
            String(d.cnpj ?? ""),
            d.email == null ? null : String(d.email),
            d.telefone == null ? null : String(d.telefone),
            d.ativo !== false,
            d.nome_contato == null ? null : String(d.nome_contato),
            d.endereco == null ? null : String(d.endereco),
            d.cidade == null ? null : String(d.cidade),
            d.estado == null ? null : String(d.estado),
            d.categoria == null ? null : String(d.categoria),
            d.tipo_fornecedor == null ? null : String(d.tipo_fornecedor),
            d.data_inicio == null ? null : String(d.data_inicio),
            d.condicoes_pagamento == null ? null : String(d.condicoes_pagamento),
            d.observacoes == null ? null : String(d.observacoes),
            d.logo_data_url == null ? null : String(d.logo_data_url),
          ],
        );
      }
      console.log(`[migrate] Fornecedores: ${docs.length}.`);
    }

    if (cMat) {
      const docs = await db.collection(cMat).find({}).toArray();
      for (const raw of docs) {
        const d = raw as Record<string, unknown>;
        const oid = oidKey(d._id);
        if (!oid) continue;
        const id = mapUuid(oid);
        await pg.query(
          `INSERT INTO materia_prima (
            id, nome, categoria, unidade, estoque_minimo, ativo,
            observacao, preco_custo, preco_venda
          ) VALUES (
            $1::uuid, $2, $3, $4, $5, $6,
            $7, $8, $9
          )
          ON CONFLICT (id) DO NOTHING`,
          [
            id,
            String(d.nome ?? ""),
            String(d.categoria ?? ""),
            String(d.unidade ?? ""),
            Number(d.estoque_minimo ?? 0),
            d.ativo !== false,
            d.observacao == null ? null : String(d.observacao),
            d.preco_custo == null ? null : Number(d.preco_custo),
            d.preco_venda == null ? null : Number(d.preco_venda),
          ],
        );
      }
      console.log(`[migrate] Matérias-primas: ${docs.length}.`);
    }

    if (cMF) {
      const docs = await db.collection(cMF).find({}).toArray();
      for (const raw of docs) {
        const d = raw as Record<string, unknown>;
        const mpOid = oidFromDoc(d, "materia_prima_id");
        const foOid = oidFromDoc(d, "fornecedor_id");
        if (!mpOid || !foOid) continue;
        const mid = mapOidUuid.get(mpOid);
        const fid = mapOidUuid.get(foOid);
        if (!mid || !fid) continue;
        await pg.query(
          `INSERT INTO materia_fornecedor (materia_prima_id, fornecedor_id)
           VALUES ($1::uuid, $2::uuid)
           ON CONFLICT (materia_prima_id, fornecedor_id) DO NOTHING`,
          [mid, fid],
        );
      }
      console.log(`[migrate] materia_fornecedor: ${docs.length}.`);
    }

    if (cEst) {
      const docs = await db.collection(cEst).find({}).toArray();
      for (const raw of docs) {
        const d = raw as Record<string, unknown>;
        const mpOid = oidFromDoc(d, "materia_prima_id");
        if (!mpOid) continue;
        const mid = mapOidUuid.get(mpOid);
        if (!mid) continue;
        await pg.query(
          `INSERT INTO estoque_atual (materia_prima_id, quantidade)
           VALUES ($1::uuid, $2)
           ON CONFLICT (materia_prima_id) DO NOTHING`,
          [mid, Number(d.quantidade ?? 0)],
        );
      }
      console.log(`[migrate] estoque_atual: ${docs.length}.`);
    }

    if (cMov) {
      const docs = await db.collection(cMov).find({}).toArray();
      for (const raw of docs) {
        const d = raw as Record<string, unknown>;
        const oid = oidKey(d._id);
        const mpOid = oidFromDoc(d, "materia_prima_id");
        const uOid = oidFromDoc(d, "usuario_id");
        if (!mpOid || !uOid) continue;
        const mid = mapOidUuid.get(mpOid);
        const uid = mapOidUuid.get(uOid);
        if (!mid || !uid) continue;
        const tipo = String(d.tipo ?? "ENTRADA").trim();
        await pg.query(
          `INSERT INTO movimentacao (
            id, materia_prima_id, tipo, quantidade, motivo, usuario_id, data_atual
          ) VALUES (
            $1::uuid, $2::uuid, $3::batmotor_tipo_movimentacao, $4, $5, $6::uuid, COALESCE($7::timestamptz, NOW())
          )
           ON CONFLICT (id) DO NOTHING`,
          [
            oid ? mapUuid(oid) : randomUUID(),
            mid,
            tipo,
            Number(d.quantidade ?? 0),
            d.motivo == null ? null : String(d.motivo),
            uid,
            d.data_atual instanceof Date
              ? d.data_atual
              : d.data_atual
                ? new Date(String(d.data_atual))
                : null,
          ],
        );
      }
      console.log(`[migrate] movimentações: ${docs.length}.`);
    }

    if (cPerm && cPerfils && cMod) {
      const docs = await db.collection(cPerm).find({}).toArray();
      for (const raw of docs) {
        const d = raw as Record<string, unknown>;
        const oid = oidKey(d._id);
        const pOid = oidFromDoc(d, "perfil_id");
        const mOid = oidFromDoc(d, "modulo_id");
        if (!pOid || !mOid) continue;
        const pid = mapOidUuid.get(pOid);
        const modId = mapOidUuid.get(mOid);
        if (!pid || !modId) continue;
        await pg.query(
          `INSERT INTO permissao_modulo (
            id, perfil_id, modulo_id, pode_ler, pode_criar, pode_atualizar, pode_excluir
          ) VALUES (
            $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7
          )
          ON CONFLICT (perfil_id, modulo_id) DO NOTHING`,
          [
            oid ? mapUuid(oid) : randomUUID(),
            pid,
            modId,
            Boolean(d.pode_ler),
            Boolean(d.pode_criar),
            Boolean(d.pode_atualizar),
            Boolean(d.pode_excluir),
          ],
        );
      }
      console.log(`[migrate] permissão_módulo: ${docs.length}.`);
    }

    await pg.query("COMMIT");
    console.log("[migrate] Concluído com sucesso.");
  } catch (e) {
    await pg.query("ROLLBACK");
    throw e;
  } finally {
    pg.release();
    await client.close();
    await disconnectDb();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
