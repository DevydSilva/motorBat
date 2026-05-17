# BatMotor — Frontend (MongoDB)

SPA React (Vite) que consome a API em `backend_mongoDB`. Este README resume o repositório; o **mapa detalhado do código-fonte** está em `src/README.md`.

## Arranque

- `npm install`
- `npm run dev` — servidor de desenvolvimento (Vite)
- Variáveis: copiar `.env.example` para `.env` e definir `VITE_API_URL` (URL da API, ex.: `http://localhost:3000`)

## Pastas principais

| Pasta | Conteúdo |
|-------|----------|
| `src/` | Código da aplicação (ver `src/README.md`) |
| `public/` | Estáticos servidos na raiz (`/assets/...`) |
| `dist/` | Build de produção (gerado; não editar) |

## Documentação no código

Comentários em português e JSDoc nos módulos `.js`/`.jsx`; folhas de estilo com bloco inicial explicativo onde aplicável.
