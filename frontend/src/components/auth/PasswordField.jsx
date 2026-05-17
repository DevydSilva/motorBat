/**
 * Campo de senha com alternância mostrar/ocultar e acessibilidade (`useId`).
 */
import { useId, useState } from "react";

function PasswordField({ label, placeholder, value, onChange, required, id: idProp }) {
  const genId = useId();
  const id = idProp || genId;
  const [visible, setVisible] = useState(false);

  return (
    <div className="auth-field">
      <label className="auth-label" htmlFor={id}>
        {label}
        {required ? <span className="auth-required"> *</span> : null}
      </label>
      <div className="auth-input-wrap">
        <input
          id={id}
          className="auth-input"
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
        />
        <button
          type="button"
          className="auth-input-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          tabIndex={-1}
        >
          <i className={visible ? "ri-eye-line" : "ri-eye-off-line"} aria-hidden />
        </button>
      </div>
    </div>
  );
}

export default PasswordField;
