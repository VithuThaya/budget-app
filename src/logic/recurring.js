// Recurring income materialisation.
// Recurring incomes act as templates: the original row (recurring=true) drives
// generation of one real income per due period. Generated instances are plain
// (recurring=false) so they never spawn further copies. Everything derives from
// the raw incomes array, so generation is idempotent — an occurrence that already
// exists (same source + date) is never inserted twice.
import { parseISO, toISODate, addDays } from '../lib/dates'

/** The next occurrence date after `iso` for a given interval, as an ISO string.
 *  monthly keeps the day-of-month, clamped to the target month's last day
 *  (e.g. 31 Jan -> 28/29 Feb). Anything that isn't 'weekly' is treated monthly. */
export function nextDate(iso, interval) {
  const d = parseISO(iso)
  if (interval === 'weekly') return toISODate(addDays(d, 7))
  const y = d.getFullYear()
  const m = d.getMonth()
  const day = d.getDate()
  const daysInNext = new Date(y, m + 2, 0).getDate() // days in month (m+1)
  return toISODate(new Date(y, m + 1, Math.min(day, daysInNext)))
}

/** Insert payloads for every recurring income occurrence due on/before `todayISO`
 *  that isn't already present. Dedup key is source+date (an income from the same
 *  source on the same day is treated as the same occurrence). */
export function pendingIncomeInserts(incomes, todayISO) {
  const rows = incomes || []
  const inserts = []
  const exists = (source, date) =>
    rows.some((i) => i.source === source && String(i.date).slice(0, 10) === date) ||
    inserts.some((v) => v.source === source && v.date === date)

  for (const t of rows) {
    if (!t.recurring || !t.recur_interval) continue
    let due = nextDate(String(t.date).slice(0, 10), t.recur_interval)
    let guard = 0
    while (due <= todayISO && guard++ < 1000) {
      if (!exists(t.source, due)) {
        inserts.push({
          source: t.source,
          amount: Number(t.amount),
          date: due,
          recurring: false,
          recur_interval: null,
          notes: t.notes ?? null,
        })
      }
      due = nextDate(due, t.recur_interval)
    }
  }
  return inserts
}
