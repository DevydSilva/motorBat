/**
 * @file Rodapé da sidebar com avatar, atalhos e logout.
 */
import { NavLink } from "react-router-dom";
import PillAvatar from "./PillAvatar";

/**
 * Rodapé da sidebar: saudação, pílula de atalhos (avatar → Sistema) e sair à parte.
 */
function SidebarFooterTray({ userName, profileRole, userPhotoDataUrl, onLogout }) {
  const first = userName?.trim().split(/\s+/)[0] || "usuario";
  const itemClass = ({ isActive }) =>
    `sidebar-footer-tray__btn${isActive ? " is-active" : ""}`;

  return (
    <footer className="sidebar-footer">
      <div className="sidebar-footer-tray">
        <p className="sidebar-footer-tray__greet">
          Olá, <strong className="sidebar-footer-tray__name-accent">{first}</strong>
        </p>

        <div className="sidebar-footer-tray__nav-row">
          <nav className="sidebar-footer-tray__pill" aria-label="Atalhos rápidos">
            <NavLink
              to="/sistema"
              title="Perfil e sistema"
              className={({ isActive }) =>
                `sidebar-footer-tray__btn sidebar-footer-tray__btn--avatar${isActive ? " is-active" : ""}`
              }
            >
              <PillAvatar profileRole={profileRole} userPhotoDataUrl={userPhotoDataUrl} />
            </NavLink>
            <NavLink to="/sistema" className={itemClass} title="Sistema">
              <i className="ri-settings-3-line" aria-hidden />
            </NavLink>
            <NavLink to="/relatorios" className={itemClass} title="Relatórios">
              <i className="ri-file-chart-line" aria-hidden />
            </NavLink>
            <NavLink to="/materias-primas" className={itemClass} title="Materiais">
              <i className="ri-box-3-line" aria-hidden />
            </NavLink>
            <NavLink to="/movimentacoes" className={itemClass} title="Movimentações">
              <i className="ri-smartphone-line" aria-hidden />
            </NavLink>
          </nav>
          <button
            type="button"
            className="sidebar-footer-tray__logout-standalone"
            onClick={onLogout}
            title="Sair"
          >
            <i className="ri-shut-down-line" aria-hidden />
          </button>
        </div>

        <p className="sidebar-footer-tray__role" title={userName}>
          {userName}
        </p>
      </div>
    </footer>
  );
}

export default SidebarFooterTray;
