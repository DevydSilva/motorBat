/**
 * Gestão de utilizadores (ADMIN/GERENTE): lista, criação e remoção conforme permissões.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createUser, deleteUser, fetchUsers } from "@/api";
import { formatCpfDisplay, normalizeCpfDigits } from "@/utils/cpf";
import { downloadXlsx } from "@/utils/exportXlsx";
import { addBatmotorPdfHeader } from "@/utils/batmotorExportBrand";
import SuppliersGlassSelect from "@/components/SuppliersGlassSelect";
import { useHeaderSearch } from "@/context/HeaderSearchContext";

const PAGE_SIZE = 8;

const KIND_FILTER_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "admin", label: "Administradores" },
  { value: "manager", label: "Gerentes" },
  { value: "employee", label: "Funcionários" },
  { value: "none", label: "Sem perfil vinculado" }
];

function roleLabel(profileRole) {
  if (!profileRole) return "—";
  const labels = {
    admin: "Administrador",
    gerente: "Gerente",
    funcionario: "Funcionário",
    encarregado: "Encarregado",
    almoxarife_operacional: "Almoxarife operacional",
    auxiliar_almoxarifado: "Auxiliar de almoxarifado"
  };
  return labels[profileRole] || profileRole;
}

function accessLabel(u) {
  if (u.accountKind === "admin") return { text: "Administrador", pill: "ativo" };
  if (u.accountKind === "manager") return { text: "Gerente", pill: "ativo" };
  if (u.accountKind === "employee") return { text: "Funcionário", pill: "pendente" };
  return { text: "Sem perfil", pill: "inativo" };
}

function accessPillClass(pill) {
  if (pill === "pendente") return "suppliers-table__pill suppliers-table__pill--pendente";
  if (pill === "inativo") return "suppliers-table__pill suppliers-table__pill--inativo";
  return "suppliers-table__pill suppliers-table__pill--ativo";
}

function formatInt(n) {
  return Number(n || 0).toLocaleString("pt-BR");
}

function isDemoCpf(value) {
  const digits = normalizeCpfDigits(value);
  return digits.length === 11;
}

/** Novo usuário: apenas Gerente ou Funcionário (ADMIN é único e não é criado por esta tela). */
const NOVO_USUARIO_PERFIL_OPTIONS = [
  { value: "GERENTE", label: "Gerente" },
  { value: "FUNCIONARIO", label: "Funcionário" }
];

const INITIAL_FORM = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  cpfDigits: "",
  ativo: true,
  perfil_role: "FUNCIONARIO"
};

function canDeleteUserRow(user) {
  if (user.accountKind === "admin") return false;
  const id = Number(user.id);
  if (Number.isFinite(id) && id === 1) return false;
  return true;
}

function UsersPage() {
  const { query: search, setQuery: setSearch } = useHeaderSearch();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [kindFilter, setKindFilter] = useState("all");
  const [feedback, setFeedback] = useState({ text: "", kind: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState(null);

  const loadUsers = useCallback(async () => {
    const data = await fetchUsers();
    setUsers(data);
  }, []);

  useEffect(() => {
    loadUsers().catch((err) => {
      setUsers([]);
      setFeedback({
        text: err?.message || "Não foi possível carregar os usuários.",
        kind: "danger"
      });
    });
  }, [loadUsers]);

  const kpiMetrics = useMemo(() => {
    const admins = users.filter((u) => u.accountKind === "admin").length;
    const managers = users.filter((u) => u.accountKind === "manager").length;
    const staff = users.filter((u) => u.accountKind === "employee").length;
    const noProfile = users.filter((u) => !u.accountKind).length;
    return [
      {
        key: "total",
        title: "Total de usuários",
        value: formatInt(users.length),
        iconWrapClass: "dashboard-metric-v2__icon-wrap--blue",
        icon: "ri-team-line"
      },
      {
        key: "admins",
        title: "Administradores",
        value: formatInt(admins),
        iconWrapClass: "dashboard-metric-v2__icon-wrap--green",
        icon: "ri-shield-user-line"
      },
      {
        key: "gerentes",
        title: "Gerentes",
        value: formatInt(managers),
        iconWrapClass: "dashboard-metric-v2__icon-wrap--yellow",
        icon: "ri-user-star-line"
      },
      {
        key: "funcionarios",
        title: "Funcionários",
        value: formatInt(staff),
        iconWrapClass: "dashboard-metric-v2__icon-wrap--red",
        icon: "ri-user-follow-line"
      },
      {
        key: "semperfil",
        title: "Sem perfil vinculado",
        value: formatInt(noProfile),
        iconWrapClass: "dashboard-metric-v2__icon-wrap--purple",
        icon: "ri-user-unfollow-line"
      }
    ];
  }, [users]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !term ||
        String(user.name || "")
          .toLowerCase()
          .includes(term) ||
        String(user.email || "")
          .toLowerCase()
          .includes(term) ||
        String(user.cpf || "")
          .replace(/\D/g, "")
          .includes(term.replace(/\D/g, "")) ||
        roleLabel(user.profileRole)
          .toLowerCase()
          .includes(term);

      const matchesKind =
        kindFilter === "all" ||
        (kindFilter === "admin" && user.accountKind === "admin") ||
        (kindFilter === "manager" && user.accountKind === "manager") ||
        (kindFilter === "employee" && user.accountKind === "employee") ||
        (kindFilter === "none" && !user.accountKind);

      return matchesSearch && matchesKind;
    });
  }, [kindFilter, search, users]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, safePage]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const pageNumbers = useMemo(() => {
    const maxVis = 5;
    if (pageCount <= maxVis) return Array.from({ length: pageCount }, (_, i) => i + 1);
    const half = Math.floor(maxVis / 2);
    let start = Math.max(1, safePage - half);
    let end = start + maxVis - 1;
    if (end > pageCount) {
      end = pageCount;
      start = Math.max(1, end - maxVis + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [pageCount, safePage]);

  const openNewModal = () => {
    setForm(INITIAL_FORM);
    setFeedback({ text: "", kind: "" });
    setFormOpen(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ text: "", kind: "" });

    if (
      !form.name?.trim() ||
      !form.email?.trim() ||
      !form.password ||
      !form.confirmPassword ||
      !form.cpfDigits
    ) {
      setFeedback({ text: "Preencha nome, e-mail, senha, confirmação e CPF.", kind: "danger" });
      return;
    }
    if (form.password !== form.confirmPassword) {
      setFeedback({ text: "Senha e confirmação não coincidem.", kind: "danger" });
      return;
    }
    if (!isDemoCpf(form.cpfDigits)) {
      setFeedback({ text: "CPF deve ter 11 dígitos para teste.", kind: "danger" });
      return;
    }

    setIsSaving(true);
    try {
      await createUser({
        name: form.name,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
        cpf: normalizeCpfDigits(form.cpfDigits),
        ativo: form.ativo,
        perfil_role: form.perfil_role
      });
      setForm(INITIAL_FORM);
      setFormOpen(false);
      const perfilLabel =
        form.perfil_role === "GERENTE" ? "Gerente" : form.perfil_role === "FUNCIONARIO" ? "Funcionário" : "—";
      setFeedback({
        text: `Criado com sucesso. Na lista abaixo o usuário já aparece com o perfil «${perfilLabel}» ativo.`,
        kind: "success"
      });
      await loadUsers();
    } catch (err) {
      let msg = "Não foi possível cadastrar o usuário.";
      if (err?.code === "CONFLICT" || err?.message === "Email ja cadastrado") {
        msg = "Este e-mail já está cadastrado.";
      } else if (err?.message === "CPF ja cadastrado") {
        msg = "Este CPF já está cadastrado.";
      } else if (err?.response?.data?.error) {
        msg = err.response.data.error;
      } else if (err?.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err?.message) {
        msg = err.message;
      }
      setFeedback({ text: msg, kind: "danger" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!canDeleteUserRow(user)) return;
    const ok = window.confirm(
      `Excluir permanentemente o usuário «${user.name || user.email}»? Esta ação não pode ser desfeita.`
    );
    if (!ok) return;
    setDeletingId(String(user.id));
    setFeedback({ text: "", kind: "" });
    try {
      await deleteUser(user.id);
      setFeedback({ text: "Usuário excluído do sistema.", kind: "success" });
      await loadUsers();
    } catch (err) {
      setFeedback({
        text: err?.message || "Não foi possível excluir o usuário.",
        kind: "danger"
      });
    } finally {
      setDeletingId(null);
    }
  };

  const exportUsersPdf = async () => {
    if (!filteredUsers.length) {
      setFeedback({ text: "Não há usuários na lista atual para exportar.", kind: "info" });
      return;
    }
    setFeedback({ text: "", kind: "" });
    try {
    const doc = new jsPDF({ orientation: "landscape" });
    const now = new Date();
    const ts = now.toLocaleString("pt-BR");
    let y = await addBatmotorPdfHeader(doc, { x: 14, y: 10, maxWidthMm: 62 });
    doc.setFontSize(11);
    doc.setTextColor(0, 51, 102);
    doc.text("Usuários do sistema", 14, y);
    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Gerado em: ${ts}`, 14, y);
    y += 6;
    doc.text(`Registros (filtro atual): ${filteredUsers.length}`, 14, y);
    y += 8;

    const body = filteredUsers.map((u) => [
      u.name || "—",
      u.email || "—",
      u.cpf || "—",
      accessLabel(u).text,
      roleLabel(u.profileRole)
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Nome", "E-mail", "CPF", "Tipo de acesso", "Perfil"]],
      body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [29, 78, 216], textColor: 255 }
    });

    doc.save(`usuarios-batmotor-${now.toISOString().slice(0, 10)}.pdf`);
    setFeedback({ text: "PDF exportado com sucesso.", kind: "success" });
    } catch (err) {
      setFeedback({ text: err?.message || "Não foi possível gerar o PDF.", kind: "danger" });
    }
  };

  const exportUsersXlsx = async () => {
    if (!filteredUsers.length) {
      setFeedback({ text: "Não há usuários na lista atual para exportar.", kind: "info" });
      return;
    }
    try {
    const day = new Date().toISOString().slice(0, 10);
    await downloadXlsx(
      `usuarios-batmotor-${day}.xlsx`,
      "Usuarios",
      {
        name: "Nome",
        email: "E-mail",
        cpf: "CPF",
        accessType: "Tipo de acesso",
        profile: "Perfil"
      },
      filteredUsers.map((u) => ({
        name: u.name,
        email: u.email,
        cpf: u.cpf,
        accessType: accessLabel(u).text,
        profile: roleLabel(u.profileRole)
      }))
    );
    setFeedback({ text: "Planilha Excel exportada.", kind: "success" });
    } catch (err) {
      setFeedback({ text: err?.message || "Não foi possível exportar o Excel.", kind: "danger" });
    }
  };

  return (
    <div className="suppliers-page users-page">
      <section className="suppliers-page__kpis users-page__kpis bm-kpis-row row g-4 gy-4 mb-4">
        {kpiMetrics.map((m) => (
          <div key={m.key} className="col-12 col-sm-6 col-lg-4 col-xl-4 dashboard-kpi-col">
            <article className={`dashboard-metric-v2 suppliers-page__kpi dashboard-metric-v2--${m.key}`}>
              <div className="dashboard-metric-v2__body">
                <span className="dashboard-metric-v2__label">{m.title}</span>
                <strong className="dashboard-metric-v2__value">{m.value}</strong>
              </div>
              <div className={`dashboard-metric-v2__icon-wrap ${m.iconWrapClass}`} aria-hidden>
                <i className={m.icon} />
              </div>
            </article>
          </div>
        ))}
      </section>

      <div className="suppliers-page__toolbar">
        <div className="suppliers-page__titles">
          <h2 className="suppliers-page__title">Usuários do sistema</h2>
          <p className="suppliers-page__subtitle">Cadastre contas e acompanhe quem acessa o painel (perfis vêm do backend)</p>
        </div>
        <div className="suppliers-page__actions">
          <button
            type="button"
            className="btn suppliers-page__btn-outline"
            onClick={exportUsersPdf}
            title="Exportar lista atual (com filtros) em PDF"
          >
            <i className="ri-file-pdf-line me-1" aria-hidden />
            PDF
          </button>
          <button
            type="button"
            className="btn suppliers-page__btn-outline"
            onClick={exportUsersXlsx}
            title="Exportar lista atual (com filtros) em Excel"
          >
            <i className="ri-file-excel-2-line me-1" aria-hidden />
            Excel
          </button>
          <button type="button" className="btn suppliers-page__btn-primary" onClick={openNewModal}>
            <i className="ri-user-add-line me-1" aria-hidden />
            Novo usuário
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-3 suppliers-page__filters users-page__filters">
        <div className="card-body py-3">
          <div className="row g-3 align-items-end">
            <div className="col-lg-8">
              <label className="form-label fw-semibold mb-1" htmlFor="users-search">
                Buscar
              </label>
              <div className="input-group input-group-lg">
                <span className="input-group-text border-end-0">
                  <i className="ri-search-line" aria-hidden />
                </span>
                <input
                  id="users-search"
                  type="search"
                  className="form-control border-start-0 ps-0"
                  placeholder="Nome, e-mail, CPF ou cargo..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="col-lg-4">
              <label className="form-label fw-semibold mb-1" id="users-kind-label" htmlFor="users-kind">
                Filtrar por tipo
              </label>
              <SuppliersGlassSelect
                id="users-kind"
                listLabelledBy="users-kind-label"
                value={kindFilter}
                onChange={(v) => {
                  setKindFilter(v);
                  setPage(1);
                }}
                options={KIND_FILTER_OPTIONS}
                allowEmpty={false}
                large
              />
            </div>
          </div>
        </div>
      </div>

      {feedback.text && !formOpen ? (
        <div className={`suppliers-page__alert suppliers-page__alert--${feedback.kind || "info"} mb-3`} role="status">
          {feedback.text}
        </div>
      ) : null}

      <div className="card suppliers-page__table-card border-0">
        <div className="table-responsive">
          <table className="table align-middle mb-0 suppliers-data-table">
            <thead>
              <tr>
                <th scope="col">Usuário</th>
                <th scope="col">E-mail</th>
                <th scope="col">CPF</th>
                <th scope="col">Tipo de acesso</th>
                <th scope="col">Perfil / cargo</th>
                <th scope="col" className="text-end">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {pageSlice.length ? (
                pageSlice.map((user) => {
                  const acc = accessLabel(user);
                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="suppliers-data-table__company">
                          <span className="suppliers-data-table__swatch" aria-hidden>
                            <i className="ri-account-circle-line" />
                          </span>
                          <div>
                            <div className="suppliers-data-table__name">{user.name || "—"}</div>
                            <div className="suppliers-data-table__id">ID: {user.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="suppliers-data-table__muted">{user.email}</td>
                      <td className="suppliers-data-table__mono">{user.cpf || "—"}</td>
                      <td>
                        <span className={accessPillClass(acc.pill)}>{acc.text}</span>
                      </td>
                      <td className="suppliers-data-table__muted">{roleLabel(user.profileRole)}</td>
                      <td className="text-end">
                        {canDeleteUserRow(user) ? (
                          <button
                            type="button"
                            className="btn btn-link btn-sm text-danger p-1 users-page__delete-btn"
                            title="Excluir usuário"
                            disabled={deletingId != null}
                            aria-label={`Excluir ${user.name || user.email}`}
                            onClick={() => handleDeleteUser(user)}
                          >
                            {String(deletingId) === String(user.id) ? (
                              <span className="spinner-border spinner-border-sm" aria-hidden />
                            ) : (
                              <i className="ri-delete-bin-line ri-lg" aria-hidden />
                            )}
                          </button>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="text-center text-muted py-5">Nenhum usuário encontrado com os filtros atuais.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length > 0 ? (
        <nav className="suppliers-page__pagination" aria-label="Paginação">
          <button
            type="button"
            className="suppliers-page__page-btn"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label="Página anterior"
          >
            &lt;
          </button>
          {pageNumbers.map((n) => (
            <button
              key={n}
              type="button"
              className={`suppliers-page__page-btn${n === safePage ? " is-active" : ""}`}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            className="suppliers-page__page-btn"
            disabled={safePage >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            aria-label="Próxima página"
          >
            &gt;
          </button>
        </nav>
      ) : null}

      {formOpen ? (
        <div
          className="suppliers-light-backdrop"
          role="presentation"
          onClick={() => !isSaving && setFormOpen(false)}
        >
          <div
            className="suppliers-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="users-form-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="suppliers-form-modal__head">
              <h5 id="users-form-title" className="suppliers-form-modal__title mb-0">
                Novo usuário
              </h5>
              <button
                type="button"
                className="suppliers-import-modal__close"
                aria-label="Fechar"
                onClick={() => !isSaving && setFormOpen(false)}
              >
                <i className="ri-close-line" aria-hidden />
              </button>
            </div>
            <div className="suppliers-form-modal__body">
              {feedback.text && formOpen ? (
                <div className={`suppliers-page__alert suppliers-page__alert--${feedback.kind || "info"} mb-3`}>
                  {feedback.text}
                </div>
              ) : null}
              <p className="text-muted small mb-4">
                Escolha <strong>Gerente</strong> ou <strong>Funcionário</strong>. O perfil é salvo junto com o cadastro.
                O administrador principal não pode ser duplicado por esta tela.
              </p>
              <form className="suppliers-form" onSubmit={onSubmit}>
                <div className="suppliers-form__field">
                  <label className="suppliers-form__label" htmlFor="nu-name">
                    Nome completo *
                  </label>
                  <input
                    id="nu-name"
                    className="form-control form-control-lg suppliers-form__control"
                    placeholder="Ex.: João Silva"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="suppliers-form__field">
                  <label className="suppliers-form__label" htmlFor="nu-email">
                    E-mail *
                  </label>
                  <input
                    id="nu-email"
                    type="email"
                    className="form-control form-control-lg suppliers-form__control"
                    placeholder="nome@empresa.com.br"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="suppliers-form__field mb-0">
                      <label className="suppliers-form__label" htmlFor="nu-pass">
                        Senha inicial *
                      </label>
                      <input
                        id="nu-pass"
                        type="password"
                        className="form-control form-control-lg suppliers-form__control"
                        placeholder="Senha provisória"
                        value={form.password}
                        onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                        autoComplete="new-password"
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="suppliers-form__field mb-0">
                      <label className="suppliers-form__label" htmlFor="nu-pass2">
                        Confirmar senha *
                      </label>
                      <input
                        id="nu-pass2"
                        type="password"
                        className="form-control form-control-lg suppliers-form__control"
                        placeholder="Repita a senha"
                        value={form.confirmPassword}
                        onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        autoComplete="new-password"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="suppliers-form__field">
                  <label className="suppliers-form__label" id="nu-perfil-label" htmlFor="nu-perfil">
                    Perfil de acesso *
                  </label>
                  <SuppliersGlassSelect
                    id="nu-perfil"
                    listLabelledBy="nu-perfil-label"
                    value={form.perfil_role}
                    onChange={(v) => setForm((prev) => ({ ...prev, perfil_role: v }))}
                    options={NOVO_USUARIO_PERFIL_OPTIONS}
                    allowEmpty={false}
                    large
                  />
                </div>
                <div className="suppliers-form__field">
                  <label className="suppliers-form__label" htmlFor="nu-cpf">
                    CPF *
                  </label>
                  <input
                    id="nu-cpf"
                    type="text"
                    inputMode="numeric"
                    className="form-control form-control-lg suppliers-form__control"
                    placeholder="000.000.000-00"
                    value={formatCpfDisplay(form.cpfDigits)}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, cpfDigits: normalizeCpfDigits(e.target.value) }))
                    }
                    maxLength={14}
                    required
                  />
                </div>
                <div className="form-check form-switch mb-4">
                  <input
                    id="nu-ativo"
                    type="checkbox"
                    className="form-check-input"
                    checked={form.ativo}
                    onChange={(e) => setForm((prev) => ({ ...prev, ativo: e.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="nu-ativo">
                    Usuário ativo
                  </label>
                </div>
                <div className="d-flex gap-2 justify-content-end">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={isSaving}
                    onClick={() => setFormOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn suppliers-page__btn-primary" disabled={isSaving}>
                    {isSaving ? "Salvando..." : "Salvar usuário"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default UsersPage;
