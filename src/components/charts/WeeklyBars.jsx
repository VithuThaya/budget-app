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
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} width={40}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toLocaleString('de-CH', { maximumFractionDigits: 1 })}k` : String(v))} />
          <Tooltip
            cursor={{ fill: '#ffffff08' }}
            contentStyle={{ background: '#161619', border: '1px solid #27272a', borderRadius: 12, color: '#fafafa' }}
            formatter={(v) => [formatCHF(v), 'Ausgegeben']}
          />
          <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === data.length - 1 ? '#2563eb' : '#3f3f46'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
