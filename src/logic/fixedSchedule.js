// Fixed-cost standing-order materialisation.
// A fixed cost with a `due_day` behaves like a bank standing order: it debits on
// that day, moved back to the previous working day when it falls on a weekend.
// Everything derives from the row's own `payments` array, so generation is
// idempotent — an occurrence already recorded is never booked twice.
//
// Mirrors src/logic/recurring.js (recurring income), which uses the same
// derive-from-raw-array approach. A cost without `due_day` stays manual.
// Explicit .js extension (the rest of the app omits it): this module is also run
// directly by node for fixedSchedule.check.js, and node requires the extension.
import { parseISO, toISODate, addDays, addMonths } from '../lib/dates.js'

// How many months apart each period recurs. 'weekly' is handled separately
// (it recurs in days, not months).
const PERIOD_STEP_MONTHS = { monthly: 1, quarterly: 3, yearly: 12 }

// Never book more than a year of history in one go. Without this, switching an
// old fixed cost to automatic would suddenly post every month since it was
// created. ponytail: fixed 12-month window, make it configurable if a user ever
// needs to backfill further.
const MAX_BACKFILL_MONTHS = 12

/** Sat/Sun -> the Friday before. Standing orders debit on the previous working
 *  day. Bank holidays are deliberately not modelled: they would need a canton
 *  and would shift the date by at most a day or two, which the month-end check
 *  reconciles anyway. */
export function shiftToBusinessDay(iso) {
  const d = parseISO(iso)
  const day = d.getDay() // 0 = Sunday, 6 = Saturday
  if (day === 0) return toISODate(addDays(d, -2))
  if (day === 6) return toISODate(addDays(d, -1))
  return iso
}

/** The nominal (unshifted) due date in the month `offset` months after `from`,
 *  clamping the day to the month's length (31 -> 28/29 Feb). */
function dueDateInMonth(from, offset, dueDay) {
  const y = from.getFullYear()
  const m = from.getMonth() + offset
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  return toISODate(new Date(y, m, Math.min(dueDay, daysInMonth)))
}

/** The debit date this cost is scheduled for in `monthKey` ('YYYY-MM'), weekend
 *  shift applied. Null when the cost has no due day. Lets callers ask "was this
 *  month's instalment ever this cost's obligation?" without replaying the
 *  whole schedule. */
export function scheduledDateFor(fc, monthKey) {
  if (!fc?.due_day) return null
  const [y, m] = String(monthKey).split('-').map(Number)
  if (!y || !m) return null
  const daysInMonth = new Date(y, m, 0).getDate()
  return shiftToBusinessDay(toISODate(new Date(y, m - 1, Math.min(fc.due_day, daysInMonth))))
}

/** All occurrence dates for `fc` that are due on or before `todayISO` and are
 *  not already recorded in its `payments`. Returned as shifted ISO strings. */
export function dueDatesUpTo(fc, todayISO) {
  if (!fc?.due_day || fc.active === false) return []

  const payments = fc.payments || []
  const booked = new Set(payments.map((p) => String(p.date).slice(0, 10)))

  // Anchor: everything strictly after this date is bookable. That is the last
  // recorded payment, else the row's creation date — capped so a long-dormant
  // cost cannot backfill beyond the window.
  const lastPaid = payments.length
    ? payments.map((p) => String(p.date).slice(0, 10)).sort().at(-1)
    : null
  const created = String(fc.created_at || todayISO).slice(0, 10)
  const windowStart = toISODate(addDays(parseISO(todayISO), -30 * MAX_BACKFILL_MONTHS))
  const anchor = [lastPaid || created, windowStart].sort().at(-1)

  const dates = []
  const anchorDate = parseISO(anchor)

  if (fc.period === 'weekly') {
    // Weekly costs recur every 7 days from the first due day on/after the anchor.
    let d = parseISO(dueDateInMonth(anchorDate, 0, fc.due_day))
    let guard = 0
    while (toISODate(d) < anchor && guard++ < 1000) d = addDays(d, 7)
    guard = 0
    while (toISODate(d) <= todayISO && guard++ < 1000) {
      const nominal = toISODate(d)
      const shifted = shiftToBusinessDay(nominal)
      if (shifted > anchor && !booked.has(shifted)) dates.push({ date: shifted, for: nominal.slice(0, 7) })
      d = addDays(d, 7)
    }
    return dates
  }

  const step = PERIOD_STEP_MONTHS[fc.period] ?? 1
  for (let i = 0, guard = 0; guard++ < 1000; i += step) {
    const nominal = dueDateInMonth(anchorDate, i, fc.due_day)
    if (nominal > todayISO) break
    const shifted = shiftToBusinessDay(nominal)
    // `> anchor` (not >=) so the anchor's own payment is never re-booked.
    // `for` is the month the instalment BELONGS to, which is not always the
    // month it is debited in: a due day of 1 Aug (a Saturday) debits on 31 Jul.
    // Balance maths uses `date`, open/paid state uses `for`.
    if (shifted > anchor && !booked.has(shifted)) dates.push({ date: shifted, for: nominal.slice(0, 7) })
  }
  return dates
}

/** Payments that need to be written, across all fixed costs.
 *  @returns {Array<{id: string, payments: Array}>} the FULL new payments array
 *           per row, ready to hand to updateFixedCost. */
export function pendingFixedPayments(fixedCosts, todayISO) {
  const out = []
  for (const fc of fixedCosts || []) {
    const dates = dueDatesUpTo(fc, todayISO)
    if (!dates.length) continue
    const added = dates.map((d) => ({ date: d.date, for: d.for, amount: Number(fc.amount), auto: true }))
    out.push({ id: fc.id, payments: [...(fc.payments || []), ...added] })
  }
  return out
}

/** The next date this cost will be debited, or null when it has no schedule.
 *  Used by the UI to show "fällig am 25.07." instead of a bare "offen". */
export function nextDueDate(fc, todayISO) {
  if (!fc?.due_day || fc.active === false) return null
  const payments = fc.payments || []
  const lastPaid = payments.length
    ? payments.map((p) => String(p.date).slice(0, 10)).sort().at(-1)
    : null
  const from = parseISO(lastPaid || todayISO)
  const step = fc.period === 'weekly' ? 0 : (PERIOD_STEP_MONTHS[fc.period] ?? 1)

  if (fc.period === 'weekly') {
    let d = parseISO(dueDateInMonth(from, 0, fc.due_day))
    let guard = 0
    while (toISODate(d) <= (lastPaid || todayISO) && guard++ < 1000) d = addDays(d, 7)
    return shiftToBusinessDay(toISODate(d))
  }
  for (let i = 0, guard = 0; guard++ < 1000; i += step) {
    const nominal = dueDateInMonth(from, i, fc.due_day)
    const shifted = shiftToBusinessDay(nominal)
    if (shifted > (lastPaid || '') && shifted >= todayISO) return shifted
    if (!lastPaid && shifted >= todayISO) return shifted
  }
  return null
}

// How many days into the new month the closing check stays offered. After that
// the month is water under the bridge and the banner would only be noise.
const CHECK_WINDOW_DAYS = 5

/** The month whose closing check is due right now, or null outside the window.
 *  Offered on the last day of a month and in the first few days of the next —
 *  both point at the SAME month, so the prompt does not change under the user. */
export function checkableMonth(today) {
  const d = parseISO(today)
  const lastDay = toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
  if (today === lastDay) return today.slice(0, 7)
  if (d.getDate() <= CHECK_WINDOW_DAYS) return toISODate(addMonths(d, -1)).slice(0, 7)
  return null
}

/** Month-end reconciliation prompt: what the app booked by itself for the month
 *  now closing, so it can be held against the real bank statement.
 *  Null when there is nothing to confirm — outside the window, already confirmed,
 *  or nothing was booked automatically.
 *  @returns {null | { month: string, items: Array, total: number, openCount: number }} */
export function monthEndCheck(fixedCosts, today, confirmedMonth = null) {
  const month = checkableMonth(today)
  if (!month || month === confirmedMonth) return null

  const items = []
  for (const fc of fixedCosts || []) {
    for (const p of fc.payments || []) {
      // Instalment month, not debit month: a 1 Aug due day debits on 31 Jul but
      // belongs to August, and must not show up in July's closing check.
      if ((p.for || String(p.date).slice(0, 7)) !== month) continue
      if (!p.auto) continue
      items.push({ name: fc.name, date: String(p.date).slice(0, 10), amount: Number(p.amount) })
    }
  }
  if (!items.length) return null
  items.sort((a, b) => a.date.localeCompare(b.date))

  // Costs that were due that month but never got booked — the other half of the
  // cross-check: too few bookings is as wrong as too many.
  const openCount = (fixedCosts || []).filter((fc) => {
    if (fc.active === false || !fc.due_day) return false
    return !(fc.payments || []).some((p) => (p.for || String(p.date).slice(0, 7)) === month)
  }).length

  return { month, items, total: items.reduce((a, i) => a + i.amount, 0), openCount }
}
