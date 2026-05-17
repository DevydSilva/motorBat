/**
 * Normalização de ids em rotas Express e validação de UUID (PostgreSQL).
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function paramId(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

/** Aceita UUID v1–v8 (RFC alargado) — formato usado pelo Postgres/gen_random_uuid(). */
export function isValidObjectId(id: string | undefined | null): id is string {
  return Boolean(id && UUID_RE.test(id));
}
