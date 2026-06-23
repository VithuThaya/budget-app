// Budget progress bar. Colour shifts from accent -> warn -> bad as the
// spend ratio climbs, so over/near-limit budgets are obvious at a glance.
export default function ProgressBar({ ratio, color }) {
  const pct = Math.max(0, Math.min(1, ratio || 0))
  const over = (ratio || 0) >= 1
  const near = (ratio || 0) >= 0.85
  const barColor = color || (over ? '#ef4444' : near ? '#f59e0b' : '#2563eb')
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ink-700">
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${pct * 100}%`, backgroundColor: barColor }}
      />
    </div>
  )
}
