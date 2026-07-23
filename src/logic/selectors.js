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

/**
 * Expected income per month for planning: recurring income templates
 * (recurring=true) normalised to a monthly amount. This is a stable anchor that
 * works before payday, unlike monthIncome which only counts income already posted
 * this month. Falls back to the actual month income when no recurring template
 * exists, so a manually-entered salary still anchors the plan.
 */
export function expectedMonthlyIncome(incomes) {
  const recurring = (incomes || [])
    .filter((i) => i.recurring)
    .reduce((a, i) => a + Number(i.amount) * (i.recur_interval === 'weekly' ? 52 / 12 : 1), 0)
  return recurring > 0 ? recurring : monthIncome(incomes)
}

// How many months apart each period recurs (used to decide when a non-monthly
// cost is due again from its last paid month).
const PERIOD_STEP_MONTHS = { monthly: 1, quarterly: 3, yearly: 12 }

const monthKey = (iso) => String(iso).slice(0, 7) // 'YYYY-MM'
function monthsBetweenKeys(a, b) {
  const [ay, am] = a.split('-').map(Number)
  const [by, bm] = b.split('-').map(Number)
  return (by - ay) * 12 + (bm - am)
}

/**
 * Fixed costs are settled by the user ticking "bezahlt" per month — bank debit
 * dates drift around weekends/holidays, so a computed date can't be trusted.
 * `paid_months` (text[] of 'YYYY-MM') records the months a cost was actually
 * paid. The running balance subtracts every paid occurrence; the month-end
 * projection additionally subtracts what's still open this month.
 */

/** Total fixed-cost money actually paid to date (sum over ticked months). */
export function fixedPaidTotal(fixedCosts) {
  return (fixedCosts || []).reduce((s, fc) => s + Number(fc.amount) * (fc.paid_months || []).length, 0)
}

/** Is this cost still due (unpaid) in the month of `refISO`? */
export function isFixedOpenThisMonth(fc, refISO = todayISO()) {
  if (fc.active === false) return false
  const cur = monthKey(refISO)
  const paid = fc.paid_months || []
  if (paid.includes(cur)) return false
  if (fc.period === 'weekly' || fc.period === 'monthly') return true
  // Non-monthly: due again once `step` months have passed since the last payment.
  const step = PERIOD_STEP_MONTHS[fc.period] ?? 1
  const last = paid.length ? [...paid].sort().at(-1) : null
  return last ? monthsBetweenKeys(last, cur) >= step : true
}

/** Sum of fixed costs still open (unpaid) in the month of `refISO`. */
export function fixedOpenThisMonth(fixedCosts, refISO = todayISO()) {
  return (fixedCosts || [])
    .filter((fc) => isFixedOpenThisMonth(fc, refISO))
    .reduce((s, fc) => s + Number(fc.amount), 0)
}

/**
 * Running account balance, bank-style: every income minus every expense minus
 * every fixed cost the user has ticked as paid (see fixedPaidTotal). Mirrors the
 * real bank balance and carries prior-month leftovers forward. Savings pots
 * (earmarks, money still on the account) are intentionally NOT subtracted here.
 */
export function accountBalance(incomes, expenses, fixedCosts = []) {
  const income = (incomes || []).reduce((a, i) => a + Number(i.amount), 0)
  const spent = (expenses || []).reduce((a, e) => a + Number(e.amount), 0)
  return income - spent - fixedPaidTotal(fixedCosts)
}

/** Projected balance at month-end if no more income is entered: current balance
 *  minus the fixed costs still open this month. */
export function projectedMonthEndBalance(incomes, expenses, fixedCosts = [], refISO = todayISO()) {
  return accountBalance(incomes, expenses, fixedCosts) - fixedOpenThisMonth(fixedCosts, refISO)
}

/** Money carried into the current month = balance at the end of the previous
 *  month: all income/expenses dated before this month, minus fixed costs paid
 *  in earlier months. This carries the (end-of-prev-month) salary forward. */
export function monthCarryover(incomes, expenses, fixedCosts, ref = todayISO()) {
  const cur = monthKey(ref)
  const before = (arr) => (arr || []).filter((x) => monthKey(x.date) < cur).reduce((a, x) => a + Number(x.amount), 0)
  const fixedPaidBefore = (fixedCosts || [])
    .reduce((s, fc) => s + Number(fc.amount) * (fc.paid_months || []).filter((m) => m < cur).length, 0)
  return before(incomes) - before(expenses) - fixedPaidBefore
}

/** Sum of the fixed costs that belong to the current month (already paid this
 *  month + still open this month) — the full month's obligation, actual amounts
 *  (quarterly/yearly only counted in their due month), not normalised. */
export function fixedDueThisMonth(fixedCosts, ref = todayISO()) {
  const cur = monthKey(ref)
  return (fixedCosts || [])
    .filter((fc) => fc.active !== false && ((fc.paid_months || []).includes(cur) || isFixedOpenThisMonth(fc, ref)))
    .reduce((s, fc) => s + Number(fc.amount), 0)
}

/**
 * Money still free this month, end-of-month view:
 *   carry-over from last month + this month's income − this month's fixed costs
 *   − this month's spend − already saved.
 * The carry-over folds in the previous month's leftovers (incl. an end-of-month
 * salary), so this stays correct even when income lands late. This is BOTH the
 * Dashboard's "Übrig zum Ausgeben" and the Savings page's "Verfügbar zum Sparen"
 * — one definition so the two pages never drift. `savedThisMonth` comes from
 * savings.js `monthSavings` (passed in to avoid a circular import).
 */
export function leftToSpendThisMonth({ incomes, expenses, fixedCosts, savedThisMonth = 0 }) {
  return monthCarryover(incomes, expenses, fixedCosts)
    + monthIncome(incomes)
    - fixedDueThisMonth(fixedCosts)
    - monthSpend(expenses)
    - savedThisMonth
}
