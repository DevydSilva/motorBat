# Deploy no Render — `frontend - mongoDB` + API `backend_mongoDB`

A pasta do front chama-se **`frontend - mongoDB`** (com espaços). No Render, define **Root Directory** exactamente como no repositório.

## Ordem recomendada

1. **Subir primeiro a API** (`backend_mongoDB`) como *Web Service*.
2. Copiar a URL pública da API (ex.: `https://batmotor-api-mongodb-xxxx.onrender.com`).
3. **Subir o front** como *Static Site* com variáveis de build abaixo.
4. Voltar à API e definir **`CORS_ORIGINS`** com a URL **HTTPS** do front (ex.: `https://batmotor-frontend-mongodb-xxxx.onrender.com`).

Sem o passo 4, o browser bloqueia pedidos CORS.

---

## Backend (`backend_mongoDB`) — Web Service

| Campo | Valor |
|--------|--------|
| Root Directory | `backend_mongoDB` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

**Environment (obrigatório):**

| Variável | Exemplo / notas |
|----------|------------------|
| `MONGODB_URI` | URI Atlas (`mongodb+srv://...`) |
| `JWT_SECRET` | String longa e aleatória |
| `CORS_ORIGINS` | URL do front no Render, **uma** origem ou várias separadas por vírgula |
| `PORT` | O Render injeta automaticamente; não precisas definir à mão |

Opcional: `JWT_EXPIRES_IN=8h`

Depois do primeiro deploy, corre **Shell** no Render ou localmente com a mesma URI: `npm run db:seed` (cria admin e dados de exemplo).

---

## Frontend (`frontend - mongoDB`) — Static Site

| Campo | Valor |
|--------|--------|
| Root Directory | `frontend - mongoDB` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

**React Router (SPA):** no painel do Static Site → *Redirects/Rewrites* → adicionar **Rewrite**: source `/*` → destination `/index.html` (para rotas como `/dashboard` não darem 404).

**Environment — marcar como variáveis de *Build* (Build-time):**

| Variável | Valor |
|----------|--------|
| `VITE_API_URL` | URL da API no Render, **sem** barra no fim |
| `VITE_USE_MOCK` | `false` |

O Vite embute `VITE_*` no **build**. Se mudares a URL da API, tens de fazer **Redeploy** (novo build).

---

## Erros comuns

- **CORS / failed to fetch**: falta ou está errado `CORS_ORIGINS` na API (tem de ser `https://...` igual ao origin do front).
- **401 em tudo**: falta seed ou JWT expirado; faz login em `/login`.
- **Ainda chama localhost**: `VITE_API_URL` não estava definida no *build* do Static Site.
