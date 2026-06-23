import { formatCHF, formatSignedCHF } from '../lib/money'

// Renders a CHF amount with consistent tabular figures so columns line up.
export default function Money({ value, signed = false, whole = false, className = '' }) {
  const text = signed ? formatSignedCHF(value) : formatCHF(value, { whole })
  return <span className={`tabular-nums ${className}`}>{text}</span>
}
