// Swiss Franc formatting + small numeric helpers.
// Uses the de-CH locale so thousands use the Swiss apostrophe separator
// and amounts read like "CHF 1’234.55".

const chf = new Intl.NumberFormat('de-CH', {
  style: 'currency',
  currency: 'CHF',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const chfWhole = new Intl.NumberFormat('de-CH', {
  style: 'currency',
  currency: 'CHF',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** Format a number as CHF currency, e.g. 1234.5 -> "CHF 1’234.50". */
export function formatCHF(value, { whole = false } = {}) {
  const n = Number(value)
  if (!Number.isFinite(n)) return chf.format(0)
  return whole ? chfWhole.format(n) : chf.format(n)
}

/** Format a signed delta with explicit + / - sign. */
export function formatSignedCHF(value) {
  const n = Number(value) || 0
  const sign = n > 0 ? '+' : n < 0 ? '−' : ''
  return `${sign}${formatCHF(Math.abs(n))}`
}

/** Format a percentage, e.g. 0.321 -> "32%". Accepts a ratio (0..1). */
export function formatPct(ratio, { digits = 0 } = {}) {
  const n = Number(ratio)
  if (!Number.isFinite(n)) return '0%'
  return `${(n * 100).toFixed(digits)}%`
}

/** Parse a user-typed amount ("12.50", "1'234,5") into a clean number. */
export function parseAmount(input) {
  if (typeof input === 'number') return input
  if (!input) return 0
  const cleaned = String(input)
    .replace(/['\s’]/g, '')
    .replace(',', '.')
    .replace(/[^0-9.]/g, '')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

/** Sum a list of objects by a numeric field (default "amount"). */
export function sumBy(list, field = 'amount') {
  return (list || []).reduce((acc, item) => acc + (Number(item?.[field]) || 0), 0)
}
