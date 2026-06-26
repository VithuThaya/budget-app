// Shared derivations used by pages and the intelligence modules.
// Keeping these pure + centralised guarantees Dashboard, Budgets and Reports
// all compute the same numbers from the same source arrays.
import { isThisMonth, isThisWeek, startOfWeek, addDays, parseISO } from '../lib/dates'

/** Total spent this calendar month. */
export function monthSpend(expenses) {
  return (expenses || []).filter((e) => isThisMonth(e.date)).reduce((a, e) => a + Number(e.amount), 0)
}

/** Total spent this ISO week. */
export function weekSpend(expenses) {
  return (expenses || []).filter((e) => isThisWeek(e.date)).reduce((a, e) => a + Number(e.amount), 0)
}

/** Spend grouped by category id (optionally only this month). */
export function spendByCategory(expenses, { monthOnly = true } = {}) {
  const map = new Map()
  for (const e of expenses || []) {
    if (monthOnly && !isThisMonth(e.date)) continue
    map.set(e.category_id, (map.get(e.category_id) || 0) + Number(e.amount))
  }
  return map
}

/** Build pie/legend data [{ name, value, color }] for this month's spend. */
export function categoryPieData(expenses, categoryMap, { monthOnly = true } = {}) {
  const byCat = spendByCategory(expenses, { monthOnly })
  const rows = []
  for (const [catId, value] of byCat.entries()) {
    if (value <= 0) continue
    const cat = categoryMap.get(catId)
    rows.push({ name: cat?.name || 'Uncategorised', value, color: cat?.color || '#64748b', categoryId: catId })
  }
  return rows.sort((a, b) => b.value - a.value)
}

/** Per-category total over the last `n` ISO weeks (excluding current week). */
export function trailingWeeklyAverage(expenses, categoryId, weeks = 4) {
  const thisWeekStart = startOfWeek()
  let total = 0
  for (const e of expenses || []) {
    if (e.category_id !== categoryId) continue
    const d = parseISO(e.date)
    const start = addDays(thisWeekStart, -7 * weeks)
    if (d >= start && d < thisWeekStart) total += Number(e.amount)
  }
  return total / weeks
}

/** Current ISO-week total for one category. */
export function currentWeekCategory(expenses, categoryId) {
  const start = startOfWeek()
  const end = addDays(start, 7)
  let total = 0
  for (const e of expenses || []) {
    if (e.category_id !== categoryId) continue
    const d = parseISO(e.date)
    if (d >= start && d < end) total += Number(e.amount)
  }
  return total
}

/** Net for the month: income minus expenses. */
export function monthIncome(incomes) {
  return (incomes || []).filter((i) => isThisMonth(i.date)).reduce((a, i) => a + Number(i.amount), 0)
}

// --- Fixed costs (planning layer) -----------------------------------------
// Fixed costs are recurring obligations stored with a period. To compare them
// against monthly income we normalise every period to a single monthly value.
export const PERIOD_TO_MONTHLY = {
  weekly: 52 / 12, // ≈ 4.3333 weeks per month
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
}

/** One fixed cost expressed as a monthly amount (CHF). */
export function monthlyFixedCost(fc) {
  const factor = PERIOD_TO_MONTHLY[fc.period] ?? 1
  return Number(fc.amount) * factor
}

/** Sum of all ACTIVE fixed costs as a monthly amount. */
export function monthlyFixedTotal(fixedCosts) {
  return (fixedCosts || [])
    .filter((fc) => fc.active !== false)
    .reduce((a, fc) => a + monthlyFixedCost(fc), 0)
}

/** What's left of this month's income after fixed costs are subtracted. */
export function availableToSpend(incomes, fixedCosts) {
  return monthIncome(incomes) - monthlyFixedTotal(fixedCosts)
}
