// Adaptive Spending Advisor
// Pure analysis over the shared expense array. Returns a list of contextual
// alerts that the Dashboard renders. Recomputed (via useMemo) whenever
// expenses/budgets change, so alerts update live as new expenses are added.
import {
  spendByCategory, trailingWeeklyAverage, currentWeekCategory,
} from './selectors'
import { weeklyTotals } from '../lib/dates'

const SPIKE_THRESHOLD = 0.25 // +25% vs trailing average triggers a spike alert
const NEAR_BUDGET = 0.85 // 85% of budget triggers a proximity warning
const MIN_SPEND = 20 // ignore tiny categories to avoid noisy alerts (CHF)

/**
 * @returns {Array<{id,level,title,detail,sort}>} sorted most-urgent first
 */
export function generateAlerts({ expenses, budgets, categoryMap }) {
  const alerts = []
  if (!expenses?.length) return alerts

  const budgetByCat = new Map((budgets || []).map((b) => [b.category_id, Number(b.amount)]))
  const monthByCat = spendByCategory(expenses, { monthOnly: true })

  for (const [catId, cat] of categoryMap.entries()) {
    const name = cat?.name || 'A category'

    // --- Spike detection: current week vs trailing 4-week average ---------
    const avg = trailingWeeklyAverage(expenses, catId, 4)
    const current = currentWeekCategory(expenses, catId)
    if (avg >= MIN_SPEND && current > avg * (1 + SPIKE_THRESHOLD)) {
      const pct = Math.round(((current - avg) / avg) * 100)
      alerts.push({
        id: `spike-${catId}`,
        level: 'warning',
        title: `${name} spending increased ${pct}% this week`,
        detail: `This week is well above your recent ${name.toLowerCase()} average. Worth a look.`,
        sort: 60 + Math.min(pct, 100),
      })
    }

    // --- Budget proximity / overspend ------------------------------------
    const budget = budgetByCat.get(catId)
    const spent = monthByCat.get(catId) || 0
    if (budget > 0) {
      const ratio = spent / budget
      if (ratio >= 1) {
        alerts.push({
          id: `over-${catId}`,
          level: 'danger',
          title: `You've exceeded your ${name} budget`,
          detail: `${Math.round(ratio * 100)}% of this month's ${name.toLowerCase()} budget used.`,
          sort: 200 + Math.round(ratio * 100),
        })
      } else if (ratio >= NEAR_BUDGET) {
        alerts.push({
          id: `near-${catId}`,
          level: 'warning',
          title: `You're close to exceeding your ${name} budget`,
          detail: `${Math.round(ratio * 100)}% used — ${Math.round((1 - ratio) * 100)}% remaining this month.`,
          sort: 120 + Math.round(ratio * 100),
        })
      }
    }
  }

  // --- Overall trend change: 3 consecutive rising weeks -------------------
  const weeks = weeklyTotals(expenses, 4)
  if (weeks.length === 4) {
    const [w1, w2, w3, w4] = weeks.map((w) => w.total)
    if (w4 > w3 && w3 > w2 && w2 > w1 && w1 > 0) {
      const pct = Math.round(((w4 - w1) / w1) * 100)
      alerts.push({
        id: 'trend-up',
        level: 'info',
        title: `Your overall spending has risen ${pct}% over the last 4 weeks`,
        detail: 'Spending has increased every week recently. Consider a saving plan.',
        sort: 50,
      })
    }
  }

  // Positive reinforcement when nothing is wrong.
  if (alerts.length === 0) {
    alerts.push({
      id: 'all-good',
      level: 'success',
      title: 'Spending looks healthy',
      detail: 'No spikes or budget risks detected this week. Keep it up.',
      sort: 0,
    })
  }

  return alerts.sort((a, b) => b.sort - a.sort)
}
