/**
 * Movimentações de stock: `GET /movimentacao`, `POST /movimentacao` com tipos mapeados para a API.
 */
import { api, getUseMock } from "../client.js";
import { mockDb, mockDelay } from "../mock/store.js";
import { mapMovementFromApi, mapMovementTypeToApi } from "../batmotorAdapters.js";
import { toApiError } from "./errors.js";

export async function fetchMovements(query = {}) {
  if (getUseMock()) {
    await mockDelay();
    return [...mockDb.movements];
  }
  const { data } = await api.get("/movimentacao", { params: query });
  const list = (Array.isArray(data) ? data : []).filter((row) => row != null && typeof row === "object");
  return list.map(mapMovementFromApi);
}

export async function createMovement(payload) {
  if (getUseMock()) {
    await mockDelay();
    const movement = {
      id: `mv${Date.now()}`,
      type: payload.type,
      materialId: payload.materialId,
      quantity: Number(payload.quantity) || 0,
      notes: payload.notes || "",
      createdAt: payload.createdAt ? new Date(payload.createdAt).toISOString() : new Date().toISOString()
    };
    mockDb.movements.unshift(movement);

    const target = mockDb.materials.find((m) => m.id === payload.materialId);
    if (target) {
      const qty = Number(payload.quantity) || 0;
      if (payload.type === "OUT") {
        target.currentStock = Math.max(0, target.currentStock - qty);
      } else if (payload.type === "IN") {
        target.currentStock += qty;
      } else if (payload.type === "ADJ") {
        target.currentStock = Math.max(0, target.currentStock + qty);
      }
    }

    return movement;
  }
  const body = {
    materia_prima_id: String(payload.materialId || "").trim(),
    tipo: mapMovementTypeToApi(payload.type || "IN"),
    quantidade: Number(payload.quantity) || 0
  };
  if (!body.materia_prima_id) {
    throw new Error("Selecione um material válido para registrar a movimentação.");
  }
  const notes = String(payload.notes || "").trim();
  if (notes) body.motivo = notes;

  try {
    const { data } = await api.post("/movimentacao", body);
    return mapMovementFromApi(data);
  } catch (e) {
    throw toApiError(e, "Não foi possível registrar a movimentação.");
  }
}
