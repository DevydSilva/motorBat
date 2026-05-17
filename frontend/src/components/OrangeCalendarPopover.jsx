/**
 * Calendário popover e campo de data (formato dia/mês/ano) para formulários de movimentação e modais.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];

const WEEK_LETTERS = ["D", "S", "T", "Q", "Q", "S", "S"];

function formatDMY(d) {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

function parseDMY(s) {
  const m = String(s || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const y = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

/**
 * Só dígitos (máx. 8). Com allowTrailingSlash, coloca / após dia e mês ao **digitar**.
 * Ao apagar (allowTrailingSlash false), não recoloca / no fim — dá para apagar até o início.
 */
function maskDMYFromDigits(input, { allowTrailingSlash = true } = {}) {
  const dig = String(input || "").replace(/\D/g, "").slice(0, 8);
  if (dig.length === 0) return "";
  const dd = dig.slice(0, 2);
  if (dig.length <= 2) {
    return allowTrailingSlash && dig.length === 2 ? `${dd}/` : dd;
  }
  const mm = dig.slice(2, 4);
  if (dig.length <= 4) {
    if (dig.length === 4) {
      return allowTrailingSlash ? `${dd}/${mm}/` : `${dd}/${mm}`;
    }
    return `${dd}/${mm}`;
  }
  return `${dd}/${mm}/${dig.slice(4)}`;
}

function caretAfterDigitCount(formatted, digitCount) {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      seen++;
      if (seen === digitCount) {
        if (formatted[i + 1] === "/") return Math.min(i + 2, formatted.length);
        return Math.min(i + 1, formatted.length);
      }
    }
  }
  return formatted.length;
}

function buildMonthGrid(viewYear, viewMonth) {
  const first = new Date(viewYear, viewMonth, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c === null)) rows.pop();
  const last = rows[rows.length - 1];
  if (last && last.length < 7) rows[rows.length - 1] = [...last, ...Array(7 - last.length).fill(null)];
  return rows;
}

/**
 * Calendário estilo referência: título mês/ano laranja, dias D S T Q Q S S, seleção círculo laranja.
 */
export function OrangeCalendarPopover({ value, onChange, open, onClose, anchorRef }) {
  const initial = value instanceof Date && !Number.isNaN(value.getTime()) ? value : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const d = value instanceof Date && !Number.isNaN(value.getTime()) ? value : null;
    if (d) {
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      const t = e.target;
      if (popoverRef.current?.contains(t)) return;
      if (anchorRef?.current?.contains(t)) return;
      onClose?.();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose, anchorRef]);

  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };

  const goNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const pickDay = (day) => {
    if (day == null) return;
    const dt = new Date(viewYear, viewMonth, day);
    onChange(dt);
    onClose?.();
  };

  if (!open) return null;

  const selectedDay =
    value instanceof Date && !Number.isNaN(value.getTime()) && value.getFullYear() === viewYear && value.getMonth() === viewMonth
      ? value.getDate()
      : null;

  return (
    <div ref={popoverRef} className="yellow-cal" role="dialog" aria-label="Calendário">
      <div className="yellow-cal__header">
        <button type="button" className="yellow-cal__nav" onClick={goPrev} aria-label="Mês anterior">
          <i className="ri-arrow-left-s-line" aria-hidden />
        </button>
        <span className="yellow-cal__title">
          {MONTHS_PT[viewMonth]} {viewYear}
        </span>
        <button type="button" className="yellow-cal__nav" onClick={goNext} aria-label="Próximo mês">
          <i className="ri-arrow-right-s-line" aria-hidden />
        </button>
      </div>
      <div className="yellow-cal__weekdays">
        {WEEK_LETTERS.map((letter, i) => (
          <span key={`${letter}-${i}`} className="yellow-cal__weekday">
            {letter}
          </span>
        ))}
      </div>
      <div className="yellow-cal__grid">
        {grid.map((row, ri) => (
          <div key={ri} className="yellow-cal__row">
            {row.map((cell, ci) =>
              cell == null ? (
                <span key={`e-${ri}-${ci}`} className="yellow-cal__cell yellow-cal__cell--empty" />
              ) : (
                <button
                  key={cell}
                  type="button"
                  className={`yellow-cal__cell${selectedDay === cell ? " is-selected" : ""}`}
                  onClick={() => pickDay(cell)}
                >
                  {cell}
                </button>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Campo data dd/mm/aaaa + botão laranja que abre o calendário. */
export function ExpiryDateField({ id, valueStr, onChangeStr, selectedDate, onSelectDate }) {
  const [calOpen, setCalOpen] = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const cursorDigitsRef = useRef(null);

  const onInputChange = (e) => {
    const el = e.target;
    const raw = el.value;
    const inputType = e.nativeEvent?.inputType ?? "";
    const isDelete =
      inputType === "deleteContentBackward" ||
      inputType === "deleteContentForward" ||
      inputType === "deleteByCut" ||
      raw.length < valueStr.length;
    const masked = maskDMYFromDigits(raw, { allowTrailingSlash: !isDelete });
    const digitsBefore = String(raw.slice(0, el.selectionStart ?? 0)).replace(/\D/g, "").length;
    cursorDigitsRef.current = digitsBefore;
    onChangeStr(masked);
    const d = parseDMY(masked);
    if (d) onSelectDate(d);
  };

  useLayoutEffect(() => {
    if (cursorDigitsRef.current == null) return;
    const el = inputRef.current;
    if (!el) {
      cursorDigitsRef.current = null;
      return;
    }
    const n = cursorDigitsRef.current;
    cursorDigitsRef.current = null;
    const pos = caretAfterDigitCount(valueStr, n);
    el.setSelectionRange(pos, pos);
  }, [valueStr]);

  return (
    <div className="expiry-date-field" ref={wrapRef}>
      <div className="expiry-date-field__input-wrap">
        <input
          ref={inputRef}
          id={id}
          type="text"
          className="form-control expiry-date-field__input"
          placeholder="dd/mm/aaaa"
          inputMode="numeric"
          autoComplete="off"
          value={valueStr}
          onChange={onInputChange}
        />
        <button
          type="button"
          className="expiry-date-field__cal-btn"
          aria-label="Abrir calendário"
          onClick={() => setCalOpen((o) => !o)}
        >
          <i className="ri-calendar-line" aria-hidden />
        </button>
      </div>
      <OrangeCalendarPopover
        value={selectedDate}
        onChange={(d) => {
          onSelectDate(d);
          onChangeStr(formatDMY(d));
        }}
        open={calOpen}
        onClose={() => setCalOpen(false)}
        anchorRef={wrapRef}
      />
    </div>
  );
}

export { formatDMY, parseDMY };
