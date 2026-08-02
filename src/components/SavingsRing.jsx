import { Link } from 'react-router-dom'
import { PiggyBank } from 'lucide-react'
import { formatCHF } from '../lib/money'
import { useCountUp } from '../lib/useCountUp'

const SIZE = 128
const STROKE = 10
const RADIUS = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * RADIUS

// Dashboard card: this month's savings progress as a ring. `target` is the
// sum of every goal's monthly_target (null if none is set — then the ring
// just shows the saved amount with no progress arc).
export default function SavingsRing({ saved, target }) {
  const animated = useCountUp(saved)
  const pct = target ? Math.max(0, Math.min(1, saved / target)) : 0
  const offset = CIRC * (1 - pct)

  return (
    <Link to="/savings" className="card card-float press block p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-silver">
          <PiggyBank className="h-[18px] w-[18px] text-accent-soft" /> Gespart im Monat
        </h2>
      </div>
      <div className="flex justify-center">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#2A3048" strokeWidth={STROKE} />
          {target != null && (
            <circle
              cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none"
              stroke="#34D399" strokeWidth={STROKE} strokeLinecap="round"
              strokeDasharray={CIRC} strokeDashoffset={offset}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
          )}
          <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" fill="#E0E0E0" fontSize={17} fontWeight={600}>
            {formatCHF(animated, { whole: true })}
          </text>
          {target != null ? (
            <>
              <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" fill="#A1A1AA" fontSize={10}>
                von {formatCHF(target, { whole: true })}
              </text>
              <text x="50%" y="74%" textAnchor="middle" dominantBaseline="middle" fill="#34D399" fontSize={11} fontWeight={600}>
                {Math.round(pct * 100)}%
              </text>
            </>
          ) : (
            <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" fill="#A1A1AA" fontSize={10}>diesen Monat</text>
          )}
        </svg>
      </div>
    </Link>
  )
}
