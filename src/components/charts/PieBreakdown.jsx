import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCHF } from '../../lib/money'
import EmptyState from '../EmptyState'
import { PieChart as PieIcon } from 'lucide-react'

// Spending-by-category donut. `data` = [{ name, value, color, categoryId }].
// `onSliceClick(d)` is optional — only pass it where `categoryId` means an
// expense category (Reports); Savings reuses this component with goal ids,
// so it must never navigate on its own.
export default function PieBreakdown({ data, onSliceClick }) {
  const total = (data || []).reduce((a, d) => a + d.value, 0)
  if (!data?.length || total === 0) {
    return <EmptyState icon={PieIcon} title="Noch keine Ausgaben" message="Erfasse Ausgaben, um die Aufteilung nach Kategorie zu sehen." />
  }
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-56 w-56 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data} dataKey="value" nameKey="name"
              innerRadius={60} outerRadius={94} paddingAngle={3} cornerRadius={8} stroke="none"
              onClick={onSliceClick ? (d) => onSliceClick(d) : undefined}
              className={onSliceClick ? 'cursor-pointer' : undefined}
            >
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: 'rgba(22,26,46,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#E0E0E0', backdropFilter: 'blur(12px)' }}
              formatter={(v, n) => [formatCHF(v), n]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="stat-label">Gesamt</span>
          <span className="text-lg font-semibold text-silver">{formatCHF(total)}</span>
        </div>
      </div>
      <ul className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {data.map((d) => (
          <li key={d.categoryId ?? d.name}>
            <button
              type="button"
              onClick={onSliceClick ? () => onSliceClick(d) : undefined}
              disabled={!onSliceClick}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-1 py-0.5 text-sm transition-colors duration-150 ${onSliceClick ? 'cursor-pointer hover:bg-white/5' : ''}`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="truncate text-silver">{d.name}</span>
              </span>
              <span className="shrink-0 tabular-nums text-zinc-400">
                {Math.round((d.value / total) * 100)}%
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
