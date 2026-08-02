import { formatCHF } from '../../lib/money'
import { formatDate, toISODate } from '../../lib/dates'
import EmptyState from '../EmptyState'
import { CalendarDays } from 'lucide-react'

// GitHub-style day-of-year spend heatmap, built as a CSS grid (Recharts can't
// do heatmaps and this doesn't need a new dependency).
// `dailyTotals` = Map<'YYYY-MM-DD', amount> from selectors.js yearlyDailyTotals.
export default function SpendHeatmap({ year, dailyTotals }) {
  const hasData = dailyTotals && dailyTotals.size > 0
  if (!hasData) {
    return <EmptyState icon={CalendarDays} title="Noch keine Ausgabentage" message="Die Heatmap zeigt, an welchen Tagen im Jahr am meisten ausgegeben wurde." />
  }

  const max = Math.max(...dailyTotals.values())
  const startDow = (new Date(year, 0, 1).getDay() + 6) % 7 // 0 = Monday
  const gridStart = new Date(year, 0, 1 - startDow)
  const totalDays = Math.round((new Date(year, 11, 31) - gridStart) / 86400000) + 1
  const weeks = Math.ceil(totalDays / 7)

  const cells = []
  const monthLabels = new Array(weeks).fill(null)
  let lastMonth = -1
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(gridStart)
      date.setDate(date.getDate() + w * 7 + d)
      if (date.getFullYear() !== year) { cells.push(null); continue }
      if (d === 0 && date.getMonth() !== lastMonth) {
        lastMonth = date.getMonth()
        monthLabels[w] = date.toLocaleDateString('de-CH', { month: 'short' })
      }
      const iso = toISODate(date)
      cells.push({ iso, amount: dailyTotals.get(iso) || 0 })
    }
  }

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="inline-block">
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${weeks}, 11px)` }}>
            {monthLabels.map((label, i) => (
              <span key={i} className="text-[10px] text-zinc-500">{label || ''}</span>
            ))}
          </div>
          <div className="mt-1 grid gap-[3px]" style={{ gridTemplateRows: 'repeat(7, 11px)', gridAutoFlow: 'column', gridAutoColumns: '11px' }}>
            {cells.map((c, i) =>
              c ? (
                <div
                  key={i}
                  title={`${formatDate(c.iso)}: ${formatCHF(c.amount)}`}
                  className="rounded-[2px]"
                  style={{ backgroundColor: cellColor(c.amount, max) }}
                />
              ) : (
                <div key={i} />
              ),
            )}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5 text-[11px] text-zinc-500">
        <span>wenig</span>
        {[0, 0.25, 0.5, 0.75, 1].map((r) => (
          <span key={r} className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: cellColor(r * max, max || 1) }} />
        ))}
        <span>viel</span>
      </div>
    </div>
  )
}

function cellColor(amount, max) {
  if (amount <= 0) return '#1E2338' // ink-800
  const ratio = max > 0 ? amount / max : 0
  const alpha = ratio > 0.75 ? 'ff' : ratio > 0.5 ? 'b3' : ratio > 0.25 ? '80' : '40'
  return `#9D50BB${alpha}`
}
