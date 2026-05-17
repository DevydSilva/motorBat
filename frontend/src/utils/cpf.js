/** CPF (mesma regra do backend). */

export function normalizeCpfDigits(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 11);
}

export function isValidCpf(value) {
  const c = normalizeCpfDigits(value);
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(c.charAt(i), 10) * (10 - i);
  let r = sum % 11;
  const d1 = r < 2 ? 0 : 11 - r;
  if (d1 !== parseInt(c.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(c.charAt(i), 10) * (11 - i);
  r = sum % 11;
  const d2 = r < 2 ? 0 : 11 - r;
  return d2 === parseInt(c.charAt(10), 10);
}

/** Máscara progressiva (digitação) ou CPF completo. */
export function formatCpfDisplay(digits) {
  const d = normalizeCpfDigits(digits);
  if (!d) return "";
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
