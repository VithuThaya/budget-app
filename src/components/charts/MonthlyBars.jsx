import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { formatCHF } from '../../lib/money'
import EmptyState from '../EmptyState'
import { BarChart3 } from 'lucide-react'

// Income vs. expense per month over a year. `data` = [{ label, income, expense }].
export default function MonthlyBars({ data, height = 280 }) {
  const hasData = data?.some((d) => d.income > 0 || d.expense > 0)
  if (!hasData) {
    return <EmptyState icon={BarChart3} title="Noch keine Jahresdaten" message="Hier vergleichen wir Einnahmen und Ausgaben über das Jahr, sobald Daten da sind." />
  }
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} width={40}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toLocaleString('de-CH', { maximumFractionDigits: 1 })}k` : String(v))} />
          <Tooltip
            cursor={{ fill: '#ffffff08' }}
            contentStyle={{ background: '#161619', border: '1px solid #27272a', borderRadius: 12, color: '#fafafa' }}
            formatter={(v, key) => [formatCHF(v), key === 'income' ? 'Einnahmen' : 'Ausgaben']}
          />
          <Bar dataKey="income" fill="#22c55e" radius={[6, 6, 0, 0]} maxBarSize={20} />
          <Bar dataKey="expense" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-zinc-400">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-good" /> Einnahmen</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-bad" /> Ausgaben</span>
      </div>
    </div>
  )
}
