import { AlertTriangle, TrendingUp, Info, ShieldCheck } from 'lucide-react'

const STYLES = {
  danger: { wrap: 'border-coral/30 bg-coral/10 backdrop-blur-md', icon: 'text-coral', Icon: AlertTriangle },
  warning: { wrap: 'border-coral/30 bg-coral/10 backdrop-blur-md', icon: 'text-coral', Icon: TrendingUp },
  info: { wrap: 'border-accent/30 bg-accent/10 backdrop-blur-md', icon: 'text-accent-soft', Icon: Info },
  success: { wrap: 'border-good/30 bg-good/10 backdrop-blur-md', icon: 'text-good', Icon: ShieldCheck },
}

// Single advisor alert row. `level` controls colour + icon.
export default function AlertBanner({ level = 'info', title, detail }) {
  const s = STYLES[level] || STYLES.info
  const Icon = s.Icon
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${s.wrap}`}>
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.icon}`} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-silver">{title}</p>
        {detail && <p className="mt-0.5 text-xs text-zinc-400">{detail}</p>}
      </div>
    </div>
  )
}
