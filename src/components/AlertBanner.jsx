import { AlertTriangle, TrendingUp, Info, ShieldCheck } from 'lucide-react'

const STYLES = {
  danger: { wrap: 'border-bad/30 bg-bad/10', icon: 'text-red-400', Icon: AlertTriangle },
  warning: { wrap: 'border-warn/30 bg-warn/10', icon: 'text-amber-400', Icon: TrendingUp },
  info: { wrap: 'border-accent/30 bg-accent/10', icon: 'text-accent-soft', Icon: Info },
  success: { wrap: 'border-good/30 bg-good/10', icon: 'text-green-400', Icon: ShieldCheck },
}

// Single advisor alert row. `level` controls colour + icon.
export default function AlertBanner({ level = 'info', title, detail }) {
  const s = STYLES[level] || STYLES.info
  const Icon = s.Icon
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${s.wrap}`}>
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.icon}`} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-100">{title}</p>
        {detail && <p className="mt-0.5 text-xs text-zinc-400">{detail}</p>}
      </div>
    </div>
  )
}
