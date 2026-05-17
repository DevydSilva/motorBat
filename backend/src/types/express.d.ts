/**
 * Declaração de módulo para enriquecer o `Request` do Express com dados do JWT.
 *
 * O ficheiro é carregado pelo TypeScript como "ambient" (não exporta valores em runtime).
 * `export {}` força o ficheiro a ser tratado como módulo e evita colisão de nomes no escopo global.
 *
 * Fluxo típico:
 * 1. O cliente envia `Authorization: Bearer <token>`.
 * 2. O middleware de autenticação valida o JWT e preenche `req.auth`.
 * 3. Rotas protegidas leem `req.auth.userId`, `req.auth.roles`, etc.
 *
 * Em rotas públicas ou antes do middleware, `req.auth` permanece `undefined`.
 */
import type { Role } from "./domain";

declare global {
  namespace Express {
    interface Request {
      /**
       * Payload derivado do JWT após validação bem-sucedida.
       * Ausente em requisições não autenticadas ou se o middleware não tiver corrido.
       */
      auth?: {
        /** Identificador MongoDB do utilizador (`sub` do token), em string hex de 24 caracteres. */
        userId: string;
        /** E-mail do utilizador no momento da emissão do token (cópia para conveniência). */
        email: string;
        /** Lista de perfis agregados (pode conter várias entradas se o modelo permitir múltiplos vínculos). */
        roles: Role[];
      };
    }
  }
}

export {};
