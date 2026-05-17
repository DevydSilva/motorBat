/**
 * No Painel: lista atalhos para os itens do menu principal conforme o texto da pesquisa global do cabeçalho.
 */
import { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { useHeaderSearch } from "@/context/HeaderSearchContext";
import { usePermissions } from "@/context/PermissionsContext";
import { getMainMenuNavItemsForSearch } from "@/constants/mainMenuNav";
import { isGenericDashboardPanelQuery, rowMatchesQuery } from "@/utils/searchMatch.js";

export default function DashboardMenuSearchShortcuts() {
  const { query } = useHeaderSearch();
  const { canManageUsers } = usePermissions();
  const q = query.trim();

  const items = useMemo(
    () => getMainMenuNavItemsForSearch({ canManageUsers }),
    [canManageUsers]
  );

  const matched = useMemo(() => {
    if (!q) return [];
    if (isGenericDashboardPanelQuery(query)) return items;
    return items.filter((it) =>
      rowMatchesQuery(query, [it.label, it.to, ...(it.keywords || [])])
    );
  }, [q, query, items]);

  if (!q) return null;

  return (
    <section
      className="card border-0 shadow-sm mb-4 dashboard-menu-search-shortcuts"
      aria-label="Resultados da pesquisa no menu"
    >
      <div className="card-body py-3 px-3 px-sm-4">
        <h2 className="h6 mb-2 text-body">Menu principal — atalhos</h2>
        <p className="small text-muted mb-3 mb-md-2">
          Escolha uma área para abrir. O mesmo texto filtra a tabela de stock no fim desta página.
        </p>
        {matched.length === 0 ? (
          <p className="text-muted small mb-0">
            Nenhum item do menu corresponde a &quot;{q}&quot;. Experimente: Produtos, Estoque, Fornecedores…
          </p>
        ) : (
          <ul className="list-unstyled mb-0 row g-2">
            {matched.map((it) => (
              <li key={it.to} className="col-12 col-sm-6 col-lg-4">
                <NavLink
                  to={it.to}
                  end={it.to === "/"}
                  className={({ isActive }) =>
                    `dashboard-menu-search-shortcuts__link d-flex align-items-center gap-2 px-3 py-2 rounded border text-decoration-none${
                      isActive ? " is-active" : ""
                    }`
                  }
                >
                  <i className={`${it.icon} dashboard-menu-search-shortcuts__icon`} aria-hidden />
                  <span className="fw-semibold">{it.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
