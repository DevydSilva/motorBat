# Batmotor - Migracao para React + Backend

Este projeto foi reestruturado em duas camadas:

- `frontend/`: aplicacao React (Vite) para interface do almoxarifado.
- `backend/`: API Node.js/Express para CRUD, autenticacao, alertas e relatorios.

## Estrutura criada

```txt
.
├── backend
│   ├── package.json
│   └── src
│       ├── app.js
│       ├── server.js
│       ├── data/store.js
│       ├── middleware/auth.js
│       └── routes
│           ├── auth.routes.js
│           └── inventory.routes.js
└── frontend
    ├── package.json
    ├── index.html
    ├── vite.config.js
    └── src
        ├── main.jsx
        ├── App.jsx
        ├── styles/app.css
        └── pages
            ├── DashboardPage.jsx
            ├── MaterialsPage.jsx
            ├── SuppliersPage.jsx
            ├── MovementsPage.jsx
            └── ReportsPage.jsx
```

## Como manter o visual do template atual

Para preservar o estilo do HTML original no React:

1. Criar a pasta `frontend/public/assets`.
2. Copiar os arquivos visuais do template atual para esta pasta:
   - `main.min.css`
   - `animate.css`
   - `OverlayScrollbars.min.css`
   - `remixicon.css`
   - imagens e fontes usadas pelo CSS.
3. Conferir caminhos internos de `url(...)` dentro dos CSS para funcionarem em `/assets/...`.

O `frontend/index.html` ja foi preparado para consumir esses arquivos via `/assets/...`.

## Endpoints da API (backend)

- `POST /api/auth/login`
- `GET /api/suppliers`
- `POST /api/suppliers`
- `GET /api/materials`
- `POST /api/materials`
- `PATCH /api/materials/:id`
- `DELETE /api/materials/:id` (gerencia)
- `POST /api/movements`
- `GET /api/alerts/min-stock`
- `GET /api/reports/stock-summary`

## Deploy AWS (sugestao)

### Frontend (React)
- AWS Amplify Hosting ou S3 + CloudFront.
- Build command: `npm run build`
- Output: `dist`

### Backend (Node/Express)
- AWS Elastic Beanstalk, ECS Fargate ou App Runner.
- Definir variaveis:
  - `PORT`
  - `JWT_SECRET`

## Proximo passo recomendado

Substituir o `store.js` em memoria por banco real (PostgreSQL no RDS ou DynamoDB), mantendo os mesmos contratos de rota para nao quebrar o frontend.
