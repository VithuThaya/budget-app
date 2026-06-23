// Savings Potential
// Estimates how much could be saved this month if discretionary categories
// were trimmed toward a target share of their current spend.
import { categoryPieData, monthSpend } from './selectors'

// Categories considered "flexible" — trimming these is realistic.
const DISCRETIONARY = ['Dining', 'Entertainment', 'Shopping', 'Coffee', 'Other']
// Suggested trim factor for discretionary spend (reduce by 20%).
const TRIM = 0.2

export function savingsPotential({ expenses, categoryMap }) {
  const pie = categoryPieData(expenses, categoryMap, { monthOnly: true })
  const total = monthSpend(expenses)

  const items = pie
    .map((row) => {
      const flexible = DISCRETIONARY.includes(row.name)
      const trim = flexible ? TRIM : 0
      const saving = row.value * trim
      return {
        name: row.name,
        color: row.color,
        current: row.value,
        suggested: row.value - saving,
        saving,
        flexible,
      }
    })
    .filter((i) => i.saving > 0)
    .sort((a, b) => b.saving - a.saving)

  const totalSaving = items.reduce((a, i) => a + i.saving, 0)
  return {
    items,
    totalSaving,
    total,
    pctOfSpend: total > 0 ? totalSaving / total : 0,
  }
}
