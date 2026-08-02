import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { iconFor } from '../lib/categoryMeta'
import { formatDate } from '../lib/dates'
import Money from './Money'

const SWIPE_OPEN = -76 // px — just enough to reveal the delete panel
const SWIPE_THRESHOLD = -32 // px drag past this snaps open on release

// Consistent transaction row used on Expenses, Dashboard and Incomes.
// The whole row is tappable to edit (mobile-friendly — no hover needed); delete
// is a small, always-visible button, plus a swipe-left reveal for touch. `category`
// may be undefined (e.g. deleted category) — we fall back gracefully.
export default function TransactionCard({
  title, amount, date, category,
  editTo, onDelete, kind = 'expense',
}) {
  const navigate = useNavigate()
  const Icon = iconFor(category?.icon)
  const color = category?.color || '#64748b'
  const sign = kind === 'income' ? '+' : '−'
  const amountColor = kind === 'income' ? 'text-good' : 'text-zinc-100'

  const [translateX, setTranslateX] = useState(0)
  const drag = useRef({ startX: 0, base: 0, dragging: false, moved: false })

  function onTouchStart(e) {
    if (!onDelete) return
    drag.current = { startX: e.touches[0].clientX, base: translateX, dragging: true, moved: false }
  }
  function onTouchMove(e) {
    if (!drag.current.dragging) return
    const dx = e.touches[0].clientX - drag.current.startX
    if (Math.abs(dx) > 6) drag.current.moved = true
    setTranslateX(Math.min(0, Math.max(SWIPE_OPEN, drag.current.base + dx)))
  }
  function onTouchEnd() {
    drag.current.dragging = false
    setTranslateX((x) => (x < SWIPE_THRESHOLD ? SWIPE_OPEN : 0))
  }

  function handleClick() {
    if (drag.current.moved) { drag.current.moved = false; return }
    if (translateX !== 0) { setTranslateX(0); return }
    if (editTo) navigate(editTo)
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {onDelete && (
        <div className="absolute inset-y-0 right-0 flex w-[76px] items-stretch">
          <button
            onClick={(e) => { e.stopPropagation(); setTranslateX(0); onDelete() }}
            aria-label="Löschen"
            className="flex flex-1 items-center justify-center bg-bad/80 text-white"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
      <div
        onClick={handleClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        role={editTo ? 'button' : undefined}
        tabIndex={editTo ? 0 : undefined}
        onKeyDown={editTo ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(editTo) } } : undefined}
        style={{ transform: `translateX(${translateX}px)` }}
        className={`group flex items-center gap-3 rounded-xl border border-white/5 bg-ink-850/50 px-3.5 py-3 backdrop-blur-md transition-transform duration-200 ease-out hover:border-white/10 hover:bg-ink-800/60 ${editTo ? 'cursor-pointer' : ''}`}
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}22`, color }}
        >
          <Icon className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-silver">
            {title || category?.name || 'Ohne Kategorie'}
          </p>
          <p className="mt-0.5 truncate text-xs text-zinc-500">
            {category?.name ? `${category.name} • ` : ''}{formatDate(date)}
          </p>
        </div>

        <div className={`shrink-0 text-sm font-semibold tabular-nums ${amountColor}`}>
          {sign}<Money value={amount} />
        </div>

        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            aria-label="Löschen"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition-colors duration-200 hover:bg-bad/15 hover:text-coral cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
