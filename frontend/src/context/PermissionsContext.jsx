/**
 * =============================================================================
 * PermissionsContext — permissões derivadas do “tipo de conta”
 * =============================================================================
 * O backend devolve roles (ADMIN / GERENTE / FUNCIONARIO); o login adapter grava em localStorage
 * um campo simplificado `accountKind`: "admin" | "manager" | "employee".
 *
 * Estas flags evitam repetir `if (accountKind === 'admin' || …)` em cada botão:
 *   canManageInventory — importar/exportar/editar inventário, relatórios sensíveis, etc.
 *   canManageUsers     — menu “Usuários” e operações equivalentes.
 *
 * Funcionário: ambas false para UI restrita; admin e gerente: true.
 * Context API: Provider envolve a árvore em App.jsx; `usePermissions()` lê o valor em qualquer filho.
 * =============================================================================
 */
import { createContext, useContext, useMemo } from "react";
import { ACCOUNT_KIND } from "@/constants/registerRoles";

const PermissionsContext = createContext({
  accountKind: "",
  canManageInventory: false,
  canManageUsers: false
});

export function PermissionsProvider({ accountKind = "", children }) {
  const value = useMemo(() => {
    const admin = accountKind === ACCOUNT_KIND.admin;
    const manager = accountKind === ACCOUNT_KIND.manager;
    const elevated = admin || manager;
    return {
      accountKind,
      canManageInventory: elevated,
      canManageUsers: elevated
    };
  }, [accountKind]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
