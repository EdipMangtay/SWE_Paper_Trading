// src/components/format.js
// Number/currency formatters used everywhere.

export function fmtUSD(n, opts = {}) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  // Use 2 decimals for values >= 1 or exactly 0; use 6 only for fractional
  // sub-dollar prices (e.g. SHIB, PEPE) where precision matters.
  const abs = Math.abs(n);
  const digits = abs >= 1 || abs === 0 ? 2 : 6;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: opts.digits ?? digits,
    maximumFractionDigits: opts.digits ?? digits
  }).format(n);
}

export function fmtPct(n, digits = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(digits)}%`;
}

export function fmtNum(n, digits = 4) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits
  }).format(n);
}

export function pctClass(n) {
  if (n > 0) return 'text-accent-green';
  if (n < 0) return 'text-accent-red';
  return 'text-white/60';
}
