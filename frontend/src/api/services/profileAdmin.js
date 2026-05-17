/**
 * Chamadas administrativas auxiliares: perfis (`/perfil`), utilizador por id, etc.
 */
import { api, getUseMock } from "../client.js";
import { toApiError } from "./errors.js";

/** GET /perfil — admin only */
export async function fetchPerfis() {
  if (getUseMock()) return [];
  const { data } = await api.get("/perfil");
  return Array.isArray(data) ? data : [];
}

/** GET /users/:id */
export async function fetchUserById(id) {
  if (getUseMock()) return null;
  const { data } = await api.get(`/users/${id}`);
  return data;
}

/** PATCH /users/me — usuário autenticado (funcionário: só nome; gerente/admin: nome, e-mail, senha) */
export async function updateUsuarioMe(body) {
  if (getUseMock()) return null;
  try {
    const { data } = await api.patch("/users/me", body);
    return data;
  } catch (e) {
    throw toApiError(e, "Não foi possível atualizar o perfil.");
  }
}

/** PUT /users/:id — admin only */
export async function updateUsuario(id, body) {
  if (getUseMock()) return null;
  try {
    const { data } = await api.put(`/users/${id}`, body);
    return data;
  } catch (e) {
    throw toApiError(e, "Não foi possível atualizar o usuário.");
  }
}

/** PUT /user-perfil/:usuario_id/:perfil_id — admin only */
export async function updateUsuarioPerfilLink(usuarioId, perfilIdAntigo, novoPerfilId) {
  if (getUseMock()) return null;
  try {
    const { data } = await api.put(`/user-perfil/${usuarioId}/${perfilIdAntigo}`, {
      novo_perfil_id: novoPerfilId
    });
    return data;
  } catch (e) {
    throw toApiError(e, "Não foi possível atualizar o vínculo de perfil.");
  }
}

/** POST /user-perfil — admin only */
export async function createUsuarioPerfilLink(usuarioId, perfilId) {
  if (getUseMock()) return null;
  try {
    const { data } = await api.post("/user-perfil", {
      usuario_id: usuarioId,
      perfil_id: perfilId
    });
    return data;
  } catch (e) {
    throw toApiError(e, "Não foi possível vincular o perfil.");
  }
}
