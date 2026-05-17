/**
 * Resumo de inventário por matéria (estado de stock vs mínimo) e cartão de movimentações da semana.
 */
import { MovimentacoesSemanaCard } from "./DashboardChartsSection";

function getStockState(material) {
  const current = Number(material.currentStock) || 0;
  const min = Number(material.minStock) || 0;

  if (current <= 0) return { label: "Critico", tone: "danger" };
  if (current <= min) return { label: "Atencao", tone: "warning" };
  return { label: "Estavel", tone: "success" };
}

function DashboardInventorySection({ materials, alerts, activities }) {
  const stableCount = materials.filter((item) => getStockState(item).tone === "success").length;
  const warningCount = materials.filter((item) => getStockState(item).tone === "warning").length;
  const criticalCount = materials.filter((item) => getStockState(item).tone === "danger").length;

  return (
    <>
      <div className="row gx-4 gy-4 dashboard-row--chart-top">
        <div className="col-12">
          <MovimentacoesSemanaCard />
        </div>
      </div>

      <div className="row gx-4 gy-4 align-items-stretch dashboard-row--tables">
        <div className="col-xl-8 col-12">
          <div className="card mb-0 h-100 dashboard-panel">
            <div className="card-header d-flex justify-content-between align-items-center dashboard-panel__head">
              <div>
                <h5 className="card-title mb-1">Atividades recentes</h5>
                <p className="dashboard-panel__desc mb-0">Resumo operacional inspirado no template do dashboard.</p>
              </div>
              <button className="btn btn-sm btn-outline-warning dashboard-panel__btn">Ver todos</button>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table align-middle mb-0 dashboard-activity-table">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>Codigo</th>
                      <th>Categoria</th>
                      <th>Estoque</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((row) => (
                      <tr key={row.id}>
                        <td className="fw-semibold">{row.title}</td>
                        <td>{row.code}</td>
                        <td>{row.category}</td>
                        <td>{row.stockLabel}</td>
                        <td>
                          <span className={`inventory-badge inventory-badge--${
                            row.status === "Estavel" ? "success" : row.status === "Atencao" ? "warning" : "danger"
                          }`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-12">
          <div className="card mb-0 h-100 dashboard-panel">
            <div className="card-header dashboard-panel__head">
              <div>
                <h5 className="card-title mb-1">Status do Estoque</h5>
                <p className="dashboard-panel__desc mb-0">Visao rapida dos itens estaveis, em atencao e criticos.</p>
              </div>
            </div>
            <div className="card-body">
              <div className="dashboard-status-stack">
                <div className="dashboard-status dashboard-status--success">
                  <div>
                    <strong>{stableCount}</strong>
                    <span>Estavel</span>
                  </div>
                </div>
                <div className="dashboard-status dashboard-status--warning">
                  <div>
                    <strong>{warningCount}</strong>
                    <span>Atencao</span>
                  </div>
                </div>
                <div className="dashboard-status dashboard-status--danger">
                  <div>
                    <strong>{criticalCount}</strong>
                    <span>Critico</span>
                  </div>
                </div>
              </div>

              <ul className="simple-list dashboard-alert-list mt-3">
                {alerts.map((item) => (
                  <li key={item.id} className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-semibold">{item.name}</div>
                      <small className="text-muted">
                        {item.currentStock} {item.unit} restantes
                      </small>
                    </div>
                    <span className="inventory-badge inventory-badge--danger">Critico</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default DashboardInventorySection;
