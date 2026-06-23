import { Link } from 'react-router-dom'
import { Inbox } from 'lucide-react'

// Friendly placeholder shown when a list/chart has no data yet.
export default function EmptyState({ icon: Icon = Inbox, title, message, actionTo, actionLabel }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-800 text-zinc-400">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-zinc-500">{message}</p>}
      {actionTo && actionLabel && (
        <Link to={actionTo} className="btn-primary mt-5">{actionLabel}</Link>
      )}
    </div>
  )
}
