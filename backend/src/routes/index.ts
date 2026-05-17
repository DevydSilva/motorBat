/**
 * Registo central das rotas HTTP da API BatMotor.
 *
 * `registerRoutes(app)` é invocado em `app.ts` depois do JSON parser e dos middlewares globais.
 *
 * **Autenticação**
 * - Rotas registadas diretamente em `app` **antes** do router `r`: podem ser públicas ou usar middleware próprio.
 * - `const r = Router(); r.use(authenticate)` — todas as rotas montadas em `r` exigem `Authorization: Bearer <JWT>` válido.
 *
 * **Autorização (atalhos abaixo)**
 * - `requireRole(...)` — papéis lidos do **token** (rápido; pode estar desatualizado se o perfil mudou na BD).
 * - `requireRoleFromDb(...)` — papéis obtidos na **base de dados** (usado em `/users` onde consistência importa).
 *
 * **Convenções especiais**
 * - `POST /auth/login` — sem token; devolve JWT.
 * - `POST /movimentacao` — `optionalAuthenticate`: com token usa o utilizador do JWT; sem token o body deve identificar o operador (`usuario_id`) conforme regras no controller.
 * - `PATCH /users/me` — utilizador altera o **próprio** perfil/dados; limites por papel ficam no controller.
 *
 * Caminhos (`/users`, `/perfil`, `/modulos`, …) mantêm compatibilidade com o cliente legado.
 */
import type { Express } from "express";
import { Router } from "express";
import { Role } from "../types/domain";
import * as authController from "../controllers/auth.controller";
import * as usuarioController from "../controllers/usuario.controller";
import * as perfilController from "../controllers/perfil.controller";
import * as moduloController from "../controllers/modulo.controller";
import * as usuarioPerfilController from "../controllers/usuarioPerfil.controller";
import * as fornecedorController from "../controllers/fornecedor.controller";
import * as materiaFornecedorController from "../controllers/materiaFornecedor.controller";
import * as materiaPrimaController from "../controllers/materiaPrima.controller";
import * as permissaoModuloController from "../controllers/permissaoModulo.controller";
import * as movimentacaoController from "../controllers/movimentacao.controller";
import * as estoqueController from "../controllers/estoque.controller";
import * as relatorioController from "../controllers/relatorio.controller";
import * as testeController from "../controllers/teste.controller";
import { authenticate, optionalAuthenticate } from "../middlewares/authenticate";
import { requireRole, requireRoleFromDb } from "../middlewares/authorize";
import { asyncHandler } from "../utils/asyncHandler";

/** Só papel ADMIN (validação pelo JWT). */
const adminOnly = requireRole(Role.ADMIN);
/** ADMIN ou GERENTE (JWT). */
const adminOuGerente = requireRole(Role.ADMIN, Role.GERENTE);
/** Só ADMIN; papéis lidos na BD — usado em rotas `/users` de gestão. */
const adminOnlyDb = requireRoleFromDb(Role.ADMIN);
/** ADMIN ou GERENTE; papéis na BD — listagem/criação de utilizadores, etc. */
const adminOuGerenteDb = requireRoleFromDb(Role.ADMIN, Role.GERENTE);

/**
 * Associa todas as rotas ao `app` Express: rotas públicas ou com auth opcional primeiro;
 * depois monta o router autenticado em `/` (sem prefixo global além dos paths indicados).
 */
export function registerRoutes(app: Express): void {
  app.post("/auth/login", asyncHandler(authController.login));

  app.post(
    "/movimentacao",
    optionalAuthenticate,
    asyncHandler(movimentacaoController.create),
  );

  const r = Router();
  r.use(authenticate);

  /* -------- Utilizadores: contas internas (não há registo público self-service) -------- */
  r.patch("/users/me", asyncHandler(usuarioController.updateMe));
  r.get("/users", adminOuGerenteDb, asyncHandler(usuarioController.list));
  r.get("/users/:id", asyncHandler(usuarioController.getById));
  r.post("/users", adminOnlyDb, asyncHandler(usuarioController.create));
  r.put("/users/:id", adminOnlyDb, asyncHandler(usuarioController.update));
  r.delete("/users/:id", adminOnlyDb, asyncHandler(usuarioController.remove));

  /* -------- Perfis, módulos, permissões e vínculo utilizador–perfil (configuração) -------- */
  r.post("/perfil", adminOnly, asyncHandler(perfilController.create));
  r.get("/perfil", adminOnly, asyncHandler(perfilController.list));
  r.get("/perfil/:id", adminOnly, asyncHandler(perfilController.getById));
  r.put("/perfil/:id", adminOnly, asyncHandler(perfilController.update));
  r.delete("/perfil/:id", adminOnly, asyncHandler(perfilController.remove));

  r.post("/modulos", adminOnly, asyncHandler(moduloController.create));
  r.get("/modulos", adminOnly, asyncHandler(moduloController.list));
  r.get("/modulos/:id", adminOnly, asyncHandler(moduloController.getById));
  r.put("/modulos/:id", adminOnly, asyncHandler(moduloController.update));
  r.delete("/modulos/:id", adminOnly, asyncHandler(moduloController.remove));

  r.post("/user-perfil", adminOnly, asyncHandler(usuarioPerfilController.create));
  r.get("/user-perfil", adminOnly, asyncHandler(usuarioPerfilController.list));
  r.get(
    "/user-perfil/:usuario_id/:perfil_id",
    adminOnly,
    asyncHandler(usuarioPerfilController.getByPair),
  );
  r.put(
    "/user-perfil/:usuario_id/:perfil_id",
    adminOnly,
    asyncHandler(usuarioPerfilController.updatePair),
  );
  r.delete(
    "/user-perfil/:usuario_id/:perfil_id",
    adminOnly,
    asyncHandler(usuarioPerfilController.removePair),
  );

  r.post(
    "/permissao-modulo",
    adminOnly,
    asyncHandler(permissaoModuloController.create),
  );
  r.get(
    "/permissao-modulo",
    adminOnly,
    asyncHandler(permissaoModuloController.list),
  );
  r.get(
    "/permissao-modulo/:id",
    adminOnly,
    asyncHandler(permissaoModuloController.getById),
  );
  r.put(
    "/permissao-modulo/:id",
    adminOnly,
    asyncHandler(permissaoModuloController.update),
  );
  r.delete(
    "/permissao-modulo/:id",
    adminOnly,
    asyncHandler(permissaoModuloController.remove),
  );

  /* -------- Almoxarifado: leituras para qualquer utilizador autenticado; escrita ADMIN/GERENTE -------- */
  r.post(
    "/fornecedores",
    adminOuGerente,
    asyncHandler(fornecedorController.create),
  );
  r.get("/fornecedores", asyncHandler(fornecedorController.list));
  r.get("/fornecedores/:id", asyncHandler(fornecedorController.getById));
  r.put(
    "/fornecedores/:id",
    adminOuGerente,
    asyncHandler(fornecedorController.update),
  );
  r.delete(
    "/fornecedores/:id",
    adminOuGerente,
    asyncHandler(fornecedorController.remove),
  );

  r.post(
    "/materia-fornecedor",
    adminOuGerente,
    asyncHandler(materiaFornecedorController.create),
  );
  r.get("/materia-fornecedor", asyncHandler(materiaFornecedorController.list));
  r.get(
    "/materia-fornecedor/:materiaid/:fornecedorid",
    asyncHandler(materiaFornecedorController.getByPair),
  );
  r.put(
    "/materia-fornecedor/:materiaid/:fornecedorid",
    adminOuGerente,
    asyncHandler(materiaFornecedorController.updatePair),
  );
  r.delete(
    "/materia-fornecedor/:materiaid/:fornecedorid",
    adminOuGerente,
    asyncHandler(materiaFornecedorController.removePair),
  );

  r.post(
    "/materia-prima",
    adminOuGerente,
    asyncHandler(materiaPrimaController.create),
  );
  r.get("/materia-prima", asyncHandler(materiaPrimaController.list));
  r.get("/materia-prima/:id", asyncHandler(materiaPrimaController.getById));
  r.put(
    "/materia-prima/:id",
    adminOuGerente,
    asyncHandler(materiaPrimaController.update),
  );
  r.delete(
    "/materia-prima/:id",
    adminOuGerente,
    asyncHandler(materiaPrimaController.remove),
  );

  /* -------- Movimentação: o POST está fora de `r` (JWT opcional); aqui só consulta/edição autenticada -------- */
  r.get("/movimentacao", asyncHandler(movimentacaoController.list));
  r.get("/movimentacao/:id", asyncHandler(movimentacaoController.getById));
  r.put(
    "/movimentacao/:id",
    adminOuGerente,
    asyncHandler(movimentacaoController.update),
  );
  r.delete(
    "/movimentacao/:id",
    adminOuGerente,
    asyncHandler(movimentacaoController.remove),
  );

  /** Saldos agregados (`EstoqueAtual`) com dados da matéria-prima para ecrãs de stock. */
  r.get("/estoque-atual", asyncHandler(estoqueController.list));

  /** Lista matérias ativas com quantidade abaixo do mínimo (apoio a compras). */
  r.get(
    "/relatorios/estoque-baixo",
    asyncHandler(relatorioController.estoqueBaixo),
  );
  /** Dispara e-mail de alerta (SMTP configurado em env); requer papel de gestão. */
  r.post(
    "/relatorios/estoque-baixo/enviar-email",
    adminOuGerente,
    asyncHandler(relatorioController.estoqueBaixoEnviarEmail),
  );
  /** Agregação diária ENTRADA/SAÍDA/AJUSTE para gráficos do dashboard. */
  r.get(
    "/relatorios/movimentacoes-por-dia",
    asyncHandler(relatorioController.movimentacoesPorDia),
  );

  /* -------- CRUD de exemplo (`Teste`); restringido a ADMIN -------- */
  r.get("/teste", adminOnly, asyncHandler(testeController.list));
  r.get("/teste/:id", adminOnly, asyncHandler(testeController.getById));
  r.post("/teste", adminOnly, asyncHandler(testeController.create));
  r.put("/teste/:id", adminOnly, asyncHandler(testeController.update));
  r.delete("/teste/:id", adminOnly, asyncHandler(testeController.remove));

  app.use(r);
}
