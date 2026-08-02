// Rule-based Financial Advisor ("Berater" tab)
// Slower, structural insights on top of the short-term alerts in advisor.js:
// subscriptions, weekend spending, multi-month category trends, fixed-cost
// ratio, and one concrete "biggest lever" recommendation. Same shape as
// generateAlerts so AlertBanner renders both without changes:
// { id, level, title, detail, sort }. No paid LLM — pure derivations.
import { spendByCategory, monthIncome, monthlyFixedTotal } from './selectors.js'
import { generateAlerts } from './advisor.js'
import { savingsPotential } from './savingsPotential.js'
import { formatCHF } from '../lib/money.js'
import { todayISO, parseISO, addDays, addMonths } from '../lib/dates.js'

const MIN_SUB_MONTHS = 3 // repeats in at least this many distinct months to count as a subscription
const WEEKEND_LOOKBACK_DAYS = 90
const WEEKEND_MIN_TOTAL = 50 // CHF — below this, the split is too noisy to say anything

/** Same amount + same note, recurring in >= MIN_SUB_MONTHS distinct months. */
function detectSubscriptions(expenses) {
  const groups = new Map()
  for (const e of expenses || []) {
    const note = (e.notes || '').trim()
    if (!note) continue // no note = nothing to group repeats by
    const key = `${Number(e.amount).toFixed(2)}|${note.toLowerCase()}`
    const month = String(e.date).slice(0, 7)
    if (!groups.has(key)) groups.set(key, { amount: Number(e.amount), note, months: new Set() })
    groups.get(key).months.add(month)
  }
  return [...groups.values()].filter((g) => g.months.size >= MIN_SUB_MONTHS).sort((a, b) => b.amount - a.amount)
}

function subscriptionInsight(expenses) {
  const subs = detectSubscriptions(expenses)
  if (!subs.length) return null
  const total = subs.reduce((a, s) => a + s.amount, 0)
  const names = subs.slice(0, 3).map((s) => s.note).join(', ')
  return {
    id: 'subscriptions',
    level: 'info',
    title: `${subs.length} Abo${subs.length > 1 ? 's' : ''} erkannt: ${formatCHF(total)} / Mt.`,
    detail: `${names}${subs.length > 3 ? ' u.a.' : ''} — zusammen ${formatCHF(total * 12)} im Jahr.`,
    sort: 80,
  }
}

/** Spend/day at the weekend vs. workdays over the trailing lookback window. */
function weekendInsight(expenses) {
  const start = addDays(todayISO(), -WEEKEND_LOOKBACK_DAYS)
  let weekendTotal = 0, weekdayTotal = 0
  for (const e of expenses || []) {
    const d = parseISO(e.date)
    if (d < start) continue
    if ([0, 6].includes(d.getDay())) weekendTotal += Number(e.amount)
    else weekdayTotal += Number(e.amount)
  }
  if (weekendTotal + weekdayTotal < WEEKEND_MIN_TOTAL) return null
  const weekendPerDay = weekendTotal / (WEEKEND_LOOKBACK_DAYS * 2 / 7)
  const weekdayPerDay = weekdayTotal / (WEEKEND_LOOKBACK_DAYS * 5 / 7)
  if (weekdayPerDay <= 0) return null
  const diff = (weekendPerDay - weekdayPerDay) / weekdayPerDay
  if (Math.abs(diff) < 0.15) return null // not a notable effect
  const higher = diff > 0 ? 'Wochenende' : 'Werktage'
  return {
    id: 'weekend-effect',
    level: 'info',
    title: `Am ${higher} gibst du mehr aus`,
    detail: `Ø ${formatCHF(weekendPerDay)}/Tag am Wochenende vs. ${formatCHF(weekdayPerDay)}/Tag werktags (letzte ${WEEKEND_LOOKBACK_DAYS} Tage).`,
    sort: 40,
  }
}

/** A category rising for 3 consecutive months (advisor.js only looks weekly). */
function categoryTrendInsight(expenses, categoryMap) {
  const months = [3, 2, 1, 0].map((i) => addMonths(todayISO(), -i))
  const perMonth = months.map((m) => spendByCategory(expenses, { monthOnly: true, ref: m }))
  const catIds = new Set()
  perMonth.forEach((map) => map.forEach((_, id) => catIds.add(id)))

  let best = null
  for (const catId of catIds) {
    const [m1, m2, m3, m4] = perMonth.map((map) => map.get(catId) || 0)
    if (m4 > m3 && m3 > m2 && m2 > m1 && m1 > 0) {
      const pct = (m4 - m1) / m1
      if (!best || pct > best.pct) best = { catId, pct, m1, m4 }
    }
  }
  if (!best) return null
  const name = categoryMap.get(best.catId)?.name || 'Kategorie'
  return {
    id: 'category-trend',
    level: 'warning',
    title: `${name} steigt seit 3 Monaten`,
    detail: `Von ${formatCHF(best.m1)} auf ${formatCHF(best.m4)} pro Monat — +${Math.round(best.pct * 100)}%.`,
    sort: 90,
  }
}

/** Fixed costs as a share of monthly income — the plan's "Fixkostenquote". */
function fixedRatioInsight(fixedCosts, incomes) {
  const income = monthIncome(incomes)
  if (income <= 0) return null
  const fixed = monthlyFixedTotal(fixedCosts)
  const ratio = fixed / income
  const [level, verdict] = ratio >= 0.6 ? ['danger', 'sehr hoch'] : ratio >= 0.4 ? ['warning', 'hoch'] : ['success', 'gesund']
  return {
    id: 'fixed-ratio',
    level,
    title: `Fixkostenquote: ${Math.round(ratio * 100)}% (${verdict})`,
    detail: `${formatCHF(fixed)} Fixkosten von ${formatCHF(income)} Einkommen pro Monat.`,
    sort: ratio >= 0.4 ? 100 : 20,
  }
}

/** One concrete recommendation, annualised — the plan's "Größter Hebel". */
function biggestLeverInsight({ expenses, categoryMap }) {
  const top = savingsPotential({ expenses, categoryMap }).items[0]
  if (!top || top.saving <= 0) return null
  return {
    id: 'biggest-lever',
    level: 'success',
    title: `Größter Hebel: ${top.name}`,
    detail: `${formatCHF(top.current)} auf ${formatCHF(top.suggested)} senken = ${formatCHF(top.saving * 12)} im Jahr.`,
    sort: 70,
  }
}

/**
 * @returns {Array<{id,level,title,detail,sort}>} sorted most-relevant first.
 * Folds in generateAlerts' short-term signals so the Berater tab is one list;
 * a real LLM could later return the same shape without changing the UI.
 */
export function generateInsights({ expenses, incomes, fixedCosts, categoryMap, budgets }) {
  const structural = [
    subscriptionInsight(expenses),
    weekendInsight(expenses),
    categoryTrendInsight(expenses, categoryMap),
    fixedRatioInsight(fixedCosts, incomes),
    biggestLeverInsight({ expenses, categoryMap }),
  ].filter(Boolean)

  const shortTerm = generateAlerts({ expenses, budgets, categoryMap }).filter((a) => a.id !== 'all-good')

  const all = [...structural, ...shortTerm].sort((a, b) => (b.sort ?? 0) - (a.sort ?? 0))
  if (all.length === 0) {
    return [{ id: 'all-good', level: 'success', title: 'Alles im grünen Bereich', detail: 'Keine Auffälligkeiten erkannt — weiter so.' }]
  }
  return all
}
