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
          <defs>
            <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34D399" stopOpacity={1} />
              <stop offset="100%" stopColor="#34D399" stopOpacity={0.5} />
            </linearGradient>
            <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF6B7A" stopOpacity={1} />
              <stop offset="100%" stopColor="#FF6B7A" stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} width={40}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toLocaleString('de-CH', { maximumFractionDigits: 1 })}k` : String(v))} />
          <Tooltip
            cursor={{ fill: '#ffffff08' }}
            contentStyle={{ background: 'rgba(22,26,46,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#E0E0E0', backdropFilter: 'blur(12px)' }}
            formatter={(v, key) => [formatCHF(v), key === 'income' ? 'Einnahmen' : 'Ausgaben']}
          />
          <Bar dataKey="income" fill="url(#incomeFill)" radius={[6, 6, 0, 0]} maxBarSize={20} />
          <Bar dataKey="expense" fill="url(#expenseFill)" radius={[6, 6, 0, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-zinc-400">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-good" /> Einnahmen</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-bad" /> Ausgaben</span>
      </div>
    </div>
  )
}
