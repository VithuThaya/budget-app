import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCHF } from '../../lib/money'
import EmptyState from '../EmptyState'
import { PieChart as PieIcon } from 'lucide-react'

// Spending-by-category donut. `data` = [{ name, value, color }].
export default function PieBreakdown({ data }) {
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
              innerRadius={62} outerRadius={92} paddingAngle={2} stroke="none"
            >
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#161619', border: '1px solid #27272a', borderRadius: 12, color: '#fafafa' }}
              formatter={(v, n) => [formatCHF(v), n]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="stat-label">Gesamt</span>
          <span className="text-lg font-semibold text-zinc-50">{formatCHF(total)}</span>
        </div>
      </div>
      <ul className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {data.map((d) => (
          <li key={d.categoryId ?? d.name} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="truncate text-zinc-300">{d.name}</span>
            </span>
            <span className="shrink-0 tabular-nums text-zinc-400">
              {Math.round((d.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
