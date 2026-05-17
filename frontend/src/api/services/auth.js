/**
 * Autenticação: `loginRequest` chama `POST /auth/login` no modo remoto ou valida contra `mock/store`.
 * Resposta normalizada com `normalizeAuthSuccess` (token + utilizador + roles).
 */
import { api, getUseMock } from "../client.js";
import { mockDb, mockDelay } from "../mock/store.js";
import { normalizeAuthSuccess } from "../batmotorAdapters.js";
import { toApiError } from "./errors.js";

function mockRolesForUser(mockUser) {
  if (Array.isArray(mockUser.roles) && mockUser.roles.length) return mockUser.roles;
  if (mockUser.accountKind === "admin") return ["ADMIN"];
  return ["FUNCIONARIO"];
}

export async function loginRequest(email, password) {
  const emailNorm = String(email || "").trim().toLowerCase();
  if (getUseMock()) {
    await mockDelay();
    const mockUser = mockDb.users.find((u) => String(u.email || "").toLowerCase() === emailNorm);
    if (mockUser) {
      if (mockUser.password !== password) {
        throw new Error("Credenciais invalidas");
      }
      const roles = mockRolesForUser(mockUser);
      return normalizeAuthSuccess({
        token: "mock-token",
        user: {
          id: mockUser.id,
          nome: mockUser.name,
          email: mockUser.email,
          roles
        }
      });
    }
    throw new Error("Credenciais invalidas");
  }
  try {
    const { data } = await api.post("/auth/login", {
      email: emailNorm,
      senha: password
    });
    return normalizeAuthSuccess(data);
  } catch (e) {
    throw toApiError(e, "Falha no login.");
  }
}
