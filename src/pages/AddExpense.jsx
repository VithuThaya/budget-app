import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { Loader2, Save, ArrowLeft, Search, Sparkles } from 'lucide-react'
import { useData } from '../store/DataContext'
import { iconFor } from '../lib/categoryMeta'
import { parseAmount } from '../lib/money'
import { todayISO } from '../lib/dates'
import { buildCategoryIndex, suggestCategory } from '../logic/categorySuggest'
import PageHeader from '../components/PageHeader'

export default function AddExpense() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { categories, expenses, addExpense, updateExpense } = useData()

  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  // How often each category has been used — most-used float to the top.
  const freq = useMemo(() => {
    const m = new Map()
    for (const e of expenses) m.set(e.category_id, (m.get(e.category_id) || 0) + 1)
    return m
  }, [expenses])

  // Auto-suggest a category from the typed description, learned from history.
  const catIndex = useMemo(() => buildCategoryIndex(expenses), [expenses])
  const suggestedId = useMemo(() => suggestCategory(notes, catIndex), [notes, catIndex])

  const sortedCats = useMemo(() => {
    const q = search.trim().toLowerCase()
    return [...categories]
      .filter((c) => !q || c.name.toLowerCase().includes(q))
      .sort((a, b) => (freq.get(b.id) || 0) - (freq.get(a.id) || 0))
  }, [categories, freq, search])

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

  // Prefill from URL params (iPhone Shortcut deep link: ?amount=&date=&notes=).
  // New expense only; runs once. parseAmount runs on submit, so amount stays raw.
  const prefilled = useRef(false)
  useEffect(() => {
    if (isEdit || prefilled.current) return
    const a = searchParams.get('amount')
    const d = searchParams.get('date')
    const n = searchParams.get('notes')
    if (a == null && d == null && n == null) return
    prefilled.current = true
    if (a != null) setAmount(a)
    if (n != null) setNotes(n)
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) setDate(d)
  }, [isEdit, searchParams])

  // Default category once loaded (new expense only): prefer the history-based
  // suggestion (from notes), else the first category.
  useEffect(() => {
    if (isEdit || categoryId || !categories.length) return
    setCategoryId(suggestedId || categories[0].id)
  }, [categories, isEdit, categoryId, suggestedId])

  async function handleSubmit(e) {
    e.preventDefault()
    const value = parseAmount(amount)
    if (value <= 0) {
      setError('Gib einen Betrag größer als null ein.')
      return
    }
    if (!categoryId) {
      setError('Wähle eine Kategorie.')
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
      <PageHeader title={isEdit ? 'Ausgabe bearbeiten' : 'Ausgabe hinzufügen'} subtitle="Erfasse, was du ausgegeben hast und wohin es gehört.">
        <Link to="/expenses" className="btn-ghost"><ArrowLeft className="h-4 w-4" /> Zurück</Link>
      </PageHeader>

      <form onSubmit={handleSubmit} className="card space-y-5 p-5 sm:p-6">
        {/* Amount */}
        <div>
          <label htmlFor="amount" className="label">Betrag (CHF)</label>
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

        {/* Description — first, so the category can be auto-suggested from it */}
        <div>
          <label htmlFor="notes" className="label">Beschreibung / Notiz</label>
          <input id="notes" className="input"
            placeholder="z. B. Coop Redbull, SV Kaffi, Migros…"
            value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {/* Category — searchable, most-used first, with a suggestion from history */}
        <div>
          <span className="label">Kategorie</span>
          {categories.length > 6 && (
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Kategorie suchen…" className="input pl-10" />
            </div>
          )}

          {suggestedId && suggestedId !== categoryId && (() => {
            const s = categories.find((c) => c.id === suggestedId)
            if (!s) return null
            const SIcon = iconFor(s.icon)
            return (
              <button type="button" onClick={() => setCategoryId(suggestedId)}
                className="mb-2 flex w-full items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-zinc-200 transition-colors duration-200 hover:bg-accent/15 cursor-pointer">
                <Sparkles className="h-4 w-4 shrink-0 text-accent-soft" />
                <span className="shrink-0 text-zinc-400">Vorschlag:</span>
                <SIcon className="h-4 w-4 shrink-0" style={{ color: s.color }} />
                <span className="truncate font-medium">{s.name}</span>
                <span className="ml-auto shrink-0 text-xs font-medium text-accent-soft">übernehmen</span>
              </button>
            )
          })()}

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {sortedCats.map((cat) => {
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
              Noch keine Kategorien. <Link to="/categories" className="text-accent-soft underline">Erstelle eine</Link>.
            </p>
          )}
          {sortedCats.length === 0 && categories.length > 0 && (
            <p className="mt-2 text-sm text-zinc-500">Keine Kategorie gefunden für „{search}".</p>
          )}
        </div>

        {/* Date */}
        <div>
          <label htmlFor="date" className="label">Datum</label>
          <input id="date" type="date" className="input" value={date} max={todayISO()}
            onChange={(e) => setDate(e.target.value)} />
        </div>

        {error && <p className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-red-300">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Link to="/expenses" className="btn-ghost">Abbrechen</Link>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? 'Änderungen speichern' : 'Ausgabe hinzufügen'}
          </button>
        </div>
      </form>
    </div>
  )
}
