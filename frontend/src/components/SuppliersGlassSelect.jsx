/**
 * @file Select customizado de fornecedores (lista em “vidro” com hover).
 */
import { useEffect, useRef, useState } from "react";

/**
 * Lista suspensa com seta (substitui <select>): permite hover em vidro azul nas opções.
 * O <select> nativo não permite estilizar o realce do sistema ao passar o mouse.
 */
export default function SuppliersGlassSelect({
  id,
  listLabelledBy,
  value,
  onChange,
  options,
  placeholder = "Selecione...",
  required = false,
  large = false,
  allowEmpty = true,
  disabled = false
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const display = selected?.label ?? placeholder;

  const pick = (v) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div className="suppliers-glass-select" ref={wrapRef}>
      <button
        type="button"
        id={id}
        className={`suppliers-glass-select__trigger${open ? " is-open" : ""}${large ? " suppliers-glass-select__trigger--lg" : ""}${
          disabled ? " is-disabled" : ""
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span className={value === "" || value == null ? "suppliers-glass-select__trigger--placeholder" : undefined}>
          {display}
        </span>
        <i className="suppliers-glass-select__chevron ri-arrow-down-s-line" aria-hidden />
      </button>
      {open && !disabled ? (
        <ul className="suppliers-glass-select__menu" role="listbox" aria-labelledby={listLabelledBy || id}>
          {allowEmpty ? (
            <li role="none">
              <button
                type="button"
                role="option"
                aria-selected={value === "" || value == null}
                className={`suppliers-glass-select__option suppliers-glass-select__option--placeholder${
                  value === "" || value == null ? " is-active" : ""
                }`}
                onClick={() => pick("")}
              >
                {placeholder}
              </button>
            </li>
          ) : null}
          {options.map((o) => (
            <li key={o.value} role="none">
              <button
                type="button"
                role="option"
                aria-selected={value === o.value}
                className={`suppliers-glass-select__option${value === o.value ? " is-active" : ""}`}
                onClick={() => pick(o.value)}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
