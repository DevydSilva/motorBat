# Backend BatMotor — Supabase/PostgreSQL

API Express do BatMotor usando **PostgreSQL do Supabase** via `pg`.

## Requisitos

- Node.js ≥ 20
- Banco Supabase/PostgreSQL
- Supabase CLI para aplicar migrations (`npx supabase@latest ...`)

## Configuração

1. Copie `.env.example` para `.env` e ajuste `DATABASE_URL`.
2. Aplique as migrations:
   ```powershell
   npx supabase@latest login
   npx supabase@latest link --project-ref kzaqkocifaklrxtbfmgl
   npx supabase@latest db push
   ```
3. Instale dependências:
   ```powershell
   npm install
   ```
4. Popule dados iniciais:
   ```powershell
   npm run db:seed
   ```
5. Rode local:
   ```powershell
   npm run dev
   ```

## Variáveis Principais

- `DATABASE_URL`: connection string do Supabase/PostgreSQL. No Render, prefira a URL do **Connection Pooler** do Supabase para evitar falhas IPv6 (`ENETUNREACH`).
- `JWT_SECRET`: segredo para assinar tokens.
- `JWT_EXPIRES_IN`: validade do token, padrão `8h`.
- `CORS_ORIGINS`: URL do frontend em produção, por exemplo `https://seu-front.onrender.com`.
- `BATMOTOR_RUN_SCHEMA`: em produção use `false`; aplique schema com `supabase db push`.

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor com hot reload |
| `npm run start` | Servidor único |
| `npm run db:seed` | Popular perfis, usuários dev e matéria-prima exemplo |
| `npm run db:migrate-from-mongo` | Migração opcional MongoDB → Supabase |
| `npm run verify` | `tsc --noEmit` |

## Deploy no Render

Opção recomendada: criar um **Web Service** apontando para este repositório.

- **Root Directory:** `backend`
- **Build Command:** `npm ci`
- **Start Command:** `npm start`
- **Health Check Path:** `/health`

Variáveis no Render:

- `DATABASE_URL`: URL do banco Supabase.
- `BATMOTOR_RUN_SCHEMA`: `false`
- `JWT_SECRET`: gere um valor longo e aleatório.
- `JWT_EXPIRES_IN`: `8h`
- `CORS_ORIGINS`: URL do frontend quando ele existir.
- `CORS_ALLOW_NETLIFY`: `true` se o front estiver na Netlify.

Depois do deploy, copie a URL do Render, por exemplo `https://batmotor-api.onrender.com`, e coloque no frontend como `VITE_API_URL`.

No Supabase, pegue a `DATABASE_URL` em **Project Settings → Database → Connection string → Transaction pooler**. O formato costuma ser:

```env
postgresql://postgres.PROJECT_REF:SENHA_URL_ENCODED@aws-0-REGION.pooler.supabase.com:6543/postgres
```

Se a senha tiver `@`, troque por `%40`.

Teste rápido:

```powershell
curl https://SUA-API.onrender.com/health
```

