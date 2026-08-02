import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import { formatCHF } from '../../lib/money'
import EmptyState from '../EmptyState'
import { BarChart3 } from 'lucide-react'

// Weekly spend bars. `data` = [{ label, total }]; last bar highlighted.
export default function WeeklyBars({ data, height = 240 }) {
  const hasData = data?.some((d) => d.total > 0)
  if (!hasData) {
    return <EmptyState icon={BarChart3} title="Keine Wochendaten" message="Hier werden die Ausgaben über mehrere Wochen verglichen." />
  }
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="weeklyActive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#B57BD6" />
              <stop offset="100%" stopColor="#9D50BB" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} width={40}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toLocaleString('de-CH', { maximumFractionDigits: 1 })}k` : String(v))} />
          <Tooltip
            cursor={{ fill: '#ffffff08' }}
            contentStyle={{ background: 'rgba(22,26,46,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#E0E0E0', backdropFilter: 'blur(12px)' }}
            formatter={(v) => [formatCHF(v), 'Ausgegeben']}
          />
          <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === data.length - 1 ? 'url(#weeklyActive)' : '#2A3048'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
