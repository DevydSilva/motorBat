/**
 * Secção inferior do dashboard: atividades recentes e links rápidos (UI estática + dados injectados).
 */
import { Link } from "react-router-dom";

const RECENT_ACTIVITIES = [
  {
    key: "1",
    icon: "ri-user-add-line",
    tone: "blue",
    title: "Novo fornecedor",
    subtitle: "John Doe - 2 horas atrás"
  },
  {
    key: "2",
    icon: "ri-shopping-cart-line",
    tone: "green",
    title: "Compra realizada",
    subtitle: "Order #456 - 4 horas atrás"
  },
  {
    key: "3",
    icon: "ri-message-3-line",
    tone: "purple",
    title: "Nova mensagem",
    subtitle: "Product X - 6 horas atrás"
  },
  {
    key: "4",
    icon: "ri-notification-3-line",
    tone: "yellow",
    title: "Atualização do sistema",
    subtitle: "Version 2.3.5 - 1 dia atrás"
  }
];

const PRODUCT_ICON_ROTATION = ["blue", "purple", "yellow", "green"];

function formatSku(id) {
  const n = Number(id);
  if (Number.isFinite(n)) return String(n).padStart(4, "0");
  const digits = String(id).replace(/\D/g, "");
  return (digits.slice(-4) || "1000").padStart(4, "0");
}

function formatProductCode(id, index) {
  const n = Number(id);
  if (Number.isFinite(n)) return `PRD-${String(n).padStart(3, "0")}`;
  return `PRD-${String(index + 1).padStart(3, "0")}`;
}

/** Alinha rótulos de status e % da barra ao estilo da referência (Estável / Crítico / Atenção). */
function stockStatusVisual(quantity, minStock) {
  const q = Number(quantity) || 0;
  const m = Number(minStock) || 0;
  if (m <= 0) {
    if (q <= 0) {
      return { label: "Crítico", variant: "critico", barPct: 10 };
    }
    return { label: "Estável", variant: "estavel", barPct: Math.min(88, 52 + Math.min(30, Math.round(q / 2))) };
  }
  const ratio = q / m;
  if (ratio < 1) {
    return {
      label: "Crítico",
      variant: "critico",
      barPct: Math.max(8, Math.min(16, Math.round(ratio * 14)))
    };
  }
  if (ratio < 2) {
    return {
      label: "Atenção",
      variant: "atencao",
      barPct: Math.min(42, Math.round(22 + ratio * 9))
    };
  }
  return {
    label: "Estável",
    variant: "estavel",
    barPct: Math.min(90, Math.round(52 + Math.min(38, ratio * 6)))
  };
}

function RecentActivitiesCard() {
  return (
    <div className="card mb-0 dashboard-panel dashboard-panel--light h-100">
      <div className="card-header dashboard-panel__head border-0 pb-0">
        <h5 className="card-title mb-0 dashboard-panel__title-flat">Atividades recentes</h5>
      </div>
      <div className="card-body pt-3">
        <ul className="dashboard-recent-activity list-unstyled mb-0">
          {RECENT_ACTIVITIES.map((item) => (
            <li key={item.key} className="dashboard-recent-activity__item">
              <span
                className={`dashboard-recent-activity__icon dashboard-recent-activity__icon--${item.tone}`}
                aria-hidden
              >
                <i className={item.icon} />
              </span>
              <div className="dashboard-recent-activity__text">
                <span className="dashboard-recent-activity__title">{item.title}</span>
                <span className="dashboard-recent-activity__meta">{item.subtitle}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StockStatusCard({ rows }) {
  const display = rows.slice(0, 4);

  return (
    <div className="card mb-0 dashboard-panel dashboard-panel--light h-100">
      <div className="card-header dashboard-panel__head d-flex align-items-center justify-content-between border-0 pb-0 flex-wrap gap-2">
        <h5 className="card-title mb-0 dashboard-panel__title-flat">Status do Estoque</h5>
        <Link to="/produtos" className="dashboard-stock-status__link-all">
          Ver todos
        </Link>
      </div>
      <div className="card-body pt-3">
        <div className="table-responsive dashboard-stock-status-table-wrap">
          <table className="table table-borderless dashboard-stock-status-table mb-0">
            <thead>
              <tr>
                <th scope="col">Produto</th>
                <th scope="col">Código</th>
                <th scope="col">Categoria</th>
                <th scope="col">Estoque total</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {display.length === 0 ? (
                <tr>
                  <td colSpan={5} className="dashboard-stock-status-table__empty py-4 text-center text-muted">
                    Nenhum produto para exibir.
                  </td>
                </tr>
              ) : (
                display.map((row, index) => {
                  const visual = stockStatusVisual(row.quantity, row.minStock ?? 0);
                  const iconTone = PRODUCT_ICON_ROTATION[index % PRODUCT_ICON_ROTATION.length];
                  const unitsLabel = Number(row.quantity) === 1 ? "unidade" : "unidades";
                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <span
                            className={`dashboard-stock-product-icon dashboard-stock-product-icon--${iconTone}`}
                            aria-hidden
                          >
                            <i className="ri-archive-line" />
                          </span>
                          <div>
                            <div className="dashboard-stock-product-name">{row.name}</div>
                            <div className="dashboard-stock-product-sku">#SKU - {formatSku(row.id)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="dashboard-stock-status-table__mono">{formatProductCode(row.id, index)}</td>
                      <td>{row.category}</td>
                      <td>
                        <div className="dashboard-stock-qty-label">
                          {Number(row.quantity) || 0} {unitsLabel}
                        </div>
                        <div className="dashboard-stock-bar-track">
                          <div
                            className={`dashboard-stock-bar-fill dashboard-stock-bar-fill--${visual.variant}`}
                            style={{ width: `${visual.barPct}%` }}
                          />
                        </div>
                      </td>
                      <td>
                        <span className={`dashboard-stock-pill dashboard-stock-pill--${visual.variant}`}>
                          {visual.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * Bloco inferior do dashboard: atividades (referência) + tabela de status (dados reais).
 */
function DashboardBottomSection({ byMaterial = [] }) {
  return (
    <div className="row gx-4 gy-4 align-items-stretch dashboard-row--bottom-layout">
      <div className="col-12 col-xl-4">
        <RecentActivitiesCard />
      </div>
      <div className="col-12 col-xl-8">
        <StockStatusCard rows={byMaterial} />
      </div>
    </div>
  );
}

export default DashboardBottomSection;
