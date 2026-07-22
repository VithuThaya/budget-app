import { Link } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { iconFor } from '../lib/categoryMeta'
import { formatDate } from '../lib/dates'
import Money from './Money'

// Consistent transaction row used on Expenses, Dashboard and Incomes.
// `category` may be undefined (e.g. deleted category) — we fall back gracefully.
export default function TransactionCard({
  title, amount, date, category,
  editTo, onDelete, kind = 'expense',
}) {
  const Icon = iconFor(category?.icon)
  const color = category?.color || '#64748b'
  const sign = kind === 'income' ? '+' : '−'
  const amountColor = kind === 'income' ? 'text-green-400' : 'text-zinc-100'

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-ink-800 bg-ink-850/60 px-3.5 py-3 transition-colors duration-200 hover:border-ink-700 hover:bg-ink-800/70">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}22`, color }}
      >
        <Icon className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100">
          {title || category?.name || 'Uncategorised'}
        </p>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {category?.name ? `${category.name} • ` : ''}{formatDate(date)}
        </p>
      </div>

      <div className={`shrink-0 text-sm font-semibold tabular-nums ${amountColor}`}>
        {sign}<Money value={amount} />
      </div>

      {(editTo || onDelete) && (
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
          {editTo && (
            <Link
              to={editTo}
              aria-label="Edit"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-ink-700 hover:text-zinc-100 cursor-pointer"
            >
              <Pencil className="h-4 w-4" />
            </Link>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              aria-label="Delete"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-bad/15 hover:text-red-300 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
