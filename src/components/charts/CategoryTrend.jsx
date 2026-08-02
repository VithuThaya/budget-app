import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { formatCHF } from '../../lib/money'
import EmptyState from '../EmptyState'
import { LineChart as LineIcon } from 'lucide-react'

// Top-category spend per month over a year.
// `data` = [{ label, [categoryId]: amount, ... }], `series` = [{ key, name, color }].
export default function CategoryTrend({ data, series, height = 280 }) {
  const hasData = series?.length && data?.some((row) => series.some((s) => row[s.key] > 0))
  if (!hasData) {
    return <EmptyState icon={LineIcon} title="Noch kein Kategorienverlauf" message="Sobald Ausgaben über mehrere Monate vorliegen, siehst du hier die Top-Kategorien im Verlauf." />
  }
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} width={40}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toLocaleString('de-CH', { maximumFractionDigits: 1 })}k` : String(v))} />
          <Tooltip
            contentStyle={{ background: '#161619', border: '1px solid #27272a', borderRadius: 12, color: '#fafafa' }}
            formatter={(v, key) => [formatCHF(v), series.find((s) => s.key === key)?.name || key]}
          />
          {series.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-xs text-zinc-400">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 backdrop-blur-md">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} /> {s.name}
          </span>
        ))}
      </div>
    </div>
  )
}
