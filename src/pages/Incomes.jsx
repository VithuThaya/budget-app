import { useState } from 'react'
import { Plus, Loader2, Trash2, TrendingUp, Repeat } from 'lucide-react'
import { useData } from '../store/DataContext'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import Money from '../components/Money'
import { parseAmount } from '../lib/money'
import { todayISO, formatDate } from '../lib/dates'
import { monthIncome } from '../logic/selectors'

const RECUR = [
  { value: '', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

export default function Incomes() {
  const { incomes, addIncome, deleteIncome } = useData()
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [recur, setRecur] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const total = incomes.reduce((a, i) => a + Number(i.amount), 0)
  const thisMonth = monthIncome(incomes)

  async function handleAdd(e) {
    e.preventDefault()
    const value = parseAmount(amount)
    if (!source.trim()) return setError('Add a source name.')
    if (value <= 0) return setError('Enter an amount greater than zero.')
    setBusy(true)
    setError(null)
    try {
      await addIncome({
        source: source.trim(),
        amount: value,
        date,
        recurring: Boolean(recur),
        recur_interval: recur || null,
      })
      setSource(''); setAmount(''); setDate(todayISO()); setRecur(''); setOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader title="Incomes" subtitle="Track salary, side income and recurring payments.">
        <button onClick={() => setOpen((v) => !v)} className="btn-primary"><Plus className="h-4 w-4" /> Add income</button>
      </PageHeader>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="card p-4">
          <span className="stat-label">This month</span>
          <div className="mt-1.5 text-2xl font-semibold text-green-400"><Money value={thisMonth} /></div>
        </div>
        <div className="card p-4">
          <span className="stat-label">All time</span>
          <div className="mt-1.5 text-2xl font-semibold text-zinc-100"><Money value={total} /></div>
        </div>
      </div>

      {open && (
        <form onSubmit={handleAdd} className="card mb-5 space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="source" className="label">Source</label>
              <input id="source" className="input" placeholder="Salary, freelance…" value={source}
                onChange={(e) => setSource(e.target.value)} autoFocus />
            </div>
            <div>
              <label htmlFor="inc-amount" className="label">Amount (CHF)</label>
              <input id="inc-amount" inputMode="decimal" className="input" placeholder="0.00" value={amount}
                onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label htmlFor="inc-date" className="label">Date</label>
              <input id="inc-date" type="date" className="input" value={date} max={todayISO()}
                onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <span className="label">Recurring</span>
              <div className="flex rounded-xl border border-ink-700 bg-ink-900 p-1">
                {RECUR.map((o) => (
                  <button key={o.value} type="button" onClick={() => setRecur(o.value)}
                    className={`flex-1 rounded-lg px-2 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer ${
                      recur === o.value ? 'bg-accent text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}>
                    {o.label}
                  </button>
                ))}
              </div>
              {recur && (
                <p className="mt-1.5 text-xs text-zinc-500">
                  Automatically added every {recur === 'weekly' ? 'week' : 'month'} when you open the app.
                </p>
              )}
            </div>
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add income
            </button>
          </div>
        </form>
      )}

      {incomes.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No income yet" message="Add your income so the app can show your net balance and savings." />
      ) : (
        <div className="space-y-2">
          {incomes.map((inc) => (
            <div key={inc.id}
              className="group flex items-center gap-3 rounded-xl border border-ink-800 bg-ink-850/60 px-3.5 py-3 transition-colors duration-200 hover:border-ink-700 hover:bg-ink-800/70">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-good/15 text-green-400">
                <TrendingUp className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-zinc-100">{inc.source}</p>
                  {inc.recurring && (
                    <span className="chip bg-accent/10 text-accent-soft"><Repeat className="h-3 w-3" />{inc.recur_interval}</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">{formatDate(inc.date)}</p>
              </div>
              <div className="shrink-0 text-sm font-semibold tabular-nums text-green-400">+<Money value={inc.amount} /></div>
              <button onClick={() => window.confirm('Delete this income?') && deleteIncome(inc.id)} aria-label="Delete income"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 opacity-0 transition-opacity duration-200 hover:bg-bad/15 hover:text-red-300 cursor-pointer group-hover:opacity-100 focus:opacity-100">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
