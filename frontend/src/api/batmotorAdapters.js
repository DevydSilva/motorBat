/**
 * =============================================================================
 * batmotorAdapters.js — CAMADA ANTI-DESALINHAMENTO (API ↔ React)
 * =============================================================================
 * O backend devolve convenções Prisma/PT (ex.: nome, estoque_minimo, usuarioPerfis).
 * Os componentes e estado local muitas vezes usam inglês curto (name, minStock).
 * Cada função map* ou normalize* aqui existe para **um só lugar** alterar quando
 * o contrato JSON mudar — evita espalhar row.nome vs row.name por dezenas de ficheiros.
 *
 * pickPrimaryBackendRole: se o utilizador tiver vários perfis, escolhe um “principal”
 * na ordem ADMIN > GERENTE > FUNCIONARIO (coerente com authorize no backend).
 * Guia: docs/GUIA_PEDAGOGICO_BATMOTOR.md
 * =============================================================================
 */

/**
 * Mongo com `.lean()` devolve `_id`; respostas após `toJSON()` no modelo usam `id`.
 * Usar sempre isto ao mapear listagens para o React.
 */
export function leanId(row) {
  if (row == null) return "";
  if (typeof row !== "object") return "";
  try {
    if (row.id != null && String(row.id).trim() !== "") return String(row.id);
    const oid = row._id;
    if (oid != null && String(oid).trim() !== "") return String(oid);
  } catch {
    return "";
  }
  return "";
}

/** [id do GlassSelect, label] — valor na BD pode ser label ou capitalização diferente. */
const SUPPLIER_TYPE_PAIRS = [
  ["fabricante", "Fabricante"],
  ["distribuidor", "Distribuidor"],
  ["atacadista", "Atacadista"],
  ["varejista", "Varejista"],
  ["servicos", "Serviços"]
];

const CATEGORY_PAIRS = [
  ["construcao", "Construção"],
  ["eletronicos", "Eletrônicos"],
  ["alimentos", "Alimentos"],
  ["escritorio", "Material de escritório"],
  ["textil", "Têxtil"],
  ["metal", "Metal"]
];

function normalizeGlassSelectValue(raw, pairs) {
  if (raw == null) return "";
  const s = String(raw).trim();
  if (s === "") return "";
  const lower = s.toLowerCase();
  for (const [id, label] of pairs) {
    if (id === s || id.toLowerCase() === lower) return id;
    if (label.toLowerCase() === lower) return id;
  }
  return s;
}

/** Prioridade para exibição quando o usuário tem vários perfis. */
export function pickPrimaryBackendRole(roles) {
  const r = Array.isArray(roles) ? roles : [];
  if (r.includes("ADMIN")) return "ADMIN";
  if (r.includes("GERENTE")) return "GERENTE";
  if (r.includes("FUNCIONARIO")) return "FUNCIONARIO";
  return "";
}

/** Extrai roles a partir de GET /users (usuarioPerfis). */
export function rolesFromUsuarioPerfis(usuarioPerfis) {
  if (!Array.isArray(usuarioPerfis)) return [];
  return usuarioPerfis.map((up) => up?.perfil?.role).filter(Boolean);
}

/**
 * @param {object} data — JSON de POST /auth/login
 */
export function normalizeAuthSuccess(data) {
  const u = data.user ?? {};
  const roles = Array.isArray(u.roles) ? u.roles : [];
  const primary = pickPrimaryBackendRole(roles);

  let accountKind = "";
  if (primary === "ADMIN") accountKind = "admin";
  else if (primary === "GERENTE") accountKind = "manager";
  else if (primary === "FUNCIONARIO") accountKind = "employee";

  const profileRole =
    primary === "ADMIN" ? "admin" : primary === "GERENTE" ? "gerente" : primary === "FUNCIONARIO" ? "funcionario" : "";

  return {
    token: data.token,
    user: {
      id: leanId(u) || u.id,
      name: u.nome ?? u.name ?? "Usuário",
      email: u.email ?? "",
      accountKind: accountKind || undefined,
      profileRole,
      roles
    }
  };
}

export function mapMaterialFromApi(row, saldo) {
  const stock = typeof saldo === "number" ? saldo : 0;
  if (row == null || typeof row !== "object") {
    return {
      id: "",
      name: "—",
      category: "",
      unit: "",
      minStock: 0,
      currentStock: stock,
      active: true,
      supplierId: "",
      observacao: "",
      costPrice: null,
      salePrice: null
    };
  }
  const fid = row.fornecedor_id;
  const pv = row.preco_venda;
  const pc = row.preco_custo;
  return {
    id: leanId(row),
    name: row.nome,
    category: row.categoria,
    unit: row.unidade,
    minStock: row.estoque_minimo,
    currentStock: stock,
    active: row.ativo !== false,
    supplierId:
      fid != null && String(fid).trim() !== "" ? String(fid) : "",
    observacao: row.observacao != null ? String(row.observacao) : "",
    costPrice: pc != null && !Number.isNaN(Number(pc)) ? Number(pc) : null,
    salePrice: pv != null && !Number.isNaN(Number(pv)) ? Number(pv) : null
  };
}

export function mapSupplierFromApi(row) {
  if (row == null || typeof row !== "object") {
    return {
      id: "",
      name: "—",
      cnpj: "",
      email: "",
      phone: "",
      contact: "",
      contactPerson: "",
      status: "inactive",
      active: false,
      city: "",
      state: "",
      address: "",
      category: "",
      code: "",
      supplierType: "",
      since: "",
      paymentTerms: "",
      notes: "",
      logoUrl: ""
    };
  }
  const phone = row.telefone ?? "";
  const email = row.email ?? "";
  const id = leanId(row);
  const contactPerson = row.nome_contato != null ? String(row.nome_contato) : "";
  const cond = row.condicoes_pagamento != null ? String(row.condicoes_pagamento) : "";
  const nl = cond.indexOf("\n");
  const paymentTerms = nl >= 0 ? cond.slice(0, nl).trim() : cond.trim();
  const paymentTerms2 = nl >= 0 ? cond.slice(nl + 1).trim() : "";
  const tipoRaw = row.tipo_fornecedor != null ? String(row.tipo_fornecedor) : "";
  const catRaw = row.categoria != null ? String(row.categoria) : "";
  return {
    id,
    name: row.nome,
    cnpj: row.cnpj ?? "",
    email,
    phone,
    contact: phone || email,
    contactPerson,
    status: row.ativo === false ? "inactive" : "active",
    active: row.ativo !== false,
    city: row.cidade != null ? String(row.cidade) : "",
    state: row.estado != null ? String(row.estado) : "",
    address: row.endereco != null ? String(row.endereco) : "",
    category: normalizeGlassSelectValue(catRaw, CATEGORY_PAIRS),
    code: id || "",
    supplierType: normalizeGlassSelectValue(tipoRaw, SUPPLIER_TYPE_PAIRS),
    since: row.data_inicio != null ? String(row.data_inicio) : "",
    paymentTerms,
    paymentTerms2,
    notes: row.observacoes != null ? String(row.observacoes) : "",
    logoUrl: row.logo_data_url != null ? String(row.logo_data_url) : ""
  };
}

export function mapMovementTypeToApi(uiType) {
  if (uiType === "IN") return "ENTRADA";
  if (uiType === "OUT") return "SAIDA";
  if (uiType === "ADJ") return "AJUSTE";
  return "ENTRADA";
}

export function mapMovementFromApi(row) {
  if (row == null || typeof row !== "object") {
    return {
      id: "",
      type: "IN",
      materialId: "",
      quantity: 0,
      notes: "",
      createdAt: undefined,
      raw: row
    };
  }
  let type = "IN";
  if (row.tipo === "SAIDA") type = "OUT";
  else if (row.tipo === "AJUSTE") type = "ADJ";
  const mid = row.materia_prima_id;
  const materialId =
    mid == null
      ? ""
      : typeof mid === "object"
        ? leanId(mid) || ""
        : String(mid);
  return {
    id: leanId(row),
    type,
    materialId,
    quantity: row.quantidade,
    notes: row.motivo ?? row.observacao ?? "",
    createdAt: row.data_atual ?? row.created_at ?? row.createdAt ?? row.updated_at ?? row.updatedAt,
    raw: row
  };
}

export function mapUserFromApi(row) {
  if (row == null || typeof row !== "object") {
    return {
      id: "",
      name: "",
      email: "",
      cpf: "",
      accountKind: "",
      profileRole: "",
      ativo: false,
      roles: []
    };
  }
  const rolesFromLinks = (row.usuarioPerfis ?? []).map((up) => up.perfil?.role).filter(Boolean);
  const roles = rolesFromLinks.length
    ? rolesFromLinks
    : Array.isArray(row.roles)
      ? row.roles.filter(Boolean)
      : [];
  const primary = pickPrimaryBackendRole(roles);
  return {
    id: leanId(row),
    name: row.nome,
    email: row.email,
    cpf: row.cpf,
    accountKind:
      primary === "ADMIN" ? "admin" : primary === "GERENTE" ? "manager" : primary === "FUNCIONARIO" ? "employee" : "",
    profileRole:
      primary === "ADMIN" ? "admin" : primary === "GERENTE" ? "gerente" : primary === "FUNCIONARIO" ? "funcionario" : "",
    ativo: row.ativo,
    roles
  };
}

export function stockSummaryFromMaterials(materials) {
  const byMaterial = materials.map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    quantity: Number(m.currentStock) || 0,
    minStock: Number(m.minStock) || 0
  }));
  return {
    totalItems: materials.length,
    totalStock: byMaterial.reduce((sum, item) => sum + item.quantity, 0),
    byMaterial
  };
}
