// Self-check for fixedSchedule.js — run with: node src/logic/fixedSchedule.check.js
// No test framework on purpose: this is the one runnable check that fails if the
// standing-order logic breaks (money path, so it does not go untested).
import assert from 'node:assert/strict'
import { shiftToBusinessDay, dueDatesUpTo, pendingFixedPayments, nextDueDate, scheduledDateFor, checkableMonth, monthEndCheck } from './fixedSchedule.js'

const fc = (over = {}) => ({
  id: 'x', amount: 1450, period: 'monthly', due_day: 1,
  active: true, created_at: '2026-01-15', payments: [], ...over,
})

// --- weekend shift ---------------------------------------------------------
// 2026-08-01 is a Saturday -> Friday 31 July. 2026-11-01 is a Sunday -> Fri 30 Oct.
assert.equal(shiftToBusinessDay('2026-08-01'), '2026-07-31', 'Saturday shifts back to Friday')
assert.equal(shiftToBusinessDay('2026-11-01'), '2026-10-30', 'Sunday shifts back to Friday')
assert.equal(shiftToBusinessDay('2026-07-01'), '2026-07-01', 'Wednesday is untouched')

// --- day clamped to month length ------------------------------------------
// Due on the 31st: February must clamp to the 28th (2026 is not a leap year).
const feb = dueDatesUpTo(fc({ due_day: 31, created_at: '2026-01-31', payments: [{ date: '2026-01-30', amount: 100 }] }), '2026-03-05')
assert.ok(feb.map((d) => d.date).includes('2026-02-27'), `31st clamps into February (Sat 28th -> Fri 27th), got ${JSON.stringify(feb)}`)

// --- idempotency: booking twice adds nothing -------------------------------
const once = pendingFixedPayments([fc({ created_at: '2026-06-15' })], '2026-07-20')
assert.equal(once.length, 1, 'first run books the July occurrence')
assert.deepEqual(once[0].payments.map((p) => p.date), ['2026-07-01'], 'exactly one occurrence booked')
const twice = pendingFixedPayments([fc({ created_at: '2026-06-15', payments: once[0].payments })], '2026-07-20')
assert.equal(twice.length, 0, 'second run books nothing — generation is idempotent')

// --- amount is frozen at booking time --------------------------------------
// Raising the amount afterwards must not rewrite the recorded payment.
assert.equal(once[0].payments[0].amount, 1450, 'payment records the amount that applied then')
const afterRaise = pendingFixedPayments([fc({ amount: 1500, created_at: '2026-06-15', payments: once[0].payments })], '2026-07-20')
assert.equal(afterRaise.length, 0, 'a price change does not re-book past months')

// --- quarterly recurs every 3 months, not monthly --------------------------
const q = dueDatesUpTo(fc({ period: 'quarterly', due_day: 15, created_at: '2026-01-10', payments: [{ date: '2026-01-15', amount: 300 }] }), '2026-08-01')
assert.deepEqual(q.map((d) => d.date), ['2026-04-15', '2026-07-15'], `quarterly steps 3 months, got ${JSON.stringify(q)}`)

// --- weekly records every occurrence, not one per month --------------------
// This is the bug the old paid_months model had: weekly costs counted once a month.
const w = dueDatesUpTo(fc({ period: 'weekly', amount: 50, due_day: 6, created_at: '2026-07-01', payments: [{ date: '2026-07-06', amount: 50 }] }), '2026-07-31')
assert.ok(w.length >= 3, `weekly books every 7 days (got ${w.length}: ${JSON.stringify(w)})`)

// --- backfill guard: an old cost does not post years of history ------------
const old = dueDatesUpTo(fc({ created_at: '2015-01-01' }), '2026-07-20')
assert.ok(old.length <= 13, `backfill is capped at ~12 months, got ${old.length}`)

// --- no due_day / inactive stay manual -------------------------------------
assert.deepEqual(dueDatesUpTo(fc({ due_day: null }), '2026-07-20'), [], 'no due_day = manual')
assert.deepEqual(dueDatesUpTo(fc({ active: false }), '2026-07-20'), [], 'paused costs never book')

// --- next due date is in the future ----------------------------------------
const next = nextDueDate(fc({ due_day: 25, payments: [{ date: '2026-07-25', amount: 380 }] }), '2026-07-26')
assert.ok(next > '2026-07-26', `next due date is ahead of today, got ${next}`)

// --- instalment month vs debit month ---------------------------------------
// 1 Aug 2026 is a Saturday, so the August instalment is debited on Fri 31 July.
// The payment must carry for='2026-08' — keying off the debit date would leave
// August looking unpaid and subtract it from the month-end projection twice.
const aug = pendingFixedPayments([fc({ due_day: 1, payments: [{ date: '2026-07-01', for: '2026-07', amount: 1450 }] })], '2026-08-05')
const augPay = aug[0].payments.at(-1)
assert.equal(augPay.date, '2026-07-31', 'Saturday due date debits on the Friday before')
assert.equal(augPay.for, '2026-08', 'but the instalment still belongs to August')

// --- a cost that starts next month is not open this month ------------------
// Real case: a standing order created 30 Jul with due day 25. July's instalment
// (Sat 25th -> Fri 24th) predates it, so July was never owed — it must not be
// subtracted from the month-end projection.
assert.equal(scheduledDateFor(fc({ due_day: 25 }), '2026-07'), '2026-07-24', '25 Jul 2026 is a Saturday -> Friday 24th')
assert.equal(scheduledDateFor(fc({ due_day: 25 }), '2026-08'), '2026-08-25', 'August 25th is a Tuesday')
assert.equal(scheduledDateFor(fc({ due_day: null }), '2026-08'), null, 'no due day, no schedule')

// --- month-end check window ------------------------------------------------
// Last day of a month and the first days of the next must name the SAME month,
// otherwise the prompt would swap targets overnight.
assert.equal(checkableMonth('2026-07-31'), '2026-07', 'last day of the month checks that month')
assert.equal(checkableMonth('2026-08-03'), '2026-07', 'early next month still checks the month that closed')
assert.equal(checkableMonth('2026-08-15'), null, 'mid-month there is nothing to confirm')

// --- month-end check contents ----------------------------------------------
const booked = [
  fc({ id: 'a', name: 'Miete', payments: [{ date: '2026-07-01', for: '2026-07', amount: 1450, auto: true }] }),
  // Debited 31 July but belongs to August — must NOT appear in July's check.
  fc({ id: 'b', name: 'Abo', due_day: 1, payments: [{ date: '2026-07-31', for: '2026-08', amount: 20, auto: true }] }),
  // Ticked by hand: the check is about what the app booked on its own.
  fc({ id: 'c', name: 'Handy', payments: [{ date: '2026-07-05', for: '2026-07', amount: 60, auto: false }] }),
]
const check = monthEndCheck(booked, '2026-08-02')
assert.deepEqual(check.items.map((i) => i.name), ['Miete'], 'only auto bookings of the closing month are listed')
assert.equal(check.total, 1450, 'total sums the listed bookings')
assert.equal(check.openCount, 1, 'a scheduled cost with nothing booked for July counts as open')
assert.equal(monthEndCheck(booked, '2026-08-02', '2026-07'), null, 'a confirmed month never prompts again')
assert.equal(monthEndCheck(booked, '2026-08-15'), null, 'outside the window there is no prompt')
assert.equal(monthEndCheck([fc({ payments: [] })], '2026-08-02'), null, 'nothing booked, nothing to confirm')

console.log('fixedSchedule: all checks passed')
