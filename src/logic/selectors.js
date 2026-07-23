// Shared derivations used by pages and the intelligence modules.
// Keeping these pure + centralised guarantees Dashboard, Budgets and Reports
// all compute the same numbers from the same source arrays.
import { isSameMonth, isThisWeek, startOfWeek, addDays, parseISO, todayISO } from '../lib/dates'

/** Total spent in the month of `ref` (default: current month). */
export function monthSpend(expenses, ref) {
  return (expenses || []).filter((e) => isSameMonth(e.date, ref)).reduce((a, e) => a + Number(e.amount), 0)
}

/** Total spent this ISO week. */
export function weekSpend(expenses) {
  return (expenses || []).filter((e) => isThisWeek(e.date)).reduce((a, e) => a + Number(e.amount), 0)
}

/** Spend grouped by category id (optionally only the month of `ref`). */
export function spendByCategory(expenses, { monthOnly = true, ref } = {}) {
  const map = new Map()
  for (const e of expenses || []) {
    if (monthOnly && !isSameMonth(e.date, ref)) continue
    map.set(e.category_id, (map.get(e.category_id) || 0) + Number(e.amount))
  }
  return map
}

/** Build pie/legend data [{ name, value, color }] for the month's spend. */
export function categoryPieData(expenses, categoryMap, { monthOnly = true, ref } = {}) {
  const byCat = spendByCategory(expenses, { monthOnly, ref })
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

/** Total income in the month of `ref` (default: current month). */
export function monthIncome(incomes, ref) {
  return (incomes || []).filter((i) => isSameMonth(i.date, ref)).reduce((a, i) => a + Number(i.amount), 0)
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

// How often each period bills within a month (used to step charge dates).
const PERIOD_STEP_MONTHS = { monthly: 1, quarterly: 3, yearly: 12 }

/**
 * How many times a single fixed cost has actually been billed on/before `refISO`.
 * Billing model: a cost bills on the 1st, starting the 1st of the month AFTER it
 * was created (you add it while setting up for the coming month), then every
 * period thereafter — monthly every month, quarterly every 3, yearly every 12,
 * weekly every 7 days. This mirrors real Swiss billing (~start of month).
 * ponytail: billing assumed on the 1st; if a cost bills mid-month the balance
 * leads the real debit by a few weeks — add a per-cost billing day if that matters.
 */
export function fixedChargeCount(fc, refISO = todayISO()) {
  if (fc.active === false) return 0
  const created = parseISO(String(fc.created_at ?? refISO).slice(0, 10))
  const ref = parseISO(refISO)
  if (fc.period === 'weekly') {
    const first = addDays(created, 7)
    if (ref < first) return 0
    return Math.floor((ref - first) / (7 * 86400000)) + 1
  }
  const step = PERIOD_STEP_MONTHS[fc.period] ?? 1
  const first = new Date(created.getFullYear(), created.getMonth() + 1, 1) // 1st of next month
  if (ref < first) return 0
  const months = (ref.getFullYear() - first.getFullYear()) * 12 + (ref.getMonth() - first.getMonth())
  return Math.floor(months / step) + 1
}

/** Total fixed-cost money actually billed to the account on/before `refISO`. */
export function fixedChargesToDate(fixedCosts, refISO = todayISO()) {
  return (fixedCosts || []).reduce((sum, fc) => sum + Number(fc.amount) * fixedChargeCount(fc, refISO), 0)
}

/**
 * Running account balance, bank-style: every income minus every expense minus
 * every fixed cost that has actually been billed to date (see fixedChargesToDate).
 * The user carries prior-month leftovers forward as an income, so this mirrors
 * their real bank balance and naturally rolls into next month. Savings pots
 * (earmarks, money still on the account) are intentionally NOT subtracted here.
 */
export function accountBalance(incomes, expenses, fixedCosts = [], refISO = todayISO()) {
  const income = (incomes || []).reduce((a, i) => a + Number(i.amount), 0)
  const spent = (expenses || []).reduce((a, e) => a + Number(e.amount), 0)
  return income - spent - fixedChargesToDate(fixedCosts, refISO)
}

/**
 * Money still free this month = the disposable-income chain end point:
 * income − fixed costs − spent − already saved. This is BOTH the Dashboard's
 * "Übrig zum Ausgeben" and the Savings page's "Verfügbar zum Sparen" — one
 * definition so the two pages never drift. `savedThisMonth` is passed in
 * (from savings.js `monthSavings`) to avoid a circular import.
 */
export function leftToSpendThisMonth({ incomes, expenses, fixedCosts, savedThisMonth = 0 }) {
  return monthIncome(incomes) - monthlyFixedTotal(fixedCosts) - monthSpend(expenses) - savedThisMonth
}
