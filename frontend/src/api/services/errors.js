/**
 * Mensagens de erro de respostas HTTP (Axios): extrai `error` ou `message` do body JSON
 * e encapsula em `Error` para a UI tratar de forma uniforme.
 */
export function apiErrorMessage(err, fallbackMessage = "Falha na comunicação com o servidor.") {
  const data = err?.response?.data;
  if (data && typeof data.error === "string" && data.error.trim()) return data.error;
  if (data && typeof data.message === "string" && data.message.trim()) return data.message;
  if (typeof err?.message === "string" && err.message.trim()) return err.message;
  return fallbackMessage;
}

export function toApiError(err, fallbackMessage) {
  const wrapped = new Error(apiErrorMessage(err, fallbackMessage));
  wrapped.response = err?.response;
  return wrapped;
}
