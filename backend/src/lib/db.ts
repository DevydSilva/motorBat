/**
 * PostgreSQL (pool `pg`) — compatível com Supabase via `DATABASE_URL`.
 * Opcionalmente aplica `sql/schema.sql` no arranque (BATMOTOR_RUN_SCHEMA, default true).
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

function maskDatabaseUrl(raw: string): string {
  try {
    const u = new URL(raw);
    if (u.password) u.password = "****";
    return u.toString();
  } catch {
    return "(URL inválida)";
  }
}

function sslOption(): boolean | { rejectUnauthorized: boolean } {
  if (process.env.DATABASE_SSL === "false") return false;
  return { rejectUnauthorized: false };
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL?.trim(),
  max: Number(process.env.PG_POOL_MAX) || 10,
  idleTimeoutMillis: 30_000,
  ssl: sslOption(),
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const res = await pool.query<T>(text, params);
  return res.rows;
}

async function ensureSchema(): Promise<void> {
  const sqlPath = join(__dirname, "../../sql/schema.sql");
  const sql = readFileSync(sqlPath, "utf8");
  await pool.query(sql);
}

export async function connectDb(): Promise<void> {
  const uri = process.env.DATABASE_URL?.trim();
  if (!uri) {
    throw new Error(
      "[pg] Defina DATABASE_URL no .env (connection string PostgreSQL do Supabase)",
    );
  }
  const runSchema = process.env.BATMOTOR_RUN_SCHEMA !== "false";
  if (runSchema) {
    await ensureSchema();
  }
  await pool.query("SELECT 1");
  console.log("[pg] ligado a", maskDatabaseUrl(uri));
}

export async function disconnectDb(): Promise<void> {
  await pool.end();
}
