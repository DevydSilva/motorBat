/**
 * =============================================================================
 * LoginPage.jsx — AUTENTICAÇÃO NA SPA
 * =============================================================================
 * Formulário controlado (email, senha, lembrar e-mail). Submissão chama onLogin
 * (definido em App.jsx), que por sua vez usa loginRequest de @/api — modo mock
 * ou HTTP conforme getUseMock().
 *
 * mapLoginError: traduz status HTTP / timeout / rede em mensagens em português
 * para o utilizador (não expor stack traces).
 *
 * Classes no documento: login-view no <html>/<body> para o CSS da tela de login
 * não afetar o resto da app (ver login-blueprint-overrides.css).
 * Guia: docs/GUIA_PEDAGOGICO_BATMOTOR.md
 * =============================================================================
 */
import { useEffect, useState } from "react";
import telaDeLogin from "@/assets/TelaDeLOGIN.svg";
import logoMark from "@/assets/LOGO.svg";
import logoType from "@/assets/TextoDALOGO (1).svg";
import AuthBatmotorShell from "@/components/auth/AuthBatmotorShell";
import { getUseMock } from "@/api/client.js";
/** Depois de app.css — força o mockup sobre `main.min.css` (Bootstrap) do index.html */
import "@/styles/login-blueprint-overrides.css";

const REMEMBER_EMAIL_KEY = "batmotor-remember-email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidLoginEmail(s) {
  const t = String(s || "").trim();
  return t.length > 0 && EMAIL_RE.test(t);
}

function mapLoginError(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const msg = data?.message ?? data?.error;
  if (status === 400) {
    const flat = data?.issues?.formErrors;
    if (Array.isArray(flat) && flat.length) return flat.join(" ");
    return msg || "Dados inválidos. Confira e-mail e senha.";
  }
  if (status === 401) {
    return msg || "E-mail ou senha incorretos.";
  }
  if (status === 403) {
    return msg || "Acesso não permitido para este usuário.";
  }
  if (status === 500) {
    return msg || "Erro no servidor. Tente novamente em instantes.";
  }
  if (!err?.response && (err?.code === "ECONNABORTED" || err?.message?.includes?.("timeout"))) {
    return getUseMock()
      ? "Tempo esgotado. Tente de novo."
      : "A API demorou demais ou não respondeu. Confira se o backend está rodando.";
  }
  if (!err?.response) {
    if (err?.message === "Credenciais invalidas") {
      return "E-mail ou senha incorretos.";
    }
    return getUseMock()
      ? "Não foi possível entrar. Confira e-mail e senha."
      : "Servidor indisponível. Tente mais tarde ou confira se a API da empresa está no ar.";
  }
  return msg || "Não foi possível entrar. Tente novamente.";
}

function LoginPage({ onLogin, initialNotice = "" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [pwdVisible, setPwdVisible] = useState(false);
  const [error, setError] = useState(initialNotice);
  const [forgotHint, setForgotHint] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("login-view");
    document.body.classList.add("login-view");
    return () => {
      document.documentElement.classList.remove("login-view");
      document.body.classList.remove("login-view");
    };
  }, []);

  useEffect(() => {
    if (initialNotice) setError(initialNotice);
  }, [initialNotice]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (saved && isValidLoginEmail(saved)) {
        setEmail(String(saved).trim().toLowerCase());
        setRemember(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Informe e-mail e senha.");
      return;
    }
    if (!isValidLoginEmail(email)) {
      setError("E-mail inválido.");
      return;
    }
    setError("");
    setForgotHint(false);
    setIsLoading(true);
    const fallbackName = "Usuário";
    try {
      await onLogin({
        email: email.trim().toLowerCase(),
        password,
        fallbackName
      });
      try {
        if (remember) {
          localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim().toLowerCase());
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
      } catch {
        /* ignore */
      }
    } catch (_err) {
      setError(mapLoginError(_err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthBatmotorShell variant="fullscreen" backgroundSrc={telaDeLogin}>
      <main className="login-batmotor__main" role="main" aria-labelledby="login-heading-visually">
        <div className="login-batmotor__card--blueprint">
        <header className="login-batmotor__header login-batmotor__header--blueprint">
          <h1 id="login-heading-visually" className="visually-hidden">
            Batmotor — entrar
          </h1>
          <img src={logoMark} alt="" className="login-batmotor__logo-mark" decoding="async" />
          <img src={logoType} alt="Batmotor — Motores e Baterias" className="login-batmotor__logo-type" decoding="async" />
        </header>

        <form className="login-batmotor__form login-batmotor__form--blueprint" onSubmit={handleSubmit} noValidate>
          <div className="login-batmotor__field">
            <span className="login-batmotor__field-icon login-batmotor__field-icon--blueprint" aria-hidden>
              <i className="ri-user-3-line" />
            </span>
            <input
              id="login-email"
              className="login-batmotor__input login-batmotor__input--blueprint"
              type="email"
              autoComplete="username"
              placeholder="USUÁRIO"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="E-mail (usuário)"
            />
          </div>

          <div className="login-batmotor__field">
            <span className="login-batmotor__field-icon login-batmotor__field-icon--blueprint" aria-hidden>
              <i className="ri-lock-2-line" />
            </span>
            <input
              id="login-password"
              className="login-batmotor__input login-batmotor__input--blueprint login-batmotor__input--has-toggle"
              type={pwdVisible ? "text" : "password"}
              autoComplete="current-password"
              placeholder="SENHA"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-label="Senha"
            />
            <button
              type="button"
              className="login-batmotor__toggle-pwd login-batmotor__toggle-pwd--blueprint"
              onClick={() => setPwdVisible((v) => !v)}
              aria-label={pwdVisible ? "Ocultar senha" : "Mostrar senha"}
            >
              <i className={pwdVisible ? "ri-eye-line" : "ri-eye-off-line"} aria-hidden />
            </button>
          </div>

          <div className="login-batmotor__options login-batmotor__options--blueprint">
            <label className="login-batmotor__remember login-batmotor__remember--blueprint">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>Lembrar e-mail</span>
            </label>
            <button
              type="button"
              className="login-batmotor__link login-batmotor__link--blueprint"
              onClick={() => {
                setForgotHint((v) => !v);
                setError("");
              }}
            >
              Esqueceu a senha?
            </button>
          </div>

          {forgotHint ? (
            <p className="login-batmotor__hint login-batmotor__hint--blueprint" role="status">
              Recuperação automática ainda não está disponível. Peça a um administrador para redefinir seu acesso.
            </p>
          ) : null}

          {error ? <p className="login-batmotor__error login-batmotor__error--blueprint">{error}</p> : null}

          <button
            className="login-batmotor__btn login-batmotor__btn--submit login-batmotor__btn--blueprint"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Entrando…" : "Entrar"}
          </button>
        </form>
        </div>
      </main>
    </AuthBatmotorShell>
  );
}

export default LoginPage;
