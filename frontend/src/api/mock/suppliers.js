/**
 * Helpers só para mock: códigos de fornecedor sequenciais e normalização de linhas.
 */
import { mockDb } from "./store.js";

export function mockNextSupplierCode() {
  const nums = mockDb.suppliers
    .map((s) => {
      const m = String(s.code || "").match(/(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => n > 0);
  const n = nums.length ? Math.max(...nums) + 1 : mockDb.suppliers.length + 1;
  return `FOR-${String(n).padStart(3, "0")}`;
}

export function mockNormalizeSupplier(raw, index) {
  const phone = raw.phone || (raw.contact && !String(raw.contact).includes("@") ? raw.contact : "");
  const email =
    raw.email || (raw.contact && String(raw.contact).includes("@") ? raw.contact : "") || "";
  let status = raw.status;
  if (!status) {
    status = email || phone ? "active" : "pending";
  }
  if (raw.active === false) status = "inactive";
  return {
    id: raw.id,
    code: raw.code || `FOR-${String(index + 1).padStart(3, "0")}`,
    name: raw.name,
    cnpj: raw.cnpj ?? "",
    contactPerson: raw.contactPerson ?? "",
    email,
    phone,
    contact: raw.contact || phone || email || "",
    status,
    supplierType: raw.supplierType ?? "",
    category: raw.category ?? "",
    address: raw.address ?? "",
    city: raw.city ?? "",
    state: raw.state ?? "",
    since: raw.since ?? "",
    paymentTerms: raw.paymentTerms ?? "",
    notes: raw.notes ?? "",
    logoUrl: raw.logoUrl ?? "",
    active: raw.active !== false
  };
}
