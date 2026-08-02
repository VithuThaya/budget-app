import Money from './Money'

// Headline metric card used on the Dashboard and Reports.
export default function StatCard({ label, value, icon: Icon, accent = '#9D50BB', sub, trend }) {
  return (
    <div className="card card-float p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="stat-label">{label}</span>
        {Icon && (
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${accent}22`, color: accent, boxShadow: `0 0 16px -4px ${accent}66` }}
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
      <div className="mt-2.5 truncate text-xl font-semibold tracking-tight text-silver sm:text-2xl">
        <Money value={value} />
      </div>
      {(sub || trend) && (
        <div className="mt-1 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={`chip ${
                trend.dir === 'up'
                  ? 'bg-bad/10 text-red-300'
                  : trend.dir === 'down'
                    ? 'bg-good/10 text-green-300'
                    : 'bg-ink-800 text-zinc-400'
              }`}
            >
              {trend.dir === 'up' ? '▲' : trend.dir === 'down' ? '▼' : '•'} {trend.label}
            </span>
          )}
          {sub && <span className="text-zinc-500">{sub}</span>}
        </div>
      )}
    </div>
  )
}
