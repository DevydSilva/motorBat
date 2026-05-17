/**
 * Avatares em PNG: coloque os arquivos em frontend/public/assets/avatars/
 * Nome do arquivo = id do perfil (igual ao cadastro) + .png
 *
 * Ex.: gerente.png, encarregado.png, almoxarife_operacional.png, auxiliar_almoxarifado.png
 * Opcional: default.png — usado quando não há profileRole ou o arquivo do perfil não existe.
 *
 * Foto do usuário (perfil): data URL em localStorage por utilizador (`batmotor-user-avatar:<id>`),
 * para sobreviver ao logout. Chave global legada `batmotor-user-avatar` é migrada ao ler.
 */
const BASE = "/assets/avatars";

export const USER_AVATAR_STORAGE_KEY = "batmotor-user-avatar";

/** @param {string|null|undefined} userId */
export function getUserAvatarStorageKey(userId) {
  const id = userId != null && String(userId).trim() ? String(userId).trim() : "";
  return id ? `${USER_AVATAR_STORAGE_KEY}:${id}` : null;
}

/**
 * Lê a foto guardada para o utilizador; migra `batmotor-user-avatar` global para a chave por id.
 * @param {string|null|undefined} userId
 */
export function loadUserAvatarFromStorage(userId) {
  const key = getUserAvatarStorageKey(userId);
  if (key) {
    const direct = localStorage.getItem(key);
    if (direct) return direct;
    try {
      const legacy = localStorage.getItem(USER_AVATAR_STORAGE_KEY);
      if (legacy) {
        localStorage.setItem(key, legacy);
        localStorage.removeItem(USER_AVATAR_STORAGE_KEY);
        return legacy;
      }
    } catch {
      /* quota / private mode */
    }
    return "";
  }
  try {
    return localStorage.getItem(USER_AVATAR_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

/**
 * @param {string|null|undefined} userId
 * @param {string|null|undefined} avatarDataUrl — null remove; undefined não altera armazenamento
 */
export function persistUserAvatarToStorage(userId, avatarDataUrl) {
  if (avatarDataUrl === undefined) return;
  const key = getUserAvatarStorageKey(userId);
  try {
    if (avatarDataUrl === null) {
      if (key) localStorage.removeItem(key);
      localStorage.removeItem(USER_AVATAR_STORAGE_KEY);
      return;
    }
    if (!avatarDataUrl) return;
    if (key) {
      localStorage.setItem(key, avatarDataUrl);
      localStorage.removeItem(USER_AVATAR_STORAGE_KEY);
    } else {
      localStorage.setItem(USER_AVATAR_STORAGE_KEY, avatarDataUrl);
    }
  } catch {
    /* ignore */
  }
}

export function resolveAvatarUrl(profileRole) {
  const slug = profileRole && String(profileRole).trim() ? profileRole.trim() : "default";
  return `${BASE}/${slug}.png`;
}

/** URL exibida no avatar: foto do perfil ou imagem do cargo. */
export function resolveDisplayAvatarUrl(profileRole, userPhotoDataUrl) {
  const custom = userPhotoDataUrl && String(userPhotoDataUrl).trim();
  if (custom) return custom;
  return resolveAvatarUrl(profileRole);
}


