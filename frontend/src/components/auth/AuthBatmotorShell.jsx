/**
 * Invólucro visual das páginas de login (variantes split / centered) com ilustração e cartão.
 */
import telaDeLoginArt from "@/assets/TelaDeLOGIN.svg";

/**
 * Shell de autenticação.
 * - `variant="split"`: hero + ilustração | card (layout legado).
 * - `variant="fullscreen"`: imagem de fundo em toda a viewport + card centralizado (login blueprint).
 */
function AuthBatmotorShell({
  variant = "split",
  backgroundSrc,
  heroTitle,
  heroSub,
  heroTitleId = "batmotor-hero-title",
  brandLogo,
  brandTagline,
  children
}) {
  const showBrand = Boolean(brandLogo);

  if (variant === "fullscreen" && backgroundSrc) {
    return (
      <div className="login-batmotor login-batmotor--blueprint">
        <div className="login-batmotor__bg" aria-hidden>
          <img src={backgroundSrc} alt="" className="login-batmotor__bg-img" decoding="async" />
          <div className="login-batmotor__bg-scrim" aria-hidden />
        </div>
        <div className="login-batmotor__center-wrap">{children}</div>
      </div>
    );
  }

  return (
    <div className="login-batmotor">
      <div className="login-batmotor__layout">
        <section
          className={`login-batmotor__hero${showBrand ? " login-batmotor__hero--with-brand" : ""}`}
          aria-labelledby={heroTitleId}
        >
          {showBrand ? (
            <div className="login-batmotor__hero-brand">
              <img src={brandLogo} alt="Batmotor" className="login-batmotor__hero-brand-img" decoding="async" />
              {brandTagline ? <p className="login-batmotor__hero-brand-tag">{brandTagline}</p> : null}
            </div>
          ) : null}

          {heroTitle ? (
            <h2
              id={heroTitleId}
              className={showBrand ? "visually-hidden" : "login-batmotor__hero-title"}
            >
              {heroTitle}
            </h2>
          ) : (
            <h2 id={heroTitleId} className="visually-hidden">
              Batmotor
            </h2>
          )}

          {!showBrand && heroSub ? <p className="login-batmotor__hero-sub">{heroSub}</p> : null}

          <div className="login-batmotor__hero-art-wrap">
            <img src={telaDeLoginArt} alt="" className="login-batmotor__hero-art" decoding="async" />
          </div>
        </section>

        <div className="login-batmotor__aside">{children}</div>
      </div>
    </div>
  );
}

export default AuthBatmotorShell;
