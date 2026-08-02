import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { formatCHF } from '../../lib/money'
import EmptyState from '../EmptyState'
import { LineChart as LineIcon } from 'lucide-react'

// Spending trend over time. `data` = [{ label, total }].
export default function TrendLine({ data }) {
  const hasData = data?.some((d) => d.total > 0)
  if (!hasData) {
    return <EmptyState icon={LineIcon} title="Noch kein Verlauf" message="Deine täglichen Ausgaben erscheinen hier, sobald du Ausgaben erfasst." />
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9D50BB" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#9D50BB" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#B57BD6" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} width={40}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toLocaleString('de-CH', { maximumFractionDigits: 1 })}k` : String(v))} />
          <Tooltip
            contentStyle={{ background: 'rgba(22,26,46,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#E0E0E0', backdropFilter: 'blur(12px)' }}
            formatter={(v) => [formatCHF(v), 'Ausgegeben']}
          />
          <Area
            type="monotone" dataKey="total" stroke="url(#trendStroke)" strokeWidth={2.5}
            fill="url(#trendFill)" dot={{ r: 3, fill: '#B57BD6', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#9D50BB', stroke: '#0F1020', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
