/**
 * Utilitários de senha com **bcrypt** para o modelo `Usuario`.
 *
 * - `hashPassword`: usado no registo/atualização de senha antes de gravar no MongoDB.
 * - `verifyPassword`: usado no login; suporta hashes bcrypt e, temporariamente, texto plano legado.
 */
import bcrypt from "bcrypt";

/** Custo do salt bcrypt (10 é um equilíbrio comum entre segurança e tempo de CPU). */
const SALT_ROUNDS = 10;

/**
 * Gera hash bcrypt para persistir em `Usuario.senha`.
 * Regra de negócio: nunca armazenar senha em texto puro em novos registos.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Compara a senha enviada no login com o valor guardado na base de dados.
 *
 * - Se o valor guardado começa por `$2a$` ou `$2b$`, trata-se de bcrypt e usa-se `bcrypt.compare`.
 * - Caso contrário, comparação em texto plano (compatibilidade com dados antigos); o ideal é migrar
 *   todos os registos para hash (redefinição ou script de migração).
 */
export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<boolean> {
  if (stored.startsWith("$2a$") || stored.startsWith("$2b$")) {
    return bcrypt.compare(plain, stored);
  }
  return plain === stored;
}
