/**
 * Layout em duas colunas para login: hero + ilustração à esquerda, formulário à direita.
 */
import AuthHeroIllustration from "./AuthHeroIllustration";

function AuthSplitLayout({ children }) {
  return (
    <div className="auth-split">
      <div className="auth-split__mesh" aria-hidden />
      <div className="auth-split__bokeh" aria-hidden>
        <span className="auth-split__blob auth-split__blob--1" />
        <span className="auth-split__blob auth-split__blob--2" />
        <span className="auth-split__blob auth-split__blob--3" />
        <span className="auth-split__blob auth-split__blob--4" />
      </div>
      <div className="auth-split__wave" aria-hidden />

      <div className="auth-split__grid">
        <div className="auth-split__visual-col">
          <AuthHeroIllustration />
        </div>
        <div className="auth-split__panel-col">
          <div className="auth-split__panel">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default AuthSplitLayout;
