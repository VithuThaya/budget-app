// Pure derivations for the Savings Goals feature. A goal's balance is simply
// the sum of its contributions; everything else (progress, monthly pace,
// time-to-target) is derived from the raw goals + contributions arrays so the
// Savings page and the Dashboard always agree.
import { isThisMonth, parseISO } from '../lib/dates'

const clamp01 = (n) => Math.max(0, Math.min(1, n || 0))

/** Sum of all contributions belonging to one goal (the pot balance). */
export function goalBalance(goalId, contributions) {
  return (contributions || [])
    .filter((c) => c.goal_id === goalId)
    .reduce((a, c) => a + Number(c.amount), 0)
}

/** Total saved across every pot (all-time). */
export function totalSaved(contributions) {
  return (contributions || []).reduce((a, c) => a + Number(c.amount), 0)
}

/** Contributions made in the current calendar month (all goals). */
export function monthSavings(contributions) {
  return (contributions || [])
    .filter((c) => isThisMonth(c.date))
    .reduce((a, c) => a + Number(c.amount), 0)
}

/** Whole months from today until an ISO target date (0 if reached/past). */
export function monthsUntil(dateISO) {
  if (!dateISO) return null
  const now = new Date()
  const d = parseISO(dateISO)
  const months = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth())
  return Math.max(0, months)
}

/** Everything the UI needs to render one goal's progress. */
export function goalProgress(goal, contributions) {
  const balance = goalBalance(goal.id, contributions)
  const savedThisMonth = (contributions || [])
    .filter((c) => c.goal_id === goal.id && isThisMonth(c.date))
    .reduce((a, c) => a + Number(c.amount), 0)

  const target = goal.target_amount != null ? Number(goal.target_amount) : null
  const hasTarget = target != null && target > 0
  const remaining = hasTarget ? Math.max(0, target - balance) : null
  const pct = hasTarget ? clamp01(balance / target) : null
  const done = hasTarget && balance >= target

  const monthlyTarget = goal.monthly_target != null ? Number(goal.monthly_target) : null
  const monthlyPct = monthlyTarget > 0 ? clamp01(savedThisMonth / monthlyTarget) : null

  const monthsLeft = goal.target_date ? monthsUntil(goal.target_date) : null
  const overdue = goal.target_date != null && monthsLeft === 0 && remaining > 0
  const neededPerMonth =
    hasTarget && goal.target_date && remaining > 0
      ? remaining / Math.max(1, monthsLeft)
      : null

  return {
    balance, savedThisMonth, target, hasTarget, remaining, pct, done,
    monthlyTarget, monthlyPct, monthsLeft, overdue, neededPerMonth,
  }
}

/** Pie/legend data for the distribution donut: one slice per pot with money. */
export function savingsPieData(goals, contributions) {
  return (goals || [])
    .map((g) => ({ name: g.name, value: goalBalance(g.id, contributions), color: g.color || '#22c55e' }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
}
