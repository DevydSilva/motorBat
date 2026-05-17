/**
 * Definições da conta: perfil, foto, preferências ligadas ao `localStorage` / API.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ACCOUNT_KIND, ADMIN_ROLES, EMPLOYEE_ROLES } from "@/constants/registerRoles";
import { resolveAvatarUrl, resolveDisplayAvatarUrl } from "@/constants/userAvatar";
import SuppliersGlassSelect from "@/components/SuppliersGlassSelect";
import { getUseMock, loginRequest } from "@/api";
import { pickPrimaryBackendRole, rolesFromUsuarioPerfis } from "@/api/batmotorAdapters.js";
import {
  createUsuarioPerfilLink,
  fetchPerfis,
  fetchUserById,
  updateUsuario,
  updateUsuarioMe,
  updateUsuarioPerfilLink
} from "@/api/services/profileAdmin.js";

const STORAGE_PREFIX = "batmotor-settings-";
const KEYS = {
  showAlerts: `${STORAGE_PREFIX}show-dashboard-alerts`,
  defaultUnit: `${STORAGE_PREFIX}default-report-unit`,
  company: `${STORAGE_PREFIX}company`,
  currency: `${STORAGE_PREFIX}currency`,
  timezone: `${STORAGE_PREFIX}timezone`,
  dateFormat: `${STORAGE_PREFIX}date-format`,
  address: `${STORAGE_PREFIX}address`,
  allowNegativeStock: `${STORAGE_PREFIX}allow-negative-stock`,
  enableExpiry: `${STORAGE_PREFIX}enable-expiry`,
  enableLots: `${STORAGE_PREFIX}enable-lots`,
  defaultMinLevel: `${STORAGE_PREFIX}default-min-level`,
  notifyStock: `${STORAGE_PREFIX}notify-stock`,
  notifyReports: `${STORAGE_PREFIX}notify-reports`,
  notifyEmails: `${STORAGE_PREFIX}notify-emails-json`,
  lastBackup: `${STORAGE_PREFIX}last-backup-iso`
};

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const UNIT_OPTIONS = ["kg", "g", "un", "m", "l"];
const CURRENCY_OPTIONS = [
  { value: "BRL", label: "Real Brasileiro (R$)" },
  { value: "USD", label: "Dólar (US$)" },
  { value: "EUR", label: "Euro (€)" }
];
const TIMEZONE_OPTIONS = [
  { value: "America/Sao_Paulo", label: "(UTC-03:00) Brasília" },
  { value: "America/Manaus", label: "(UTC-04:00) Manaus" },
  { value: "America/Fortaleza", label: "(UTC-03:00) Fortaleza" }
];
const DATE_FORMAT_OPTIONS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" }
];

/** Gerente e Funcionário — Administrador é único e não é escolha nesta tela. */
const ACCESS_LEVEL_OPTIONS_STAFF = [
  { value: "GERENTE", label: "Gerente" },
  { value: "FUNCIONARIO", label: "Funcionário" }
];

const ACCESS_LEVEL_ADMIN_READONLY = [{ value: "ADMIN", label: "Administrador" }];

const ACCESS_LEVEL_EMPLOYEE_READONLY = [{ value: "FUNCIONARIO", label: "Funcionário" }];

const BATMOTOR_USER_ID_KEY = "batmotor-user-id";

/** MongoDB usa ObjectId em string; `Number(id)` dá NaN e quebrava o perfil. */
function getStoredBatmotorUserId() {
  const raw = localStorage.getItem(BATMOTOR_USER_ID_KEY);
  const s = raw != null ? String(raw).trim() : "";
  return s || null;
}

function accountKindToRoleKey(kind) {
  if (kind === ACCOUNT_KIND.admin) return "ADMIN";
  if (kind === ACCOUNT_KIND.manager) return "GERENTE";
  if (kind === ACCOUNT_KIND.employee) return "FUNCIONARIO";
  return "FUNCIONARIO";
}

function readBool(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === "1" || raw === "true";
}

function readStr(key, fallback) {
  const raw = localStorage.getItem(key);
  return raw === null || raw === "" ? fallback : raw;
}

function readJsonEmails(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((e) => typeof e === "string" && e.trim()) : [];
  } catch {
    return [];
  }
}

const DEMO_NOTIFY_EMAILS = ["estoque@empresa.com"];
const DEFAULT_LAST_BACKUP_ISO = "2026-05-29T18:30:00.000Z";

function SettingsPage({ userName, userEmail, profileRole, accountKind, userAvatar, onSaveProfile, onSessionRefreshed }) {
  const [company, setCompany] = useState(() => readStr(KEYS.company, "AlgumNomeAleatório"));
  const [currency, setCurrency] = useState(() => readStr(KEYS.currency, "BRL"));
  const [timezone, setTimezone] = useState(() => readStr(KEYS.timezone, "America/Sao_Paulo"));
  const [dateFormat, setDateFormat] = useState(() => readStr(KEYS.dateFormat, "DD/MM/YYYY"));
  const [address, setAddress] = useState(() => readStr(KEYS.address, "Rua Aleatória, Nº 9 - Cidade/PE"));

  const [showDashboardAlerts, setShowDashboardAlerts] = useState(() =>
    readBool(KEYS.showAlerts, true)
  );
  const [allowNegativeStock, setAllowNegativeStock] = useState(() =>
    readBool(KEYS.allowNegativeStock, false)
  );
  const [enableExpiry, setEnableExpiry] = useState(() => readBool(KEYS.enableExpiry, false));
  const [enableLots, setEnableLots] = useState(() => readBool(KEYS.enableLots, true));
  const [defaultMinLevel, setDefaultMinLevel] = useState(() => readStr(KEYS.defaultMinLevel, "5"));
  const [defaultUnit, setDefaultUnit] = useState(() => readStr(KEYS.defaultUnit, "un"));

  const [notifyStock, setNotifyStock] = useState(() => readBool(KEYS.notifyStock, true));
  const [notifyReports, setNotifyReports] = useState(() => readBool(KEYS.notifyReports, false));
  const [notifyInput, setNotifyInput] = useState("");
  const [notifyEmails, setNotifyEmails] = useState(() => {
    const saved = readJsonEmails(KEYS.notifyEmails);
    return saved.length ? saved : [...DEMO_NOTIFY_EMAILS];
  });

  const [settingsFeedback, setSettingsFeedback] = useState({ text: "", kind: "" });
  const [backupFeedback, setBackupFeedback] = useState("");

  const splitName = (full) => {
    const p = String(full || "").trim().split(/\s+/).filter(Boolean);
    return { first: p[0] || "", rest: p.slice(1).join(" ") };
  };

  const [firstName, setFirstName] = useState(() => splitName(userName).first);
  const [lastName, setLastName] = useState(() => splitName(userName).rest);
  const [email, setEmail] = useState(() => userEmail || "");
  const [profileMessage, setProfileMessage] = useState({ text: "", kind: "" });
  const [pwdVisible, setPwdVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [accessRoleKey, setAccessRoleKey] = useState(() => accountKindToRoleKey(accountKind));
  const [initialAccessRoleKey, setInitialAccessRoleKey] = useState(() => accountKindToRoleKey(accountKind));
  const [perfisCatalog, setPerfisCatalog] = useState([]);
  const [avatarEdit, setAvatarEdit] = useState(() => ({ type: "none" }));
  const [imgFailed, setImgFailed] = useState(false);
  const fileInputRef = useRef(null);

  const isAdmin = accountKind === ACCOUNT_KIND.admin;
  const isEmployee = accountKind === ACCOUNT_KIND.employee;
  const isManager = accountKind === ACCOUNT_KIND.manager;

  useEffect(() => {
    const { first, rest } = splitName(userName);
    setFirstName(first);
    setLastName(rest);
  }, [userName]);

  useEffect(() => {
    setEmail(userEmail || "");
  }, [userEmail]);

  useEffect(() => {
    setAccessRoleKey(accountKindToRoleKey(accountKind));
    setInitialAccessRoleKey(accountKindToRoleKey(accountKind));
  }, [accountKind]);

  useEffect(() => {
    if (isAdmin || isEmployee || getUseMock()) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const uid = getStoredBatmotorUserId();
        if (!uid) return;
        const [perfis, userRow] = await Promise.all([fetchPerfis(), fetchUserById(uid)]);
        if (cancelled || !userRow) return;
        setPerfisCatalog(Array.isArray(perfis) ? perfis : []);
        const roles = rolesFromUsuarioPerfis(userRow.usuarioPerfis);
        let primary = pickPrimaryBackendRole(roles);
        if (primary === "ADMIN") primary = "GERENTE";
        if (primary && (primary === "GERENTE" || primary === "FUNCIONARIO")) {
          setAccessRoleKey(primary);
          setInitialAccessRoleKey(primary);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, isEmployee]);

  const previewSrc = useMemo(() => {
    if (avatarEdit.type === "new") return avatarEdit.dataUrl;
    if (avatarEdit.type === "remove") return resolveAvatarUrl(profileRole);
    return resolveDisplayAvatarUrl(profileRole, userAvatar);
  }, [avatarEdit, profileRole, userAvatar]);

  const roleLabel = useMemo(() => {
    const all = [...EMPLOYEE_ROLES, ...ADMIN_ROLES];
    return all.find((r) => r.id === profileRole)?.label || profileRole || "—";
  }, [profileRole]);

  const accessLevelLabel = useMemo(() => {
    if (accountKind === ACCOUNT_KIND.admin) return "Administrador";
    if (accountKind === ACCOUNT_KIND.manager) return "Gerente";
    if (accountKind === ACCOUNT_KIND.employee) return "Funcionário";
    return "Não informado";
  }, [accountKind]);

  const displayNamePreview = [firstName, lastName].filter(Boolean).join(" ").trim() || userName;

  const persistSettings = (e) => {
    e.preventDefault();
    localStorage.setItem(KEYS.company, company.trim());
    localStorage.setItem(KEYS.currency, currency);
    localStorage.setItem(KEYS.timezone, timezone);
    localStorage.setItem(KEYS.dateFormat, dateFormat);
    localStorage.setItem(KEYS.address, address.trim());
    localStorage.setItem(KEYS.showAlerts, showDashboardAlerts ? "1" : "0");
    localStorage.setItem(KEYS.allowNegativeStock, allowNegativeStock ? "1" : "0");
    localStorage.setItem(KEYS.enableExpiry, enableExpiry ? "1" : "0");
    localStorage.setItem(KEYS.enableLots, enableLots ? "1" : "0");
    localStorage.setItem(KEYS.defaultMinLevel, String(defaultMinLevel));
    localStorage.setItem(KEYS.defaultUnit, defaultUnit);
    localStorage.setItem(KEYS.notifyStock, notifyStock ? "1" : "0");
    localStorage.setItem(KEYS.notifyReports, notifyReports ? "1" : "0");
    localStorage.setItem(KEYS.notifyEmails, JSON.stringify(notifyEmails));
    setSettingsFeedback({ text: "Configurações salvas neste navegador.", kind: "success" });
    window.setTimeout(() => setSettingsFeedback({ text: "", kind: "" }), 4000);
  };

  const addNotifyEmail = () => {
    const v = notifyInput.trim().toLowerCase();
    if (!v || !v.includes("@")) {
      setSettingsFeedback({ text: "Digite um e-mail valido.", kind: "danger" });
      return;
    }
    if (notifyEmails.includes(v)) {
      setNotifyInput("");
      return;
    }
    setNotifyEmails((prev) => [...prev, v]);
    setNotifyInput("");
    setSettingsFeedback({ text: "", kind: "" });
  };

  const removeNotifyEmail = (idx) => {
    setNotifyEmails((prev) => prev.filter((_, i) => i !== idx));
  };

  const runBackupMock = () => {
    const iso = new Date().toISOString();
    localStorage.setItem(KEYS.lastBackup, iso);
    setBackupFeedback("Backup simulado registrado.");
    window.setTimeout(() => setBackupFeedback(""), 3500);
  };

  const lastBackup = readStr(KEYS.lastBackup, DEFAULT_LAST_BACKUP_ISO);

  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProfileMessage({ text: "Use JPG, PNG ou WebP.", kind: "danger" });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setProfileMessage({ text: "Arquivo acima de 2 MB.", kind: "danger" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarEdit({ type: "new", dataUrl: reader.result });
      setImgFailed(false);
      setProfileMessage({ text: "Foto atualizada na preview. Salve o perfil.", kind: "success" });
    };
    reader.readAsDataURL(file);
  }

  function handleRemovePhoto() {
    setAvatarEdit({ type: "remove" });
    setImgFailed(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setProfileMessage({ text: "Foto padrao sera restaurada ao salvar.", kind: "warning" });
  }

  const canRemovePhoto = Boolean(userAvatar) || avatarEdit.type === "new";

  async function handleProfileSubmit(e) {
    e.preventDefault();
    const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || userName;
    let avatarDataUrl;
    if (avatarEdit.type === "remove") avatarDataUrl = null;
    else if (avatarEdit.type === "new") avatarDataUrl = avatarEdit.dataUrl;
    else avatarDataUrl = undefined;

    /** Administrador: apenas nome, sobrenome e foto (e-mail e senha fixos no sistema). */
    if (isAdmin) {
      const keepEmail = String(userEmail || "").trim();
      if (getUseMock()) {
        onSaveProfile({ displayName, displayEmail: keepEmail, avatarDataUrl });
        setAvatarEdit({ type: "none" });
        setProfileMessage({ text: "Perfil atualizado (modo demo local).", kind: "success" });
        return;
      }
      const uid = getStoredBatmotorUserId();
      if (!uid) {
        setProfileMessage({ text: "Sessão sem ID de usuário. Faça login novamente.", kind: "danger" });
        return;
      }
      try {
        await updateUsuario(uid, { nome: displayName });
        onSaveProfile({ displayName, displayEmail: keepEmail, avatarDataUrl });
        setAvatarEdit({ type: "none" });
        setProfileMessage({ text: "Perfil atualizado com sucesso.", kind: "success" });
      } catch (err) {
        setProfileMessage({ text: err?.message || "Falha ao salvar perfil.", kind: "danger" });
      }
      return;
    }

    /** Funcionário: só nome, sobrenome e foto; e-mail e senha definidos pela empresa. */
    if (isEmployee) {
      const keepEmail = String(userEmail || "").trim();
      if (getUseMock()) {
        onSaveProfile({ displayName, displayEmail: keepEmail, avatarDataUrl });
        setAvatarEdit({ type: "none" });
        setProfileMessage({ text: "Perfil atualizado (modo demo local).", kind: "success" });
        return;
      }
      try {
        await updateUsuarioMe({ nome: displayName });
        onSaveProfile({ displayName, displayEmail: keepEmail, avatarDataUrl });
        setAvatarEdit({ type: "none" });
        setProfileMessage({ text: "Perfil atualizado com sucesso.", kind: "success" });
      } catch (err) {
        setProfileMessage({ text: err?.message || "Falha ao salvar perfil.", kind: "danger" });
      }
      return;
    }

    /** Gerente: nome, sobrenome, foto e nível (demo); e-mail fixo como no servidor. */
    if (getUseMock()) {
      const mockEmail = String(userEmail || email).trim();
      if (accessRoleKey === "GERENTE") {
        localStorage.setItem("batmotor-account-kind", "manager");
        localStorage.setItem("batmotor-profile-role", "gerente");
      } else {
        localStorage.setItem("batmotor-account-kind", "employee");
        localStorage.setItem("batmotor-profile-role", "funcionario");
      }
      onSaveProfile({ displayName, displayEmail: mockEmail, avatarDataUrl });
      onSessionRefreshed?.({
        token: localStorage.getItem("batmotor-token") || "mock-token",
        user: {
          id: localStorage.getItem(BATMOTOR_USER_ID_KEY),
          name: displayName,
          email: mockEmail,
          accountKind: accessRoleKey === "GERENTE" ? "manager" : "employee",
          profileRole: accessRoleKey === "GERENTE" ? "gerente" : "funcionario"
        }
      });
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
      setAvatarEdit({ type: "none" });
      setInitialAccessRoleKey(accessRoleKey);
      setProfileMessage({ text: "Perfil atualizado (modo demo local).", kind: "success" });
      return;
    }

    const uid = getStoredBatmotorUserId();
    if (!uid) {
      setProfileMessage({ text: "Sessão sem ID de usuário. Faça login novamente.", kind: "danger" });
      return;
    }
    const keepEmail = String(userEmail || "").trim();
    if (!keepEmail) {
      setProfileMessage({ text: "E-mail da sessão indisponível. Faça login novamente.", kind: "danger" });
      return;
    }
    if (accessRoleKey !== "GERENTE" && accessRoleKey !== "FUNCIONARIO") {
      setProfileMessage({ text: "Nível de acesso inválido.", kind: "danger" });
      return;
    }

    const roleChanged = accessRoleKey !== initialAccessRoleKey;

    try {
      if (!roleChanged) {
        await updateUsuarioMe({ nome: displayName });
        onSaveProfile({ displayName, displayEmail: keepEmail, avatarDataUrl });
        setAvatarEdit({ type: "none" });
        setProfileMessage({ text: "Perfil atualizado com sucesso.", kind: "success" });
        return;
      }

      await updateUsuarioMe({ nome: displayName });

      const perfis = perfisCatalog.length ? perfisCatalog : await fetchPerfis();
      const alvo = perfis.find((p) => p.role === accessRoleKey);
      if (!alvo) {
        setProfileMessage({ text: "Não foi possível localizar o perfil no servidor (GET /perfil).", kind: "danger" });
        return;
      }

      const userRow = await fetchUserById(uid);
      const ups = userRow?.usuarioPerfis ?? [];
      const targetRoles = ["ADMIN", "GERENTE", "FUNCIONARIO"];
      const primaryUp = ups.find((up) => targetRoles.includes(up?.perfil?.role));
      if (primaryUp && primaryUp.perfil_id != null) {
        if (String(primaryUp.perfil_id) !== String(alvo.id)) {
          await updateUsuarioPerfilLink(uid, primaryUp.perfil_id, alvo.id);
        }
      } else {
        await createUsuarioPerfilLink(uid, alvo.id);
      }

      if (!currentPassword) {
        setProfileMessage({
          text: "Informe a senha atual para confirmar a mudança de nível de acesso e renovar a sessão.",
          kind: "danger"
        });
        return;
      }
      const result = await loginRequest(keepEmail, currentPassword);
      onSessionRefreshed?.(result);
      onSaveProfile({ displayName, displayEmail: keepEmail, avatarDataUrl });
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
      setInitialAccessRoleKey(accessRoleKey);
      setAvatarEdit({ type: "none" });
      setProfileMessage({ text: "Perfil atualizado com sucesso.", kind: "success" });
    } catch (err) {
      setProfileMessage({ text: err?.message || "Falha ao salvar perfil.", kind: "danger" });
    }
  }

  const formatBackupLabel = (iso) => {
    if (!iso) return "Nunca registrado";
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <div className="inventory-page settings-page settings-page--estocae">
      <div className="row g-4 align-items-start">
        <div className="col-xl-7 col-lg-7 col-12">
          <form id="settings-main-form" onSubmit={persistSettings}>
            <div className="card inventory-form-card settings-stack-card mb-4">
              <div className="inventory-form-card__head settings-section-head">
                <h5 className="card-title mb-0 d-flex align-items-center gap-2">
                  <i className="ri-settings-3-line settings-section-head__icon" aria-hidden />
                  Configurações do Sistema
                </h5>
              </div>
              <div className="inventory-form-card__body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="inventory-form__field">
                      <label className="inventory-form__label" htmlFor="set-company">
                        Nome da Empresa
                      </label>
                      <input
                        id="set-company"
                        className="form-control inventory-form__control"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="inventory-form__field">
                      <label className="inventory-form__label" id="set-currency-label" htmlFor="set-currency">
                        Moeda Padrão
                      </label>
                      <SuppliersGlassSelect
                        id="set-currency"
                        listLabelledBy="set-currency-label"
                        value={currency}
                        onChange={setCurrency}
                        options={CURRENCY_OPTIONS}
                        allowEmpty={false}
                      />
                    </div>
                  </div>
                </div>
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="inventory-form__field">
                      <label className="inventory-form__label" id="set-tz-label" htmlFor="set-tz">
                        Fuso Horário
                      </label>
                      <SuppliersGlassSelect
                        id="set-tz"
                        listLabelledBy="set-tz-label"
                        value={timezone}
                        onChange={setTimezone}
                        options={TIMEZONE_OPTIONS}
                        allowEmpty={false}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="inventory-form__field">
                      <label className="inventory-form__label" id="set-date-label" htmlFor="set-date">
                        Formato de Data
                      </label>
                      <SuppliersGlassSelect
                        id="set-date"
                        listLabelledBy="set-date-label"
                        value={dateFormat}
                        onChange={setDateFormat}
                        options={DATE_FORMAT_OPTIONS}
                        allowEmpty={false}
                      />
                    </div>
                  </div>
                </div>
                <div className="inventory-form__field mb-0">
                  <label className="inventory-form__label" htmlFor="set-address">
                    Endereço
                  </label>
                  <input
                    id="set-address"
                    className="form-control inventory-form__control"
                    placeholder="Rua, número, cidade/UF"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="card inventory-form-card settings-stack-card mb-4">
              <div className="inventory-form-card__head settings-section-head">
                <h5 className="card-title mb-0 d-flex align-items-center gap-2">
                  <i className="ri-box-3-line settings-section-head__icon" aria-hidden />
                  Configurações do Estoque
                </h5>
              </div>
              <div className="inventory-form-card__body">
                <div className="inventory-form__field">
                  <div className="form-check form-switch inventory-settings-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="sw-alerts"
                      checked={showDashboardAlerts}
                      onChange={(e) => setShowDashboardAlerts(e.target.checked)}
                    />
                    <div className="settings-switch-copy">
                      <label className="form-check-label inventory-form__label mb-0" htmlFor="sw-alerts">
                        Alertas de Estoque Baixo
                      </label>
                      <p className="settings-switch-copy__hint mb-0">
                        Avisos quando o produto estiver abaixo do mínimo definido.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="row g-3">
                  <div className="col-sm-6">
                    <div className="inventory-form__field mb-0">
                      <label className="inventory-form__label" htmlFor="set-min">
                        Nível Mínimo Padrão
                      </label>
                      <input
                        id="set-min"
                        type="number"
                        min="0"
                        className="form-control inventory-form__control"
                        value={defaultMinLevel}
                        onChange={(e) => setDefaultMinLevel(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="inventory-form__field mb-0">
                      <label className="inventory-form__label" id="set-unit-label" htmlFor="set-unit">
                        Unidade de Medida Padrão
                      </label>
                      <SuppliersGlassSelect
                        id="set-unit"
                        listLabelledBy="set-unit-label"
                        value={defaultUnit}
                        onChange={setDefaultUnit}
                        options={[
                          { value: "un", label: "Unidades" },
                          ...UNIT_OPTIONS.filter((u) => u !== "un").map((u) => ({ value: u, label: u }))
                        ]}
                        allowEmpty={false}
                      />
                    </div>
                  </div>
                </div>
                <div className="inventory-form__field">
                  <div className="form-check form-switch inventory-settings-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="sw-negative"
                      checked={allowNegativeStock}
                      onChange={(e) => setAllowNegativeStock(e.target.checked)}
                    />
                    <div className="settings-switch-copy">
                      <label className="form-check-label inventory-form__label mb-0" htmlFor="sw-negative">
                        Permitir Estoque Negativo
                      </label>
                      <p className="settings-switch-copy__hint mb-0">
                        Permite saldo negativo no cadastro de movimentações.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="inventory-form__field">
                  <div className="form-check form-switch inventory-settings-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="sw-expiry"
                      checked={enableExpiry}
                      onChange={(e) => setEnableExpiry(e.target.checked)}
                    />
                    <div className="settings-switch-copy">
                      <label className="form-check-label inventory-form__label mb-0" htmlFor="sw-expiry">
                        Ativar Validade de Produtos
                      </label>
                      <p className="settings-switch-copy__hint mb-0">
                        Exige data de validade nos produtos perecíveis.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="inventory-form__field mb-0">
                  <div className="form-check form-switch inventory-settings-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="sw-lots"
                      checked={enableLots}
                      onChange={(e) => setEnableLots(e.target.checked)}
                    />
                    <div className="settings-switch-copy">
                      <label className="form-check-label inventory-form__label mb-0" htmlFor="sw-lots">
                        Ativar Controle de Lotes
                      </label>
                      <p className="settings-switch-copy__hint mb-0">
                        Rastreia lotes e números de série no estoque.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card inventory-form-card settings-stack-card mb-4">
              <div className="inventory-form-card__head settings-section-head">
                <h5 className="card-title mb-0 d-flex align-items-center gap-2">
                  <i className="ri-mail-line settings-section-head__icon" aria-hidden />
                  Notificações por E-mail
                </h5>
              </div>
              <div className="inventory-form-card__body">
                <div className="inventory-form__field">
                  <div className="form-check form-switch inventory-settings-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="sw-nstock"
                      checked={notifyStock}
                      onChange={(e) => setNotifyStock(e.target.checked)}
                    />
                    <div className="settings-switch-copy">
                      <label className="form-check-label inventory-form__label mb-0" htmlFor="sw-nstock">
                        Notificar Estoque Baixo
                      </label>
                      <p className="settings-switch-copy__hint mb-0">
                        Envia alerta por e-mail aos endereços cadastrados abaixo.
                      </p>
                    </div>
                  </div>
                </div>
                <label className="inventory-form__label mb-2" htmlFor="notify-email-input">
                  E-mails para Notificação
                </label>
                <div className="d-flex gap-2 align-items-stretch flex-wrap settings-notify-add-row">
                  <input
                    id="notify-email-input"
                    type="email"
                    className="form-control inventory-form__control settings-notify-add-row__input"
                    placeholder="Adicionar e-mail"
                    value={notifyInput}
                    onChange={(e) => setNotifyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addNotifyEmail();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn settings-accent-btn flex-shrink-0"
                    onClick={addNotifyEmail}
                    title="Adicionar e-mail"
                  >
                    <i className="ri-add-line fs-5" aria-hidden />
                  </button>
                </div>
                {notifyEmails.length > 0 ? (
                  <ul className="settings-email-chips list-unstyled mb-0 mt-3">
                    {notifyEmails.map((em, idx) => (
                      <li key={em}>
                        <span className="settings-email-chip">
                          {em}
                          <button
                            type="button"
                            className="settings-email-chip__remove"
                            onClick={() => removeNotifyEmail(idx)}
                            aria-label={`Remover ${em}`}
                          >
                            <i className="ri-close-line" aria-hidden />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="small text-muted mt-2 mb-0">Nenhum e-mail na lista.</p>
                )}
                <div className="inventory-form__field mb-0 mt-3">
                  <div className="form-check form-switch inventory-settings-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="sw-nreports"
                      checked={notifyReports}
                      onChange={(e) => setNotifyReports(e.target.checked)}
                    />
                    <div className="settings-switch-copy">
                      <label className="form-check-label inventory-form__label mb-0" htmlFor="sw-nreports">
                        Notificar Movimentações Críticas
                      </label>
                      <p className="settings-switch-copy__hint mb-0">Alerta quando houver operações que exigem atenção imediata.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {settingsFeedback.text ? (
              <div className={`inventory-feedback inventory-feedback--${settingsFeedback.kind || "info"} mb-3`}>
                {settingsFeedback.text}
              </div>
            ) : null}

            <button type="submit" className="btn btn-primary btn-lg w-100 inventory-form__submit">
              <i className="ri-save-3-line me-2" aria-hidden />
              Salvar configurações
            </button>
          </form>
        </div>

        <div className="col-xl-5 col-lg-5 col-12">
          <div className="card inventory-form-card settings-stack-card mb-3">
            <div className="inventory-form-card__head settings-section-head">
              <h5 className="card-title mb-0 d-flex align-items-center gap-2">
                <i className="ri-user-3-line settings-section-head__icon" aria-hidden />
                Perfil do Usuário
              </h5>
            </div>
            <div className="inventory-form-card__body">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="d-none"
                id="settings-avatar-input"
                onChange={onFileChange}
              />
              <div className="settings-profile-avatar mx-auto">
                <div className="settings-profile-avatar__ring">
                  {imgFailed ? (
                    <div className="settings-profile-avatar__fallback">
                      <i className="ri-user-3-fill" aria-hidden />
                    </div>
                  ) : (
                    <img
                      src={previewSrc}
                      alt=""
                      className="settings-profile-avatar__img"
                      onError={() => setImgFailed(true)}
                      onLoad={() => setImgFailed(false)}
                    />
                  )}
                </div>
                <label
                  htmlFor="settings-avatar-input"
                  className="settings-profile-avatar__camera"
                  title="Alterar foto"
                >
                  <i className="ri-camera-line" aria-hidden />
                </label>
              </div>
              <p className="text-center mb-1 fw-semibold mt-3 mb-0">{displayNamePreview}</p>
              <p className="text-center small text-muted mb-3">{email || "E-mail nao informado"}</p>

              <form className="inventory-form" onSubmit={handleProfileSubmit}>
                <div className="row g-3">
                  <div className="col-sm-6">
                    <div className="inventory-form__field">
                      <label className="inventory-form__label" htmlFor="pf-first">
                        Nome
                      </label>
                      <input
                        id="pf-first"
                        className="form-control inventory-form__control"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        autoComplete="given-name"
                      />
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="inventory-form__field">
                      <label className="inventory-form__label" htmlFor="pf-last">
                        Sobrenome
                      </label>
                      <input
                        id="pf-last"
                        className="form-control inventory-form__control"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        autoComplete="family-name"
                      />
                    </div>
                  </div>
                </div>
                <div className="inventory-form__field">
                  <label className="inventory-form__label" htmlFor="pf-email">
                    E-mail
                  </label>
                  <input
                    id="pf-email"
                    type="email"
                    className="form-control inventory-form__control"
                    value={isAdmin || isEmployee || isManager ? userEmail || email : email}
                    onChange={(e) => !isAdmin && !isEmployee && !isManager && setEmail(e.target.value)}
                    readOnly={isAdmin || isEmployee || isManager}
                    autoComplete="email"
                  />
                  {isAdmin ? (
                    <p className="small text-muted mb-0">
                      E-mail e senha do administrador não podem ser alterados por esta tela (apenas nome, sobrenome e
                      foto).
                    </p>
                  ) : null}
                  {isEmployee ? (
                    <p className="small text-muted mb-0">
                      E-mail e senha são definidos pela empresa. Você pode alterar nome, sobrenome e foto do perfil.
                    </p>
                  ) : null}
                  {isManager ? (
                    <p className="small text-muted mb-0">
                      E-mail e senha de login não são alterados por esta tela. Use nome, sobrenome e foto; para mudar o
                      nível (Gerente/Funcionário), informe a senha atual ao salvar.
                    </p>
                  ) : null}
                </div>
                {isAdmin || isEmployee ? null : isManager && accessRoleKey !== initialAccessRoleKey ? (
                  <div className="inventory-form__field">
                    <label className="inventory-form__label" htmlFor="pf-current-pwd">
                      Senha atual
                    </label>
                    <input
                      id="pf-current-pwd"
                      type="password"
                      className="form-control inventory-form__control"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                      placeholder="Obrigatória para confirmar a mudança de nível"
                    />
                    <p className="small text-muted mb-0">
                      Necessária para renovar a sessão após alterar entre Gerente e Funcionário.
                    </p>
                  </div>
                ) : null}
                <div className="inventory-form__field">
                  <label className="inventory-form__label" id="pf-access-label" htmlFor="pf-access">
                    Nível de Acesso
                  </label>
                  <SuppliersGlassSelect
                    id="pf-access"
                    listLabelledBy="pf-access-label"
                    value={isAdmin ? "ADMIN" : isEmployee ? "FUNCIONARIO" : accessRoleKey}
                    onChange={(v) => !isAdmin && !isEmployee && setAccessRoleKey(v)}
                    options={
                      isAdmin
                        ? ACCESS_LEVEL_ADMIN_READONLY
                        : isEmployee
                          ? ACCESS_LEVEL_EMPLOYEE_READONLY
                          : ACCESS_LEVEL_OPTIONS_STAFF
                    }
                    allowEmpty={false}
                    disabled={isAdmin || isEmployee}
                  />
                  {isAdmin ? (
                    <p className="small text-muted mb-0">
                      Existe apenas um administrador no sistema; o nível não pode ser alterado aqui.
                    </p>
                  ) : isEmployee ? (
                    <p className="small text-muted mb-0">O nível de acesso é definido pela gerência.</p>
                  ) : (
                    <p className="small text-muted mb-0">
                      Escolha <strong>Gerente</strong> ou <strong>Funcionário</strong>.
                    </p>
                  )}
                </div>
                {canRemovePhoto ? (
                  <button type="button" className="btn btn-outline-light btn-sm w-100 mb-3" onClick={handleRemovePhoto}>
                    Remover foto personalizada
                  </button>
                ) : null}
                {profileMessage.text ? (
                  <div className={`inventory-feedback inventory-feedback--${profileMessage.kind || "info"} mb-3`}>
                    {profileMessage.text}
                  </div>
                ) : null}
                <button type="submit" className="btn btn-primary w-100 inventory-form__submit">
                  <i className="ri-save-3-line me-2" aria-hidden />
                  Salvar perfil
                </button>
              </form>
            </div>
          </div>

          <div className="card inventory-form-card settings-stack-card">
            <div className="inventory-form-card__head settings-section-head">
              <h5 className="card-title mb-0 d-flex align-items-center gap-2">
                <i className="ri-information-line settings-section-head__icon" aria-hidden />
                Informações do Sistema
              </h5>
            </div>
            <div className="inventory-form-card__body">
              <dl className="settings-info-dl mb-3">
                <div className="settings-info-dl__row">
                  <dt>Versão</dt>
                  <dd>Estocaê v1.0.0</dd>
                </div>
                <div className="settings-info-dl__row">
                  <dt>Última Atualização</dt>
                  <dd>29/04/2025</dd>
                </div>
                <div className="settings-info-dl__row">
                  <dt>Licença</dt>
                  <dd>Licença Empresarial (Válida até 29/05/2026)</dd>
                </div>
              </dl>
              <div className="settings-status-banner mb-3">
                <i className="ri-checkbox-circle-line" aria-hidden />
                Sistema Atualizado
              </div>
              <dl className="settings-info-dl mb-3">
                <div className="settings-info-dl__row">
                  <dt>Último Backup</dt>
                  <dd>{formatBackupLabel(lastBackup)}</dd>
                </div>
              </dl>
              {backupFeedback ? (
                <p className="small text-success mb-2 mb-md-3">{backupFeedback}</p>
              ) : null}
              <button
                type="button"
                className="btn w-100 inventory-form__submit settings-backup-btn"
                onClick={runBackupMock}
              >
                <i className="ri-save-3-line me-2" aria-hidden />
                Fazer Backup Agora
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
