/**
 * ===========================================================================
 * app.ts — FÁBRICA Express (sem escutar porta)
 * ===========================================================================
 * Porque existe separado de `main.ts`?
 *   - Facilita testes: em testes pode criar-se `createApp()` sem subir servidor real.
 *
 * ORDEM DOS MIDDLEWARES (importante para o professor):
 *   1) cors(...)        — navegador só aceita resposta se origem estiver na lista permitida.
 *   2) express.json(...) — preenche `req.body` em pedidos JSON (com excepção para form/multipart).
 *   3) urlencoded        — formulários clássicos application/x-www-form-urlencoded.
 *   4) registerRoutes   — regista todas as rotas da API (ver `routes/index.ts`).
 *   5) errorHandler     — último middleware: captura erros e devolve JSON consistente.
 *
 * Vírgulas em `CORS_ORIGINS` (env): lista de origens do front permitidas, separadas por vírgula.
 * `CORS_ALLOW_NETLIFY=true`: permite qualquer `https://*.netlify.app`.
 * ===========================================================================
 */
import cors from "cors";
import express from "express";
import { registerRoutes } from "./routes/index";
import { errorHandler } from "./middlewares/errorHandler";

const DEFAULT_CORS_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
  "http://[::1]:5173",
  "http://[::1]:4173",
];

/** Junta origens extra (Render, Vercel, etc.) às de desenvolvimento — não perdes o localhost. */
function parseCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS?.trim();
  const extra = raw
    ? raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  return [...new Set([...DEFAULT_CORS_ORIGINS, ...extra])];
}

/** Qualquer porta Vite/Web (5173, 5174, …) em HTTP — evita preflight a falhar por origem fora da lista. */
function isLocalHttpDevOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    if (u.protocol !== "http:") return false;
    const h = u.hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
  } catch {
    return false;
  }
}

/** Front no Netlify (`https://algo.netlify.app`). Só usado se `CORS_ALLOW_NETLIFY=true`. */
function isNetlifyAppOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    if (u.protocol !== "https:") return false;
    return u.hostname !== "netlify.app" && u.hostname.endsWith(".netlify.app");
  } catch {
    return false;
  }
}

/**
 * Fábrica da aplicação Express (sem subir a porta).
 * Separamos de `main.ts` para facilitar testes futuros e leitura didática.
 */
export function createApp() {
  const app = express();

  /** Render / proxies — evita avisos com `X-Forwarded-*` em produção. */
  if (process.env.NODE_ENV === "production" || process.env.RENDER) {
    app.set("trust proxy", 1);
  }

  const allowedOrigins = parseCorsOrigins();
  const allowNetlifyWildcard = process.env.CORS_ALLOW_NETLIFY === "true";
  app.use(
    cors({
      /**
       * Função + `callback(null, true)`: o `cors` reflecte o `Origin` do pedido nos cabeçalhos.
       * Com `origin: [array]` e origem não listada, o pacote faz `next()` no OPTIONS e o Express
       * devolve 404 sem CORS — o Chrome mostra “preflight failed / sem ACAO”.
       */
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (
          allowedOrigins.includes(origin) ||
          isLocalHttpDevOrigin(origin) ||
          (allowNetlifyWildcard && isNetlifyAppOrigin(origin))
        ) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
      /** Omitir: o `cors` copia `Access-Control-Request-Headers` do preflight (Accept, Authorization, …). */
      optionsSuccessStatus: 204,
      maxAge: 86400,
    }),
  );

  /**
   * JSON: por padrão o Express só faz parse com `Content-Type: application/json`.
   * Postman/cURL às vezes mandam o body JSON sem esse header (ou como text/plain) —
   * aí `req.body` fica vazio e o middleware de JWT acha que “falta token”.
   *
   * Só NÃO tratamos como JSON quando é claramente form ou multipart (aí o parser abaixo lê).
   */
  app.use(
    express.json({
      /** Default do body-parser é ~100kb; logomarcas em base64 (JSON) precisam de mais espaço. */
      limit: process.env.JSON_BODY_LIMIT ?? "2mb",
      type: (req) => {
        const ct = (req.headers["content-type"] ?? "")
          .split(";")[0]
          .trim()
          .toLowerCase();
        if (ct === "application/x-www-form-urlencoded") return false;
        if (ct.startsWith("multipart/")) return false;
        return true;
      },
    }),
  );
  app.use(
    express.urlencoded({
      extended: true,
      limit: process.env.URLENCODED_BODY_LIMIT ?? "2mb",
    }),
  );

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true, service: "batmotor-backend-supabase" });
  });

  registerRoutes(app);

  app.use(errorHandler);
  return app;
}
