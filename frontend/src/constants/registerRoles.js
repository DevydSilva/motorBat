/** Perfis de cadastro conforme regra do cliente. */

export const ACCOUNT_KIND = {
  employee: "employee",
  admin: "admin",
  /** Alinhado ao backend: perfil GERENTE. */
  manager: "manager"
};

/** Funcionário: almoxarifado */
export const EMPLOYEE_ROLES = [
  { id: "almoxarife_operacional", label: "Almoxarife operacional", hint: "Gestão operacional do estoque" },
  { id: "auxiliar_almoxarifado", label: "Auxiliar de almoxarifado", hint: "Apoio em recebimento e organização" }
];

/** Administrador: encarregado, gerente */
export const ADMIN_ROLES = [
  { id: "encarregado", label: "Encarregado", hint: "Liderança da equipe e da rotina" },
  { id: "gerente", label: "Gerente", hint: "Gestão da área e indicadores" }
];

export const EMPLOYEE_ROLE_IDS = EMPLOYEE_ROLES.map((r) => r.id);
export const ADMIN_ROLE_IDS = ADMIN_ROLES.map((r) => r.id);
