# Pasta `src/` — mapa do código

## Entrada e shell

| Ficheiro | Função |
|----------|--------|
| `main.jsx` | Monta React em `#root`, `BrowserRouter`, `StrictMode`, CSS globais. |
| `App.jsx` | Rotas públicas/protegidas, sessão (localStorage), sidebar, `PermissionsProvider`, layout autenticado. |

## API e dados

| Caminho | Função |
|---------|--------|
| `api/client.js` | Axios, `API_BASE_URL`, modo mock vs remoto, interceptors (JWT, 401). |
| `api/index.js` | Re-exporta cliente e funções dos serviços (ponto único para `import { … } from '@/api'`). |
| `api/batmotorAdapters.js` | Normaliza JSON do backend (snake_case, ids) para o formato usado nos componentes. |
| `api/services/*.js` | Um ficheiro por domínio: `auth`, `materials`, `suppliers`, `movements`, `reports`, `users`, `profileAdmin`, `errors`. |
| `api/mock/` | Dados em memória quando `getUseMock()` é verdadeiro (`store.js`, helpers de fornecedores). |

## Estado e constantes

| Caminho | Função |
|---------|--------|
| `context/PermissionsContext.jsx` | `canManageInventory`, `canManageUsers` a partir de `accountKind`. |
| `constants/registerRoles.js` | Slugs de perfil (`ACCOUNT_KIND`, …). |
| `constants/userAvatar.js` | Chave de `localStorage` para foto de perfil. |
| `constants/registration.js` | Token esperado para registo de gestor (mock/env). |

## Utilitários

| Caminho | Função |
|---------|--------|
| `utils/cpf.js` | Normalização e validação de CPF. |
| `utils/exportXlsx.js` | Exportação XLSX para tabelas. |
| `utils/batmotorExportBrand.js` | Cabeçalho PDF/relatórios com marca BatMotor. |
| `utils/loadLegacyScripts.js` | Carrega scripts legados (jQuery, charts) do `public/assets`. |
| `utils/productImageStorage.js` | Imagens de produto em `localStorage` (quando a API não guarda ficheiros). |

## Páginas (`pages/`)

Rotas principais: `DashboardPage`, `MaterialsPage`, `ProductsPage`, `SuppliersPage`, `MovementsPage`, `ReportsPage`, `SettingsPage`, `UsersPage`; `auth/LoginPage` para login.

## Componentes (`components/`)

Inclui blocos do dashboard, modais (produto, importação), autenticação (`auth/`), seletores e peças reutilizáveis (avatar, sidebar, calendário).

## Estilos (`styles/`)

CSS global (`app.css`), texto, botões, relatórios, overrides do login, `input.CSS`.

## Assets (`assets/`)

Ícones, logos, manifestos — ficheiros binários/SVG sem lógica; nomes indicam uso.
