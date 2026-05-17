/**
 * @file Dropdown estilizado (categoria/fornecedor) para o modal de produto.
 */
import { useEffect, useRef, useState } from "react";

/**
 * Dropdown de categoria/fornecedor no modal de produto — hover em amarelo (Estocaê).
 */
export default function ProductOrangeSelect({
  id,
  listLabelledBy,
  value,
  onChange,
  options,
  placeholder = "Selecione um tipo",
  required = false
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

  const selected = options.find((o) => String(o.value) === String(value));
  const display = selected?.label ?? placeholder;

  const pick = (v) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div className="product-orange-select" ref={wrapRef}>
      <button
        type="button"
        id={id}
        className={`product-orange-select__trigger${open ? " is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={value === "" || value == null ? "product-orange-select__trigger--placeholder" : undefined}>
          {display}
        </span>
        <i className="product-orange-select__chevron ri-arrow-down-s-line" aria-hidden />
      </button>
      {open ? (
        <ul className="product-orange-select__menu" role="listbox" aria-labelledby={listLabelledBy || id}>
          <li role="none">
            <button
              type="button"
              role="option"
              aria-selected={value === "" || value == null}
              className={`product-orange-select__option product-orange-select__option--placeholder${
                value === "" || value == null ? " is-active" : ""
              }`}
              onClick={() => pick("")}
            >
              {placeholder}
            </button>
          </li>
          {options.map((o) => (
            <li key={String(o.value)} role="none">
              <button
                type="button"
                role="option"
                aria-selected={String(value) === String(o.value)}
                className={`product-orange-select__option${String(value) === String(o.value) ? " is-active" : ""}`}
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
