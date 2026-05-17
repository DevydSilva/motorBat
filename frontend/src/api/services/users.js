/**
 * Utilizadores: lista/criação/remoção alinhada a `GET/POST/DELETE /users` e CPF formatado.
 */
import { api, getUseMock } from "../client.js";
import { mockDb, mockDelay } from "../mock/store.js";
import { formatCpfDisplay, normalizeCpfDigits } from "@/utils/cpf";
import { mapUserFromApi } from "../batmotorAdapters.js";
import { toApiError } from "./errors.js";

function sanitizeUserRow(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    cpf: u.cpf ? formatCpfDisplay(u.cpf) : "",
    accountKind: u.accountKind,
    profileRole: u.profileRole,
    role: u.accountKind === "admin" ? "admin" : "staff"
  };
}

function assertMockCreateUser(payload) {
  if (payload.password !== payload.confirmPassword) {
    const err = new Error("Senhas nao coincidem");
    err.code = "VALIDATION";
    throw err;
  }
  if (normalizeCpfDigits(payload.cpf).length !== 11) {
    const err = new Error("CPF deve ter 11 digitos");
    err.code = "VALIDATION";
    throw err;
  }
}

export async function fetchUsers() {
  if (getUseMock()) {
    await mockDelay();
    return mockDb.users.map(sanitizeUserRow);
  }
  try {
    const { data } = await api.get("/users");
    const list = Array.isArray(data) ? data : [];
    return list.map((row) => sanitizeUserRow(mapUserFromApi(row)));
  } catch (e) {
    throw toApiError(e, "Não foi possível carregar os usuários.");
  }
}

function mapPerfilToMockAccount(perfilRole) {
  if (perfilRole === "GERENTE") return { accountKind: "manager", profileRole: "gerente" };
  if (perfilRole === "FUNCIONARIO") return { accountKind: "employee", profileRole: "funcionario" };
  return { accountKind: "", profileRole: "" };
}

export async function createUser(payload) {
  if (getUseMock()) {
    await mockDelay();
    assertMockCreateUser(payload);
    const email = String(payload.email || "").toLowerCase().trim();
    const cpfDigits = normalizeCpfDigits(payload.cpf);
    if (mockDb.users.some((u) => u.email === email)) {
      const err = new Error("Email ja cadastrado");
      err.code = "CONFLICT";
      throw err;
    }
    if (mockDb.users.some((u) => u.cpf === cpfDigits)) {
      const err = new Error("CPF ja cadastrado");
      err.code = "CONFLICT";
      throw err;
    }
    const pr = payload.perfil_role || payload.perfilRole;
    const mapped = mapPerfilToMockAccount(pr);
    const user = {
      id: `u${Date.now()}`,
      name: String(payload.name || "").trim(),
      email,
      password: String(payload.password || ""),
      cpf: cpfDigits,
      accountKind: mapped.accountKind,
      profileRole: mapped.profileRole
    };
    mockDb.users.unshift(user);
    return sanitizeUserRow(user);
  }
  const body = {
    nome: String(payload.name || "").trim(),
    email: String(payload.email || "").trim().toLowerCase(),
    senha: String(payload.password || ""),
    cpf: normalizeCpfDigits(payload.cpf),
    ativo: payload.ativo !== false,
    perfil_role: payload.perfil_role || payload.perfilRole
  };
  try {
    const { data } = await api.post("/users", body);
    return sanitizeUserRow(mapUserFromApi(data));
  } catch (e) {
    throw toApiError(e, "Não foi possível criar o usuário.");
  }
}

/** Exclui usuário no backend. O administrador principal (id 1) não pode ser removido. */
export async function deleteUser(userId) {
  if (getUseMock()) {
    await mockDelay();
    const id = userId;
    if (String(id) === "1" || Number(id) === 1) {
      const err = new Error("Não é permitido excluir o administrador principal do sistema.");
      err.code = "FORBIDDEN";
      throw err;
    }
    const idx = mockDb.users.findIndex((u) => String(u.id) === String(id));
    if (idx === -1) {
      const err = new Error("Usuário não encontrado.");
      err.code = "NOT_FOUND";
      throw err;
    }
    if (mockDb.users[idx].accountKind === "admin") {
      const err = new Error("Não é permitido excluir um usuário administrador.");
      err.code = "FORBIDDEN";
      throw err;
    }
    mockDb.users.splice(idx, 1);
    return { ok: true };
  }
  try {
    await api.delete(`/users/${userId}`);
    return { ok: true };
  } catch (e) {
    throw toApiError(e, "Não foi possível excluir o usuário.");
  }
}
