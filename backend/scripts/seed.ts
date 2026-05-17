/**
 * Seed PostgreSQL (Supabase): perfis, utilizadores dev e uma matéria-prima de exemplo.
 *
 * Pré-requisitos: `DATABASE_URL` no `.env`.
 * Execução: `npm run db:seed`
 */
import "dotenv/config";
import { Role } from "../src/types/domain";
import { connectDb, disconnectDb, query } from "../src/lib/db";
import { hashPassword } from "../src/utils/password";

const usuariosSeed = [
  {
    email: "admin@batmotor.com",
    senha: "adminbatmotor",
    nome: "Administrador BatMotor",
    cpf: "00000000191",
    role: Role.ADMIN,
  },
  {
    email: "gerente.dev@batmotor.local",
    senha: "gerentebatmotor",
    nome: "Gerente (dev)",
    cpf: "11144477735",
    role: Role.GERENTE,
  },
  {
    email: "funcionario.dev@batmotor.local",
    senha: "funcionariobatmotor",
    nome: "Funcionário Almoxarifado (dev)",
    cpf: "39053344705",
    role: Role.FUNCIONARIO,
  },
];

async function ensurePerfil(role: Role, descricao: string): Promise<string> {
  const rows = await query<{ id: string }>(
    `SELECT id FROM perfil WHERE role = $1::batmotor_role LIMIT 1`,
    [role],
  );
  if (rows[0]) return rows[0].id;
  const ins = await query<{ id: string }>(
    `INSERT INTO perfil (role, descricao) VALUES ($1::batmotor_role, $2) RETURNING id`,
    [role, descricao],
  );
  return ins[0]!.id;
}

async function ensureUsuarioDev(input: {
  email: string;
  senhaPlain: string;
  nome: string;
  cpf: string;
}): Promise<string> {
  const porEmail = await query<{ id: string }>(
    `SELECT id FROM usuario WHERE email = $1`,
    [input.email],
  );
  const porCpf = await query<{ id: string }>(
    `SELECT id FROM usuario WHERE cpf = $1`,
    [input.cpf],
  );

  if (porEmail[0]) {
    await query(
      `UPDATE usuario SET nome = $2, ativo = TRUE, data_atual = NOW() WHERE id = $1`,
      [porEmail[0].id, input.nome],
    );
    return porEmail[0].id;
  }
  if (porCpf[0]) {
    await query(
      `UPDATE usuario SET email = $2, nome = $3, ativo = TRUE, data_atual = NOW() WHERE id = $1`,
      [porCpf[0].id, input.email, input.nome],
    );
    return porCpf[0].id;
  }

  const senhaHash = await hashPassword(input.senhaPlain);
  const ins = await query<{ id: string }>(
    `INSERT INTO usuario (nome, email, senha, cpf, ativo)
     VALUES ($1, $2, $3, $4, TRUE)
     RETURNING id`,
    [input.nome, input.email, senhaHash, input.cpf],
  );
  return ins[0]!.id;
}

async function vincularPerfil(usuarioId: string, perfilId: string) {
  await query(
    `INSERT INTO usuario_perfil (usuario_id, perfil_id) VALUES ($1::uuid, $2::uuid)
     ON CONFLICT (usuario_id, perfil_id) DO NOTHING`,
    [usuarioId, perfilId],
  );
}

async function main() {
  await connectDb();

  const perfilPorRole = new Map<Role, string>();
  for (const role of [Role.ADMIN, Role.GERENTE, Role.FUNCIONARIO]) {
    const id = await ensurePerfil(role, `Perfil ${role} (seed)`);
    perfilPorRole.set(role, id);
  }

  for (const u of usuariosSeed) {
    const usuarioId = await ensureUsuarioDev({
      email: u.email,
      senhaPlain: u.senha,
      nome: u.nome,
      cpf: u.cpf,
    });
    const perfilId = perfilPorRole.get(u.role);
    if (perfilId) await vincularPerfil(usuarioId, perfilId);
  }

  const mpExist = await query(
    `SELECT id FROM materia_prima WHERE nome = $1 LIMIT 1`,
    ["Parafuso M8 zincado (dev)"],
  );
  if (!mpExist.length) {
    await query(
      `INSERT INTO materia_prima (nome, categoria, unidade, estoque_minimo, ativo)
       VALUES ($1, $2, $3, $4, TRUE)`,
      ["Parafuso M8 zincado (dev)", "Fixação", "UN", 100],
    );
    console.log("[seed] Matéria-prima de exemplo criada.");
  }

  console.log("[seed] Utilizadores (login → JWT):");
  for (const u of usuariosSeed) {
    console.log(`  • ${u.role.padEnd(12)} ${u.email} / ${u.senha}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectDb();
  });
