/**
 * Base de dados fictícia em memória quando o frontend usa modo local (sem backend).
 * Contém utilizadores, materiais, fornecedores, movimentos — alimenta os services em `getUseMock()`.
 */
export const mockDb = {
  users: [
    {
      id: "u-seed-1",
      name: "Mei Ling",
      email: "mei@batmotor.com",
      password: "demo123",
      cpf: "52998224725",
      accountKind: "admin",
      profileRole: "gerente",
      roles: ["ADMIN"]
    },
    {
      id: "u-seed-2",
      name: "Carlos Souza",
      email: "carlos@batmotor.com",
      password: "demo123",
      cpf: "39053344705",
      accountKind: "employee",
      profileRole: "almoxarife_operacional",
      roles: ["FUNCIONARIO"]
    },
    {
      id: "u-seed-3",
      name: "Ana Ribeiro",
      email: "ana@batmotor.com",
      password: "demo123",
      cpf: "44387251239",
      accountKind: "employee",
      profileRole: "auxiliar_almoxarifado",
      roles: ["FUNCIONARIO"]
    }
  ],
  materials: [
    { id: "m1", name: "Litio Grau A", category: "Metal", unit: "kg", minStock: 10, currentStock: 4, supplierId: "s1", active: true },
    { id: "m2", name: "Cobre Laminado", category: "Metal", unit: "kg", minStock: 20, currentStock: 18, supplierId: "s2", active: true },
    { id: "m3", name: "Niquel Puro", category: "Metal", unit: "kg", minStock: 15, currentStock: 32, supplierId: "s1", active: true },
    { id: "m4", name: "Eletronico BMS", category: "Eletronico", unit: "un", minStock: 5, currentStock: 2, supplierId: "s3", active: true },
    { id: "m5", name: "Grafite Industrial", category: "Carbono", unit: "kg", minStock: 8, currentStock: 14, supplierId: "s2", active: false },
    { id: "m6", name: "Polimero ABS", category: "Polimero", unit: "kg", minStock: 12, currentStock: 25, supplierId: "s3", active: true }
  ],
  suppliers: [
    {
      id: "s1",
      code: "FOR-001",
      name: "Neo Metals",
      cnpj: "12.345.678/0001-10",
      contactPerson: "Joao Paulo Pessoa",
      email: "joaopaulo@neometals.com",
      phone: "+55 (11) 99999-1001",
      contact: "(11) 99999-1001",
      status: "active",
      supplierType: "fabricante",
      category: "metal",
      address: "Av. Industrial, 500",
      city: "Sao Paulo",
      state: "SP",
      since: "2022-03-15",
      paymentTerms: "30 dias",
      notes: "",
      active: true
    },
    {
      id: "s2",
      code: "FOR-002",
      name: "CopperBase",
      cnpj: "23.456.789/0001-20",
      contactPerson: "Maria Costa",
      email: "maria@copperbase.com",
      phone: "+55 (21) 98888-2002",
      contact: "(11) 99999-2002",
      status: "inactive",
      supplierType: "distribuidor",
      category: "metal",
      address: "",
      city: "Rio de Janeiro",
      state: "RJ",
      since: "2021-08-01",
      paymentTerms: "45 dias",
      notes: "",
      active: false
    },
    {
      id: "s3",
      code: "FOR-003",
      name: "Power Cell",
      cnpj: "34.567.890/0001-30",
      contactPerson: "Carlos Energia",
      email: "carlos@powercell.com",
      phone: "+55 (11) 97777-3003",
      contact: "(11) 99999-3003",
      status: "pending",
      supplierType: "atacadista",
      category: "eletronicos",
      address: "Rua das Baterias, 120",
      city: "Campinas",
      state: "SP",
      since: "",
      paymentTerms: "",
      notes: "Homologacao em andamento",
      active: true
    }
  ],
  movements: []
};

export function mockDelay(ms = 150) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function mockStockSummary() {
  const byMaterial = mockDb.materials.map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    quantity: Number(m.currentStock) || 0,
    minStock: Number(m.minStock) || 0
  }));
  return {
    totalItems: mockDb.materials.length,
    totalStock: byMaterial.reduce((sum, item) => sum + item.quantity, 0),
    byMaterial
  };
}
