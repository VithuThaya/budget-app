// Date helpers for week/month bucketing. All functions work on local time
// and treat dates as plain calendar days (no timezone surprises).

const DAY_MS = 24 * 60 * 60 * 1000

/** Today's date as an ISO "YYYY-MM-DD" string (local). */
export function todayISO() {
  return toISODate(new Date())
}

/** Convert a Date to "YYYY-MM-DD" (local calendar day). */
export function toISODate(d) {
  const date = d instanceof Date ? d : new Date(d)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse an ISO date string into a local Date at midnight. */
export function parseISO(iso) {
  if (iso instanceof Date) return iso
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

/** Start of the ISO week (Monday) for a given date. */
export function startOfWeek(d = new Date()) {
  const date = parseISO(toISODate(d))
  const day = (date.getDay() + 6) % 7 // 0 = Monday
  date.setDate(date.getDate() - day)
  date.setHours(0, 0, 0, 0)
  return date
}

/** Start of the month for a given date. */
export function startOfMonth(d = new Date()) {
  const date = parseISO(toISODate(d))
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/** Add n days to a date, returning a new Date. */
export function addDays(d, n) {
  const date = parseISO(toISODate(d))
  return new Date(date.getTime() + n * DAY_MS)
}

/** Number of whole days between two dates (b - a). */
export function daysBetween(a, b) {
  return Math.round((parseISO(toISODate(b)) - parseISO(toISODate(a))) / DAY_MS)
}

/** True if an ISO date falls in the same calendar month as `ref` (default now). */
export function isSameMonth(iso, ref = new Date()) {
  const d = parseISO(iso)
  const r = ref instanceof Date ? ref : parseISO(ref)
  return d.getFullYear() === r.getFullYear() && d.getMonth() === r.getMonth()
}

/** True if an ISO date falls in the current calendar month. */
export function isThisMonth(iso) {
  return isSameMonth(iso, new Date())
}

/** Add n months to a date, returning a new Date on the 1st of the result month. */
export function addMonths(d, n) {
  const date = parseISO(toISODate(d))
  return new Date(date.getFullYear(), date.getMonth() + n, 1)
}

/** True if an ISO date falls in the current ISO week (Mon–Sun). */
export function isThisWeek(iso) {
  const start = startOfWeek()
  const end = addDays(start, 7)
  const d = parseISO(iso)
  return d >= start && d < end
}

/** Human label like "23 Jun 2026". */
export function formatDate(iso, opts = { day: '2-digit', month: 'short', year: 'numeric' }) {
  return parseISO(iso).toLocaleDateString('en-CH', opts)
}

/** Short weekday + day, e.g. "Mon 23". */
export function formatDayLabel(iso) {
  return parseISO(iso).toLocaleDateString('en-CH', { weekday: 'short', day: 'numeric' })
}

/** Month label, e.g. "June 2026". */
export function formatMonthLabel(d = new Date()) {
  return parseISO(toISODate(d)).toLocaleDateString('en-CH', { month: 'long', year: 'numeric' })
}

/** Bucket a list of {date, amount} into the last `weeks` ISO weeks.
 *  Returns array oldest->newest: [{ start, label, total }]. */
export function weeklyTotals(items, weeks = 6, field = 'amount') {
  const thisWeekStart = startOfWeek()
  const buckets = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(thisWeekStart, -7 * i)
    buckets.push({
      start,
      end: addDays(start, 7),
      label: start.toLocaleDateString('en-CH', { day: '2-digit', month: 'short' }),
      total: 0,
    })
  }
  for (const it of items || []) {
    const d = parseISO(it.date)
    const b = buckets.find((bk) => d >= bk.start && d < bk.end)
    if (b) b.total += Number(it[field]) || 0
  }
  return buckets
}

/** Bucket items into the last `days` calendar days for a trend line. */
export function dailyTotals(items, days = 30, field = 'amount') {
  const end = parseISO(todayISO())
  const buckets = []
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(end, -i)
    buckets.push({ date: toISODate(d), label: formatDayLabel(toISODate(d)), total: 0 })
  }
  const index = new Map(buckets.map((b) => [b.date, b]))
  for (const it of items || []) {
    const b = index.get(String(it.date).slice(0, 10))
    if (b) b.total += Number(it[field]) || 0
  }
  return buckets
}

/** Bucket items into every calendar day of the month containing `ref`.
 *  Returns oldest->newest: [{ date, label, total }]. */
export function monthlyDailyTotals(items, ref = new Date(), field = 'amount') {
  const r = ref instanceof Date ? ref : parseISO(ref)
  const year = r.getFullYear()
  const month = r.getMonth()
  const days = new Date(year, month + 1, 0).getDate()
  const buckets = []
  for (let day = 1; day <= days; day++) {
    const iso = toISODate(new Date(year, month, day))
    buckets.push({ date: iso, label: formatDayLabel(iso), total: 0 })
  }
  const index = new Map(buckets.map((b) => [b.date, b]))
  for (const it of items || []) {
    const b = index.get(String(it.date).slice(0, 10))
    if (b) b.total += Number(it[field]) || 0
  }
  return buckets
}
