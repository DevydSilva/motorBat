/**
 * Fornecedores: `GET/POST/PUT/DELETE /fornecedores` (remoto) ou lista mock com normalização.
 */
import { api, getUseMock } from "../client.js";
import { mockDb, mockDelay } from "../mock/store.js";
import { mockNormalizeSupplier, mockNextSupplierCode } from "../mock/suppliers.js";
import { mapSupplierFromApi } from "../batmotorAdapters.js";
import { toApiError } from "./errors.js";

function combinePaymentTerms(payload) {
  const terms = [payload.paymentTerms, payload.paymentTerms2]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);
  return terms.length ? terms.join("\n") : null;
}

export async function fetchSuppliers() {
  if (getUseMock()) {
    await mockDelay();
    return mockDb.suppliers.map((s, i) => mockNormalizeSupplier(s, i));
  }
  try {
    const { data } = await api.get("/fornecedores");
    const list = (Array.isArray(data) ? data : []).filter((row) => row != null && typeof row === "object");
    return list.map(mapSupplierFromApi);
  } catch (e) {
    throw toApiError(e, "Não foi possível carregar a lista de fornecedores.");
  }
}

export async function fetchSupplierById(id) {
  if (getUseMock()) {
    await mockDelay();
    const i = mockDb.suppliers.findIndex((s) => String(s.id) === String(id));
    if (i === -1) throw new Error("Fornecedor nao encontrado");
    return mockNormalizeSupplier(mockDb.suppliers[i], i);
  }
  try {
    const { data } = await api.get(`/fornecedores/${id}`);
    return mapSupplierFromApi(data);
  } catch (e) {
    throw toApiError(e, "Não foi possível carregar os dados do fornecedor.");
  }
}

export async function createSupplier(payload) {
  if (getUseMock()) {
    await mockDelay();
    const phone = payload.phone || payload.contact || "";
    const email = payload.email || "";
    let status = payload.status || "pending";
    if (payload.active === false) status = "inactive";
    else if (payload.active === true && status === "inactive") status = "active";

    const newRow = {
      id: `s${Date.now()}`,
      code: mockNextSupplierCode(),
      name: payload.name,
      cnpj: payload.cnpj ?? "",
      contactPerson: payload.contactPerson ?? "",
      email,
      phone,
      contact: phone || email || payload.contact || "",
      status,
      supplierType: payload.supplierType ?? "",
      category: payload.category ?? "",
      address: payload.address ?? "",
      city: payload.city ?? "",
      state: payload.state ?? "",
      since: payload.since ?? "",
      paymentTerms: payload.paymentTerms ?? "",
      notes: payload.notes ?? "",
      logoUrl: payload.logoUrl ?? "",
      active: payload.active !== false
    };
    mockDb.suppliers.unshift(newRow);
    return mockNormalizeSupplier(newRow, 0);
  }
  const cnpjDigits = String(payload.cnpj || "").replace(/\D/g, "");
  if (cnpjDigits.length !== 14) {
    throw new Error("CNPJ deve ter exatamente 14 dígitos.");
  }
  const body = {
    nome: String(payload.name || "").trim(),
    cnpj: cnpjDigits,
    email: payload.email || undefined,
    telefone: (payload.phone || payload.contact || "").replace(/\D/g, "") || undefined,
    nome_contato: payload.contactPerson?.trim() || null,
    endereco: payload.address?.trim() || null,
    cidade: payload.city?.trim() || null,
    estado: payload.state?.trim() || null,
    categoria: payload.category?.trim() || null,
    tipo_fornecedor: payload.supplierType?.trim() || null,
    data_inicio: payload.since?.trim() || null,
    condicoes_pagamento: combinePaymentTerms(payload),
    observacoes: payload.notes?.trim() || null
  };
  if (payload.logoUrl !== undefined) {
    const u = payload.logoUrl;
    body.logo_data_url =
      u == null || String(u).trim() === "" ? null : String(u).trim();
  }
  if (payload.active !== undefined) body.ativo = Boolean(payload.active);
  try {
    const { data } = await api.post("/fornecedores", body);
    return mapSupplierFromApi(data);
  } catch (e) {
    throw toApiError(e, "Não foi possível cadastrar o fornecedor.");
  }
}

export async function updateSupplier(id, payload) {
  if (getUseMock()) {
    await mockDelay();
    const i = mockDb.suppliers.findIndex((s) => s.id === id);
    if (i === -1) throw new Error("Fornecedor nao encontrado");
    const prev = mockDb.suppliers[i];
    const merged = mockNormalizeSupplier({ ...prev, ...payload, id }, i);
    if (payload.active === false) merged.status = "inactive";
    if (payload.active === true && merged.status === "inactive") merged.status = "active";
    mockDb.suppliers[i] = { ...merged };
    return merged;
  }
  const body = {};
  if (payload.name !== undefined) body.nome = payload.name;
  if (payload.email !== undefined) body.email = payload.email;
  if (payload.phone !== undefined || payload.contact !== undefined) {
    body.telefone = String(payload.phone || payload.contact || "").replace(/\D/g, "") || undefined;
  }
  if (payload.active !== undefined) body.ativo = Boolean(payload.active);
  if (payload.contactPerson !== undefined) {
    body.nome_contato = payload.contactPerson?.trim() || null;
  }
  if (payload.address !== undefined) body.endereco = payload.address?.trim() || null;
  if (payload.city !== undefined) body.cidade = payload.city?.trim() || null;
  if (payload.state !== undefined) body.estado = payload.state?.trim() || null;
  if (payload.category !== undefined) body.categoria = payload.category?.trim() || null;
  if (payload.supplierType !== undefined) {
    body.tipo_fornecedor = payload.supplierType?.trim() || null;
  }
  if (payload.since !== undefined) body.data_inicio = payload.since?.trim() || null;
  if (payload.paymentTerms !== undefined || payload.paymentTerms2 !== undefined) {
    body.condicoes_pagamento = combinePaymentTerms(payload);
  }
  if (payload.notes !== undefined) body.observacoes = payload.notes?.trim() || null;
  if (payload.logoUrl !== undefined) {
    const u = payload.logoUrl;
    body.logo_data_url =
      u == null || String(u).trim() === "" ? null : String(u).trim();
  }
  try {
    const { data } = await api.put(`/fornecedores/${id}`, body);
    return mapSupplierFromApi(data);
  } catch (e) {
    throw toApiError(e, "Não foi possível atualizar o fornecedor.");
  }
}

export async function deleteSupplier(id) {
  if (getUseMock()) {
    await mockDelay();
    const i = mockDb.suppliers.findIndex((s) => s.id === id);
    if (i === -1) throw new Error("Fornecedor nao encontrado");
    mockDb.suppliers.splice(i, 1);
    mockDb.materials.forEach((m) => {
      if (m.supplierId === id) m.supplierId = null;
    });
    return { ok: true };
  }
  try {
    await api.delete(`/fornecedores/${id}`);
  } catch (e) {
    throw toApiError(e, "Não foi possível excluir o fornecedor.");
  }
  return { ok: true };
}
