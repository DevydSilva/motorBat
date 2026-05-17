# Perfis (ADMIN, GERENTE, FUNCIONARIO) e fluxo de acesso

## Token JWT — uma vez por “sessão”

1. O **funcionário** (ou qualquer usuário) faz **`POST /auth/login`** com **e-mail e senha** cadastrados.
2. A API devolve um **token JWT** (string longa). Esse token vale até expirar (`JWT_EXPIRES_IN` no `.env`, ex.: `8h`).
3. Em **todas** as outras chamadas, envie o mesmo token no cabeçalho **`Authorization: Bearer …`** (ou o campo `token` no body, se estiver usando essa opção de compatibilidade).
4. **Não** é preciso “gerar token novo” a cada entrada/saída de produto: enquanto o token não expirar, o funcionário pode mandar vários `POST /movimentacao` com o **mesmo** token.

Ou seja: **login uma vez** → **várias operações** até o tempo acabar ou fazer logout no front (descartando o token).

## Quem cria e-mail e senha do gerente e do funcionário?

- **Não há cadastro público** (self-service). Quem cria usuários é quem tem papel **ADMIN**, pela API **`POST /users`** (nome, email, senha, cpf, …).
- Depois o **ADMIN** vincula o usuário ao papel certo com **`POST /user-perfil`** (`usuario_id`, `perfil_id` do perfil GERENTE ou FUNCIONARIO).
- Perfis (`Perfil` com `role` ADMIN / GERENTE / FUNCIONARIO) costumam existir desde o seed ou são criados com **`POST /perfil`**.

Em **desenvolvimento**, o `npx prisma db seed` cria três usuários de exemplo (ver saída do comando no terminal).

## Quem faz entrada e saída de estoque?

- **`POST /movimentacao`** é **público** no sentido de **não exigir JWT** para o funcionário no balcão/totem.
- **Sem token:** o JSON deve incluir **`usuario_id`** com o **id numérico** do usuário que tem perfil **FUNCIONARIO** no banco (cadastrado pelo ADMIN). A API valida isso antes de gravar.
- **Com JWT (opcional):** se enviar `Authorization: Bearer …` (ou `token` no body), vale a regra de login: quem pode registrar é **FUNCIONARIO** ou **ADMIN**; **GERENTE** recebe 403. **ADMIN** pode enviar `usuario_id` no body para registrar em nome de outro usuário.
- **GERENTE** não usa o modo “só funcionário” para criar movimento novo com JWT de gerente (403). Continua podendo **listar** (com token), **PUT/DELETE** movimentação e cadastrar fornecedor/matéria-prima.

**Segurança:** o modo sem JWT confia no `usuario_id` informado — use em **rede confiável** ou proteja o endpoint (API gateway, VPN). Para ambiente exposto na internet, prefira sempre login + JWT.

## Gerente “limitado” — relatórios

- Hoje **não existe** rota separada chamada “relatório” no backend: o que há são **listagens** (`GET /movimentacao`, `GET /estoque-atual`, `GET /materia-prima`, etc.).
- **GERENTE** e **FUNCIONARIO** autenticados podem **consultar** essas listas (como está nas rotas). **ADMIN** continua com acesso total à configuração (`/perfil`, `/modulos`, `/users`, …).
- Se no futuro vocês quiserem **relatório só para ADMIN** ou **exportação só gerente**, isso seria **novas rotas** ou regras extras — hoje não está definido assim no código.

## Resumo rápido

| Papel        | Cadastro usuário | Fornecedor / matéria-prima | POST movimentação (nova) | Listar movimentação / estoque |
|-------------|-------------------|----------------------------|---------------------------|-------------------------------|
| ADMIN       | Sim (`POST /users`) | Sim                        | Sim                       | Sim                           |
| GERENTE     | Não               | Sim (com ADMIN)            | Não                       | Sim                           |
| FUNCIONARIO | Não               | Só leitura na maior parte | Sim (JWT **ou** `usuario_id` sem JWT) | Sim (com JWT)                 |

(Ajustes finos de negócio podem evoluir; este documento reflete o comportamento atual do repositório.)
