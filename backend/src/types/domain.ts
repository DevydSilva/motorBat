/**
 * Tipos e enums de domínio partilhados pela API BatMotor (PostgreSQL / Supabase).
 *
 * Estes valores espelham o contrato que existia no stack Prisma/MySQL e são usados em:
 * - perfis de utilizador (`UsuarioPerfil`, `Perfil`, JWT);
 * - movimentações de estoque e regras de negócio (entrada/saída/ajuste).
 *
 * Manter os literais em sincronia com `scripts/seed.ts` e com os valores aceites nas rotas.
 */

/** Perfis de acesso: definem autorização na aplicação e entram no token JWT (`roles`). */
export enum Role {
  /** Acesso total; criação de outro ADMIN não é permitida pela rota pública de utilizadores. */
  ADMIN = "ADMIN",
  /** Gestão operacional; apenas um documento `Perfil` com role GERENTE é permitido na criação de perfil. */
  GERENTE = "GERENTE",
  /** Operação do dia a dia (ex.: movimentações conforme regras da API). */
  FUNCIONARIO = "FUNCIONARIO",
}

/**
 * Tipo de movimentação de matéria-prima no armazém.
 * Afeta como o saldo em `EstoqueAtual` é atualizado (incremento, decremento ou ajuste com piso zero).
 */
export enum TipoMovimentacao {
  /** Aumenta o estoque pela quantidade indicada. */
  ENTRADA = "ENTRADA",
  /** Diminui o estoque; exige saldo suficiente antes de gravar. */
  SAIDA = "SAIDA",
  /** Soma a quantidade ao saldo atual e aplica `Math.max(0, ...)` (correção de inventário). */
  AJUSTE = "AJUSTE",
}
