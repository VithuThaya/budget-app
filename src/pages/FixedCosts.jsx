import { useState } from 'react'
import { Plus, Loader2, Trash2, CalendarClock, Power } from 'lucide-react'
import { useData } from '../store/DataContext'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import Money from '../components/Money'
import { parseAmount, formatCHF } from '../lib/money'
import { monthlyFixedCost, monthlyFixedTotal } from '../logic/selectors'

const PERIODS = [
  { value: 'weekly', label: 'Wöchentlich', short: 'Wo.' },
  { value: 'monthly', label: 'Monatlich', short: 'Mt.' },
  { value: 'quarterly', label: 'Vierteljährlich', short: 'Qu.' },
  { value: 'yearly', label: 'Jährlich', short: 'J.' },
]

const shortFor = (period) => PERIODS.find((p) => p.value === period)?.short || 'Mt.'
const labelFor = (period) => PERIODS.find((p) => p.value === period)?.label || period

export default function FixedCosts() {
  const { fixedCosts, addFixedCost, updateFixedCost, deleteFixedCost } = useData()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [period, setPeriod] = useState('monthly')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const monthlyTotal = monthlyFixedTotal(fixedCosts)
  const yearlyTotal = monthlyTotal * 12

  async function handleAdd(e) {
    e.preventDefault()
    const value = parseAmount(amount)
    if (!name.trim()) return setError('Gib einen Namen an (z. B. Miete, Krankenkasse).')
    if (value <= 0) return setError('Gib einen Betrag größer als null ein.')
    setBusy(true)
    setError(null)
    try {
      await addFixedCost({
        name: name.trim(),
        amount: value,
        period,
        active: true,
        notes: notes.trim() || null,
      })
      setName(''); setAmount(''); setPeriod('monthly'); setNotes(''); setOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader title="Fixkosten" subtitle="Wiederkehrende Verpflichtungen, die vom Einkommen abgezogen werden — so siehst du, was zum Ausgeben bleibt.">
        <button onClick={() => setOpen((v) => !v)} className="btn-primary"><Plus className="h-4 w-4" /> Fixkosten hinzufügen</button>
      </PageHeader>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="card p-4">
          <span className="stat-label">Pro Monat</span>
          <div className="mt-1.5 truncate text-xl font-semibold text-amber-400 sm:text-2xl"><Money value={monthlyTotal} /></div>
        </div>
        <div className="card p-4">
          <span className="stat-label">Pro Jahr</span>
          <div className="mt-1.5 truncate text-xl font-semibold text-zinc-100 sm:text-2xl"><Money value={yearlyTotal} whole /></div>
        </div>
      </div>

      {open && (
        <form onSubmit={handleAdd} className="card mb-5 space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="fc-name" className="label">Name</label>
              <input id="fc-name" className="input" placeholder="Miete, Krankenkasse…" value={name}
                onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div>
              <label htmlFor="fc-amount" className="label">Betrag (CHF)</label>
              <input id="fc-amount" inputMode="decimal" className="input" placeholder="0.00" value={amount}
                onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <span className="label">Zeitraum</span>
              <div className="flex rounded-xl border border-ink-700 bg-ink-900 p-1">
                {PERIODS.map((o) => (
                  <button key={o.value} type="button" onClick={() => setPeriod(o.value)}
                    className={`flex-1 rounded-lg px-2 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer ${
                      period === o.value ? 'bg-accent text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="fc-notes" className="label">Notiz (optional)</label>
              <input id="fc-notes" className="input" placeholder="Anbieter, Vertragsende…" value={notes}
                onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          {amount && parseAmount(amount) > 0 && period !== 'monthly' && (
            <p className="text-xs text-zinc-400">
              ≈ {formatCHF(monthlyFixedCost({ amount: parseAmount(amount), period }))} pro Monat
            </p>
          )}
          {error && <p className="text-sm text-red-300">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Abbrechen</button>
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Fixkosten hinzufügen
            </button>
          </div>
        </form>
      )}

      {fixedCosts.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Noch keine Fixkosten"
          message="Füge wiederkehrende Kosten wie Miete, Versicherung oder Abos hinzu, um zu sehen, wie viel dir jeden Monat wirklich bleibt." />
      ) : (
        <div className="space-y-2">
          {fixedCosts.map((fc) => {
            const inactive = fc.active === false
            const showMonthly = fc.period !== 'monthly'
            return (
              <div key={fc.id}
                className={`flex items-center gap-3 rounded-xl border border-ink-800 bg-ink-850/60 px-3.5 py-3 transition-colors duration-200 hover:border-ink-700 hover:bg-ink-800/70 ${inactive ? 'opacity-50' : ''}`}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <CalendarClock className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium text-zinc-100">{fc.name}</p>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-100">
                      <Money value={fc.amount} /> <span className="text-xs font-normal text-zinc-500">/{shortFor(fc.period)}</span>
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                    <span className="chip bg-accent/10 text-accent-soft">{labelFor(fc.period)}</span>
                    {inactive && <span className="chip bg-ink-800 text-zinc-400">pausiert</span>}
                    {showMonthly && (
                      <span className="shrink-0 tabular-nums">≈ <Money value={monthlyFixedCost(fc)} />/Mt.</span>
                    )}
                    {fc.notes && <span className="truncate">· {fc.notes}</span>}
                  </div>
                </div>
                <button onClick={() => updateFixedCost(fc.id, { active: inactive })}
                  aria-label={inactive ? 'Fixkosten fortsetzen' : 'Fixkosten pausieren'}
                  title={inactive ? 'Fortsetzen (wieder zählen)' : 'Pausieren (nicht mehr zählen)'}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 cursor-pointer ${
                    inactive ? 'text-zinc-500 hover:bg-good/15 hover:text-green-300' : 'text-amber-400 hover:bg-amber-500/15'
                  }`}>
                  <Power className="h-4 w-4" />
                </button>
                <button onClick={() => window.confirm('Diese Fixkosten löschen?') && deleteFixedCost(fc.id)} aria-label="Fixkosten löschen"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors duration-200 hover:bg-bad/15 hover:text-red-300 cursor-pointer">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
