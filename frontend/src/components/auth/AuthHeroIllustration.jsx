/** Cena estilo template: ilustração leve com movimento (CSS). */
function AuthHeroIllustration() {
  return (
    <div className="auth-hero" aria-hidden>
      <svg className="auth-hero__svg" viewBox="0 0 520 420" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00dcff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ff4ecd" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="g-desk" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c4a574" />
            <stop offset="100%" stopColor="#8b6914" />
          </linearGradient>
          <filter id="blur-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="b" />
          </filter>
        </defs>

        <ellipse className="auth-hero__shadow" cx="260" cy="360" rx="140" ry="18" fill="rgba(0,0,0,0.25)" />

        <g className="auth-hero__ghost-screen" opacity="0.35">
          <rect x="80" y="48" width="280" height="200" rx="16" fill="rgba(30,40,90,0.5)" stroke="rgba(120,200,255,0.25)" strokeWidth="2" />
          <rect x="100" y="72" width="80" height="10" rx="4" fill="rgba(120,200,255,0.4)" />
          <rect x="100" y="92" width="120" height="8" rx="3" fill="rgba(180,180,255,0.2)" />
          <rect x="100" y="120" width="60" height="80" rx="6" fill="rgba(83,155,249,0.25)" />
          <rect x="170" y="120" width="60" height="50" rx="6" fill="rgba(46,229,157,0.2)" />
          <rect x="240" y="120" width="100" height="100" rx="6" fill="rgba(255,100,200,0.12)" />
        </g>

        <path
          className="auth-hero__plant auth-hero__plant--back"
          d="M48 320 Q20 260 55 220 Q75 200 90 230 Q85 270 78 320 Z"
          fill="rgba(46,229,157,0.35)"
        />
        <path
          className="auth-hero__plant auth-hero__plant--front"
          d="M72 328 Q55 280 85 250 Q100 240 108 270 Q100 300 95 328 Z"
          fill="rgba(67,170,139,0.55)"
        />

        <g className="auth-hero__desk">
          <rect x="130" y="268" width="260" height="28" rx="6" fill="url(#g-desk)" />
          <rect x="140" y="252" width="240" height="20" rx="4" fill="#a08050" />
        </g>

        <g className="auth-hero__laptop">
          <rect x="200" y="175" width="120" height="78" rx="8" fill="#1a1f3a" stroke="rgba(120,200,255,0.35)" strokeWidth="2" />
          <rect x="208" y="183" width="104" height="56" rx="4" fill="#16213e" />
          <rect x="180" y="248" width="160" height="10" rx="3" fill="#2a3358" />
          <rect x="215" y="195" width="40" height="6" rx="2" fill="rgba(0,220,255,0.5)" className="auth-hero__blink" />
          <rect x="215" y="208" width="90" height="4" rx="2" fill="rgba(255,255,255,0.15)" />
          <rect x="215" y="218" width="70" height="4" rx="2" fill="rgba(255,255,255,0.1)" />
        </g>

        <g className="auth-hero__person">
          <ellipse cx="268" cy="148" rx="28" ry="30" fill="#e8c4a8" />
          <path d="M252 168 Q248 200 255 245 L281 245 Q288 200 284 168 Q268 158 252 168" fill="#6eb5ff" />
          <ellipse cx="268" cy="138" rx="32" ry="26" fill="#c4a088" />
          <path d="M236 138 Q268 115 300 138 Q295 128 268 120 Q241 128 236 138" fill="#a08068" />
        </g>

        <circle className="auth-hero__orb" cx="420" cy="90" r="50" fill="url(#g-glow)" filter="url(#blur-soft)" />
      </svg>
    </div>
  );
}

export default AuthHeroIllustration;
