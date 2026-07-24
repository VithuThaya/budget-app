// Saving Plan Generator
// Builds personalised 7-day and 30-day plans from real spending behaviour:
// per-category recommended caps, suggested reductions and projected savings.
// Recomputed whenever expenses change so the plan stays current.
import { parseISO, todayISO, daysBetween, addDays } from '../lib/dates'

// How aggressively to trim each category, keyed by ICON (language-independent,
// so renaming a category — e.g. to German — never breaks this). Default 10%.
const REDUCTION_BY_ICON = {
  Utensils: 0.25, Clapperboard: 0.25, ShoppingBag: 0.2, Coffee: 0.3,
  Tag: 0.15, Car: 0.1, ShoppingCart: 0.1,
}
const DEFAULT_REDUCTION = 0.1

/** Average daily spend per category over the trailing `lookback` days. */
function dailyRatesByCategory(expenses, lookback = 30) {
  const start = addDays(todayISO(), -lookback)
  const totals = new Map()
  for (const e of expenses || []) {
    const d = parseISO(e.date)
    if (d >= start) totals.set(e.category_id, (totals.get(e.category_id) || 0) + Number(e.amount))
  }
  const rates = new Map()
  for (const [catId, total] of totals.entries()) rates.set(catId, total / lookback)
  return rates
}

function buildPlan({ horizon, rates, categoryMap }) {
  const lines = []
  for (const [catId, rate] of rates.entries()) {
    const cat = categoryMap.get(catId)
    const name = cat?.name || 'Ohne Kategorie'
    const baseline = rate * horizon // projected spend at current pace
    if (baseline <= 0) continue
    const reduction = REDUCTION_BY_ICON[cat?.icon] ?? DEFAULT_REDUCTION
    const cap = baseline * (1 - reduction)
    const saving = baseline - cap
    lines.push({
      categoryId: catId,
      name,
      color: cat?.color || '#64748b',
      icon: cat?.icon,
      baseline,
      cap,
      saving,
      reductionPct: reduction,
    })
  }
  lines.sort((a, b) => b.saving - a.saving)
  const projectedSavings = lines.reduce((a, l) => a + l.saving, 0)
  const projectedSpend = lines.reduce((a, l) => a + l.cap, 0)
  const baselineSpend = lines.reduce((a, l) => a + l.baseline, 0)
  return { horizon, lines, projectedSavings, projectedSpend, baselineSpend }
}

export function savingPlans({ expenses, categoryMap }) {
  // Use up to 30 days of history; if the user has less, the rate still works.
  const lookback = Math.max(7, Math.min(30, daysBetween(oldestDate(expenses), todayISO()) || 30))
  const rates = dailyRatesByCategory(expenses, lookback)
  return {
    week: buildPlan({ horizon: 7, rates, categoryMap }),
    month: buildPlan({ horizon: 30, rates, categoryMap }),
    hasData: rates.size > 0,
  }
}

function oldestDate(expenses) {
  if (!expenses?.length) return todayISO()
  return expenses.reduce((min, e) => (e.date < min ? e.date : min), expenses[0].date)
}
