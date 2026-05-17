/**
 * =============================================================================
 * client.js — Axios + modo mock + sessão
 * =============================================================================
 * API_BASE_URL: Vite injeta `import.meta.env.VITE_API_URL` no build; fallback localhost:3000.
 *
 * getUseMock(): true → os services NÃO chamam a rede (dados fictícios).
 * Interceptor request: se existir `batmotor-token` no localStorage, adiciona
 *   Authorization: Bearer <token>  — cada vírgula e espaço no header segue o padrão HTTP.
 * Interceptor response: status 401 (não autorizado) limpa sessão e manda o browser para /login,
 *   exceto quando a própria chamada era o login (para mostrar “credenciais inválidas”).
 * =============================================================================
 */
import axios from "axios";

const FALLBACK_API = "http://localhost:3000";
const rawUrl = import.meta.env.VITE_API_URL;
const trimmed =
  typeof rawUrl === "string" && rawUrl.trim() ? rawUrl.trim().replace(/\/+$/, "") : "";
export const API_BASE_URL = trimmed || FALLBACK_API;

if (import.meta.env.PROD && API_BASE_URL === FALLBACK_API) {
  console.warn(
    "[BatMotor] VITE_API_URL não está definida no build de produção; a usar localhost. " +
      "Defina VITE_API_URL no painel do host (ou em .env.production) com a URL HTTPS da API."
  );
}

const API_MODE_STORAGE_KEY = "batmotor-api-mode";

/**
 * Padrão vindo do build (.env). Usado só quando o usuário não marcou preferência na tela de login.
 * @deprecated Para saber se o mock está ativo agora, use getUseMock().
 */
export const USE_MOCK_FROM_ENV = (import.meta.env.VITE_USE_MOCK ?? "true") === "true";

/** @returns {"local" | "remote" | null} */
export function getApiModePreference() {
  try {
    const v = localStorage.getItem(API_MODE_STORAGE_KEY);
    if (v === "local" || v === "remote") return v;
  } catch {
    /* ignore */
  }
  return null;
}

/** Persiste escolha do usuário: local = dados fictícios (sem backend), remote = API HTTP. */
export function setApiMode(mode) {
  if (mode !== "local" && mode !== "remote") return;
  try {
    localStorage.setItem(API_MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

/** Volta a seguir só o .env (remove preferência da tela). */
export function clearApiModePreference() {
  try {
    localStorage.removeItem(API_MODE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Mock em memória ativo? Respeita primeiro a escolha na tela, depois VITE_USE_MOCK. */
export function getUseMock() {
  const pref = getApiModePreference();
  if (pref === "local") return true;
  if (pref === "remote") return false;
  return USE_MOCK_FROM_ENV;
}

/** Modo efetivo atual (para UI). */
export function getResolvedApiMode() {
  return getUseMock() ? "local" : "remote";
}

export function clearSessionStorage() {
  const keys = [
    "batmotor-token",
    "batmotor-user",
    "batmotor-user-id",
    "batmotor-account-kind",
    "batmotor-profile-role",
    "batmotor-email"
  ];
  try {
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("batmotor-token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Sessão expirada ou token inválido: volta ao login (exceto na própria tentativa de login). */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    if (status !== 401) return Promise.reject(err);
    const url = String(err.config?.url || "");
    if (url.includes("auth/login")) return Promise.reject(err);
    clearSessionStorage();
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem("batmotor-session-expired", String(Date.now()));
      } catch {
        /* ignore */
      }
    }
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.assign("/login");
    }
    return Promise.reject(err);
  }
);
