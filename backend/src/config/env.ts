/**
 * Configuração centralizada da API: valores lidos de `process.env` após `dotenv/config`.
 *
 * **Quem importa:** tipicamente `utils/token.ts` (JWT), `main.ts` / `app.ts` (porta), e qualquer
 * módulo que precise de constantes de ambiente sem aceder diretamente a `process.env` em todo o lado.
 *
 * **Ficheiro de referência:** `.env.example` lista variáveis (`DATABASE_URL`, `JWT_SECRET`, …).
 *
 * Este módulo executa efeitos ao carregar: aviso em consola se `JWT_SECRET` estiver em falta.
 */
import "dotenv/config";

/**
 * Segredo JWT de **apenas desenvolvimento** quando `JWT_SECRET` não está definido no `.env`.
 * Evita que o servidor falhe ao arrancar localmente; **nunca** usar este valor em produção.
 */
const JWT_DEFAULT_DEV =
  "DEV_JWT_SECRET_SUBSTITUA_EM_PRODUCAO_MINIMO_32_CARACTERES";

/**
 * Objeto imutável (`as const`) com opções já normalizadas (números, defaults de string).
 */
export const env = {
  /**
   * Porta HTTP do servidor Express.
   * Variável: `PORT`. Default **3000** se ausente ou não numérica.
   */
  port: Number(process.env.PORT) || 3000,
  /**
   * Segredo HMAC para `jwt.sign` / `jwt.verify` (algoritmo HS256 no `token.ts`).
   * Variável: `JWT_SECRET`. Se vazio/ausente, usa `JWT_DEFAULT_DEV` e emite `console.warn`.
   */
  jwtSecret: process.env.JWT_SECRET?.trim() || JWT_DEFAULT_DEV,
  /**
   * Validade do token JWT (formato aceite pela biblioteca `jsonwebtoken`, ex.: `"8h"`, `"15m"`, `"7d"`).
   * Variável: `JWT_EXPIRES_IN`. Default **`8h`**.
   */
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
} as const;

/** Aviso único em desenvolvimento quando o segredo real não foi configurado. */
if (!process.env.JWT_SECRET?.trim()) {
  console.warn(
    "[config] JWT_SECRET não definido no .env — usando segredo de desenvolvimento. " +
      "Defina JWT_SECRET antes de colocar em produção.",
  );
}
