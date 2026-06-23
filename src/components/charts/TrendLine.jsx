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
    return <EmptyState icon={LineIcon} title="No trend yet" message="Your daily spending will appear here as you log expenses." />
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} width={56}
            tickFormatter={(v) => formatCHF(v, { whole: true })} />
          <Tooltip
            contentStyle={{ background: '#161619', border: '1px solid #27272a', borderRadius: 12, color: '#fafafa' }}
            formatter={(v) => [formatCHF(v), 'Spent']}
          />
          <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} fill="url(#trendFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
