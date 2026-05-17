# Pasta `postman`

Contém a coleção **Postman** para chamar a API BatMotor durante desenvolvimento e testes manuais.

## Ficheiro

| Ficheiro | Descrição |
|----------|-----------|
| `BatMotor.postman_collection.json` | Coleção v2.1: importar em Postman (**Import** → ficheiro). Texto de ajuda está em `info.description`, nas pastas (`description` de cada pasta) e em cada pedido (`request.description`). |

## Uso rápido

1. Subir MongoDB e a API (`npm run dev` no `backend_mongoDB`).
2. Opcional: `npm run db:seed` para perfis e utilizadores de exemplo (`scripts/seed.ts`).
3. Importar a coleção no Postman.
4. Ajustar variável `baseUrl` se a API não estiver em `http://localhost:3000`.
5. Executar **01 — Autenticação → POST Login**; o script de testes grava o JWT em `token`.
6. Usar os outros pedidos; as pastas 02–05 herdam **Bearer {{token}}**.

## Variáveis da coleção

| Variável | Função |
|----------|--------|
| `baseUrl` | URL base da API (sem barra final). |
| `token` | JWT; preenchido automaticamente pelo login (pode colar manualmente). |
| `loginEmail` / `loginSenha` | Credenciais do POST login (padrão alinhado ao seed). |
| `fornecedor_id`, `materia_prima_id`, `usuario_id`, `perfil_id`, `modulo_id`, `movimentacao_id` | IDs para URLs e bodies; **devem ser ObjectIds MongoDB válidos** (24 caracteres hex). Após criar/listar recursos na API, copie os ids reais para cá. |

## Notas

- JSON não admite comentários; toda a documentação está nas propriedades `description` da coleção ou no presente README.
- A coleção não cobre todas as rotas da API; para o mapa completo ver `src/routes/index.ts`.
