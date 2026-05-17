# Estrutura do backend BatMotor

Este documento explica **para que serve cada pasta** e **como o fluxo HTTP** percorre o código após a reorganização (rotas modulares + JWT).

## Visão geral do fluxo

1. **`src/main.ts`** — sobe o servidor (porta vinda de `config/env.ts`).
2. **`src/app.ts`** — cria o `express()`, registra JSON body, **rotas** e o **middleware global de erro**.
3. **`src/routes/`** — define URLs (`/users`, `/movimentacao`, …) e **quem pode acessar** (middleware de JWT + papel).
4. **`src/controllers/`** — lê `req.body` / `req.params`, valida regras simples de entrada e chama o serviço.
5. **`src/services/`** — contém a lógica de negócio e as chamadas ao **Prisma** (`src/lib/prisma.ts`).
6. **`src/middlewares/`** — `authenticate` (JWT) e `authorize` (papéis ADMIN / GERENTE / FUNCIONARIO).
7. **`src/utils/`** — funções reutilizáveis (hash de senha, assinar/verificar token, `asyncHandler`).
8. **`src/config/`** — leitura centralizada de variáveis de ambiente.
9. **`src/types/`** — extensão de tipos do Express (`req.auth`).
10. **`prisma/`** — schema e migrações do banco.

## Autenticação

- **Rota pública:** `POST /auth/login` com `{ "email", "senha" }`.
- **Demais rotas:** cabeçalho `Authorization: Bearer <token>`.
- O token carrega `sub` (id do usuário), `email` e `roles` (papéis vindos de `UsuarioPerfil` → `Perfil`).

## Papéis (resumo da política aplicada nas rotas)

- **ADMIN** — acesso total às rotas de configuração (`/perfil`, `/modulos`, `/permissao-modulo`, `/user-perfil`, CRUD de `/teste`, criação/edição/remoção de usuários).
- **ADMIN ou GERENTE** — cadastros de almoxarifado que alteram dados mestres (`POST/PUT/DELETE` em fornecedores, matérias-prima, vínculo matéria–fornecedor; edição/remoção de movimentações).
- **POST `/movimentacao`** — sem JWT: corpo com `usuario_id` de usuário **FUNCIONARIO** ativo. Com JWT: **FUNCIONARIO** ou **ADMIN** (`usuario_id` no corpo só ADMIN).
- **Qualquer usuário autenticado** — consultas (`GET`) em almoxarifado, movimentações e estoque.

## Arquivo legado

- **`src/main.legado.ts`** — cópia da versão monolítica (todas as rotas em um arquivo), útil para **comparar** com a nova organização em aula.

## Variáveis de ambiente relevantes

Ver **`.env.example`** na raiz do `backend` (`JWT_SECRET`, `JWT_EXPIRES_IN`, `DATABASE_*`, etc.).

## Primeiro administrador (bootstrap)

Todas as rotas sensíveis exigem **JWT** com papel adequado. O `POST /users` aceita **apenas ADMIN**.

Para o **primeiro** usuário da equipe, uma abordagem comum é:

1. Inserir manualmente no MySQL um registro em `Usuario` com senha já em **bcrypt**, ou
2. Criar temporariamente (só em desenvolvimento) um script/semente Prisma que cadastra o admin, ou
3. Usar o Prisma Studio / cliente SQL e depois vincular `UsuarioPerfil` ao `Perfil` cujo `role` é `ADMIN`.

Depois disso, `POST /auth/login` devolve o token para as demais chamadas.

## Arquivo `main.legado.ts`

Está **fora** da compilação (`tsconfig` → `exclude`) porque é cópia de referência e pode ter encoding misto no Windows; o projeto ativo é `main.ts`.
