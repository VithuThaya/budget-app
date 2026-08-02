import { useEffect, useRef, useState } from 'react'
import Money from './Money'

const REDUCED_MOTION = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Animates from 0 to `target` once on mount, easing out. Skipped entirely
// under prefers-reduced-motion (returns the target immediately).
function useCountUp(target, duration = 650) {
  const [display, setDisplay] = useState(REDUCED_MOTION ? target : 0)
  const startRef = useRef(null)

  useEffect(() => {
    if (REDUCED_MOTION) { setDisplay(target); return }
    startRef.current = null
    let frame
    function tick(t) {
      if (startRef.current === null) startRef.current = t
      const elapsed = t - startRef.current
      const p = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - p, 4) // ease-out-quart
      setDisplay(target * eased)
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return display
}

// Headline metric card used on the Dashboard and Reports.
export default function StatCard({ label, value, icon: Icon, accent = '#9D50BB', sub, trend }) {
  const animated = useCountUp(Number(value) || 0)
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
        <Money value={animated} />
      </div>
      {(sub || trend) && (
        <div className="mt-1 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={`chip ${
                trend.dir === 'up'
                  ? 'bg-bad/15 text-bad'
                  : trend.dir === 'down'
                    ? 'bg-good/15 text-good'
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
