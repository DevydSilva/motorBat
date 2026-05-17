/**
 * =============================================================================
 * api/index.js — “BARREIRA” ENTRE UI E DADOS
 * =============================================================================
 * Todas as páginas importam daqui (`import { fetchX } from '@/api'`) em vez de repetir URLs.
 *
 * Dois modos de operação (ver `client.js` → getUseMock()):
 *   1) MOCK / LOCAL — sem backend; serviços usam `mock/store.js` (útil em demo ou aula sem MySQL).
 *   2) REMOTO — axios envia pedidos para API_BASE_URL (Vite: VITE_API_URL) com JWT no header.
 *
 * Estrutura de pastas:
 *   client.js     → instância axios, interceptors (token; redirect se 401).
 *   services/*.js → uma área funcional por ficheiro (auth, materials, reports, …).
 *   mock/*        → só carregado pelos services quando getUseMock() === true.
 *   batmotorAdapters.js → converte JSON do backend (snake_case / IDs) para objetos que os componentes esperam.
 *
 * Guia do professor: docs/GUIA_PEDAGOGICO_BATMOTOR.md
 * =============================================================================
 */

export {
  api,
  API_BASE_URL,
  USE_MOCK_FROM_ENV,
  getUseMock,
  setApiMode,
  clearApiModePreference,
  getApiModePreference,
  getResolvedApiMode
} from "./client.js";

export { loginRequest } from "./services/auth.js";
export { fetchMaterials, createMaterial, updateMaterial, deleteMaterial } from "./services/materials.js";
export { fetchSuppliers, fetchSupplierById, createSupplier, updateSupplier, deleteSupplier } from "./services/suppliers.js";
export { fetchMovements, createMovement } from "./services/movements.js";
export {
  fetchMinStockAlerts,
  fetchStockSummary,
  fetchMovimentacoesPorDia,
  sendLowStockAlertEmail
} from "./services/reports.js";
export { fetchUsers, createUser, deleteUser } from "./services/users.js";
