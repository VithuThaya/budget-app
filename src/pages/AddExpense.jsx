import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Loader2, Save, ArrowLeft } from 'lucide-react'
import { useData } from '../store/DataContext'
import { iconFor } from '../lib/categoryMeta'
import { parseAmount } from '../lib/money'
import { todayISO } from '../lib/dates'
import PageHeader from '../components/PageHeader'

export default function AddExpense() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { categories, expenses, addExpense, updateExpense } = useData()

  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // Preload values when editing.
  useEffect(() => {
    if (!isEdit) return
    const exp = expenses.find((e) => e.id === id)
    if (exp) {
      setAmount(String(exp.amount))
      setCategoryId(exp.category_id || '')
      setDate(String(exp.date).slice(0, 10))
      setNotes(exp.notes || '')
    }
  }, [isEdit, id, expenses])

  // Default category to the first one once loaded (new expense only).
  useEffect(() => {
    if (!isEdit && !categoryId && categories.length) setCategoryId(categories[0].id)
  }, [categories, isEdit, categoryId])

  async function handleSubmit(e) {
    e.preventDefault()
    const value = parseAmount(amount)
    if (value <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    if (!categoryId) {
      setError('Pick a category.')
      return
    }
    setBusy(true)
    setError(null)
    const payload = {
      amount: value,
      category_id: categoryId,
      date,
      notes: notes.trim() || null,
    }
    try {
      if (isEdit) await updateExpense(id, payload)
      else await addExpense(payload)
      navigate('/expenses')
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={isEdit ? 'Edit expense' : 'Add expense'} subtitle="Record what you spent and where it belongs.">
        <Link to="/expenses" className="btn-ghost"><ArrowLeft className="h-4 w-4" /> Back</Link>
      </PageHeader>

      <form onSubmit={handleSubmit} className="card space-y-5 p-5 sm:p-6">
        {/* Amount */}
        <div>
          <label htmlFor="amount" className="label">Amount (CHF)</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-zinc-500">CHF</span>
            <input
              id="amount" inputMode="decimal" autoFocus
              className="input pl-12 text-lg font-semibold"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <span className="label">Category</span>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {categories.map((cat) => {
              const Icon = iconFor(cat.icon)
              const active = categoryId === cat.id
              return (
                <button
                  key={cat.id} type="button" onClick={() => setCategoryId(cat.id)} aria-pressed={active}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-colors duration-200 cursor-pointer ${
                    active ? 'border-accent bg-accent/10 text-zinc-100' : 'border-ink-700 bg-ink-900 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${cat.color}22`, color: cat.color }}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="w-full truncate text-center">{cat.name}</span>
                </button>
              )
            })}
          </div>
          {categories.length === 0 && (
            <p className="mt-2 text-sm text-zinc-500">
              No categories yet. <Link to="/categories" className="text-accent-soft underline">Create one</Link>.
            </p>
          )}
        </div>

        {/* Date */}
        <div>
          <label htmlFor="date" className="label">Date</label>
          <input id="date" type="date" className="input" value={date} max={todayISO()}
            onChange={(e) => setDate(e.target.value)} />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="label">Notes (optional)</label>
          <textarea id="notes" rows={3} className="input resize-none"
            placeholder="e.g. Netflix subscription, lunch with team…"
            value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && <p className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Link to="/expenses" className="btn-ghost">Cancel</Link>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? 'Save changes' : 'Add expense'}
          </button>
        </div>
      </form>
    </div>
  )
}
