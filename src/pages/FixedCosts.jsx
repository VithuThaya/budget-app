import { useId, useState } from 'react'
import { Plus, Loader2, Trash2, CalendarClock, Power, Check, Pencil } from 'lucide-react'
import { useData } from '../store/DataContext'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import Money from '../components/Money'
import { parseAmount, formatCHF } from '../lib/money'
import { monthlyFixedCost, monthlyFixedTotal, isFixedOpenThisMonth } from '../logic/selectors'
import { nextDueDate } from '../logic/fixedSchedule'
import { todayISO, formatMonthLabel } from '../lib/dates'

/** '2026-07-25' -> '25.07.' — short debit-date label. */
const shortDate = (iso) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.` : '')

const CUR_MONTH = todayISO().slice(0, 7) // 'YYYY-MM'

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
  // null = closed, 'new' = the add form, otherwise the id being edited. One form
  // is open at a time, so the add form and an inline edit can share a component.
  const [editing, setEditing] = useState(null)

  const monthlyTotal = monthlyFixedTotal(fixedCosts)
  const yearlyTotal = monthlyTotal * 12

  // Manual correction path: tick as paid (or undo) for the current month. Costs
  // with a due_day book themselves in DataContext — this stays for exceptions
  // (a debit that did not happen, or one the app has not seen yet).
  function togglePaid(fc) {
    const payments = fc.payments || []
    const paidNow = payments.some((p) => String(p.date).slice(0, 7) === CUR_MONTH)
    const next = paidNow
      ? payments.filter((p) => String(p.date).slice(0, 7) !== CUR_MONTH)
      : [...payments, { date: todayISO(), amount: Number(fc.amount), auto: false }]
    updateFixedCost(fc.id, { payments: next })
  }

  // Editing deliberately writes only the planning fields. `payments` stays
  // untouched: a rent increase must not rewrite months already debited at the
  // old amount, and a changed due_day only affects bookings from here on.
  async function handleSave(values) {
    if (editing === 'new') await addFixedCost({ ...values, payments: [], active: true })
    else await updateFixedCost(editing, values)
    setEditing(null)
  }

  return (
    <div>
      <PageHeader title="Fixkosten" subtitle="Wiederkehrende Verpflichtungen, die vom Einkommen abgezogen werden — so siehst du, was zum Ausgeben bleibt.">
        <button onClick={() => setEditing((v) => (v === 'new' ? null : 'new'))} className="btn-primary">
          <Plus className="h-4 w-4" /> Fixkosten hinzufügen
        </button>
      </PageHeader>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="card p-4">
          <span className="stat-label">Pro Monat</span>
          <div className="mt-1.5 truncate text-xl font-semibold text-warn sm:text-2xl"><Money value={monthlyTotal} /></div>
        </div>
        <div className="card p-4">
          <span className="stat-label">Pro Jahr</span>
          <div className="mt-1.5 truncate text-xl font-semibold text-silver sm:text-2xl"><Money value={yearlyTotal} whole /></div>
        </div>
      </div>

      {editing === 'new' && (
        <FixedCostForm className="card mb-5 space-y-4 p-5" submitLabel="Fixkosten hinzufügen"
          onSubmit={handleSave} onCancel={() => setEditing(null)} />
      )}

      {fixedCosts.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Noch keine Fixkosten"
          message="Füge wiederkehrende Kosten wie Miete, Versicherung oder Abos hinzu, um zu sehen, wie viel dir jeden Monat wirklich bleibt." />
      ) : (
        <div className="space-y-2">
          {fixedCosts.map((fc) => {
            const inactive = fc.active === false
            const showMonthly = fc.period !== 'monthly'
            const paidEntry = (fc.payments || []).find((p) => String(p.date).slice(0, 7) === CUR_MONTH)
            const paidThisMonth = Boolean(paidEntry)
            const openThisMonth = isFixedOpenThisMonth(fc)
            const nextDue = paidThisMonth ? null : nextDueDate(fc, todayISO())
            return (
              <div key={fc.id}
                className={`rounded-xl border border-white/5 bg-ink-850/50 px-3 py-3 backdrop-blur-md transition-all duration-200 hover:border-white/10 hover:bg-ink-800/60 ${inactive ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warn/15 text-warn">
                    <CalendarClock className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-silver">{fc.name}</p>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-silver">
                        <Money value={fc.amount} /><span className="ml-0.5 text-xs font-normal text-zinc-500">/{shortFor(fc.period)}</span>
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                      <span className="chip bg-accent/10 text-accent-soft">{labelFor(fc.period)}</span>
                      {!inactive && paidThisMonth && (
                        <span className="chip bg-good/15 text-good">
                          bezahlt {shortDate(String(paidEntry.date))}{paidEntry.auto ? ' · automatisch' : ''}
                        </span>
                      )}
                      {!inactive && !paidThisMonth && openThisMonth && (
                        <span className="chip bg-warn/15 text-warn">
                          {nextDue ? `fällig ${shortDate(nextDue)}` : 'offen'}
                        </span>
                      )}
                      {inactive && <span className="chip bg-ink-800 text-zinc-400">pausiert</span>}
                      {showMonthly && <span className="tabular-nums">≈ <Money value={monthlyFixedCost(fc)} />/Mt.</span>}
                    </div>
                    {fc.notes && <p className="mt-1 truncate text-xs text-zinc-500">{fc.notes}</p>}
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-end gap-1.5 border-t border-white/10 pt-2.5">
                  {!inactive && (
                    <button onClick={() => togglePaid(fc)}
                      aria-label={paidThisMonth ? `Als offen markieren (${formatMonthLabel()})` : `Als bezahlt markieren (${formatMonthLabel()})`}
                      title={paidThisMonth ? 'Diesen Monat bezahlt — klicken zum Rückgängig' : `Als bezahlt markieren (${formatMonthLabel()})`}
                      className={`mr-auto flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors duration-200 cursor-pointer ${
                        paidThisMonth
                          ? 'border-good/40 bg-good/15 text-good'
                          : 'border-white/10 text-zinc-400 hover:border-good/40 hover:bg-good/10 hover:text-good'
                      }`}>
                      <Check className="h-4 w-4" /> {paidThisMonth ? 'Bezahlt' : 'Als bezahlt'}
                    </button>
                  )}
                  <button onClick={() => setEditing((v) => (v === fc.id ? null : fc.id))}
                    aria-label="Fixkosten bearbeiten" title="Name, Betrag, Zeitraum oder Abbuchungstag ändern"
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 cursor-pointer ${
                      editing === fc.id ? 'bg-accent/15 text-accent-soft' : 'text-zinc-400 hover:bg-ink-800/60 hover:text-accent-soft'
                    }`}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => updateFixedCost(fc.id, { active: inactive })}
                    aria-label={inactive ? 'Fixkosten fortsetzen' : 'Fixkosten pausieren'}
                    title={inactive ? 'Fortsetzen (wieder zählen)' : 'Pausieren (nicht mehr zählen)'}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 cursor-pointer ${
                      inactive ? 'text-zinc-500 hover:bg-good/15 hover:text-good' : 'text-warn hover:bg-warn/15'
                    }`}>
                    <Power className="h-4 w-4" />
                  </button>
                  <button onClick={() => window.confirm('Diese Fixkosten löschen?') && deleteFixedCost(fc.id)} aria-label="Fixkosten löschen"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors duration-200 hover:bg-bad/15 hover:text-coral cursor-pointer">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {editing === fc.id && (
                  <FixedCostForm className="mt-3 space-y-4 border-t border-white/10 pt-4" initial={fc}
                    submitLabel="Änderungen speichern" onSubmit={handleSave} onCancel={() => setEditing(null)} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * Add/edit form for one fixed cost. Shared by the "add" card at the top and the
 * inline editor on a row — the editor sits next to the cost being changed, which
 * matters on a phone where a form at the top of a long list is off-screen.
 * Only ever one instance is mounted, but ids are still scoped via useId so a
 * label can never point at the wrong field.
 * `payments` is not a form field on purpose: recorded debits are history.
 */
function FixedCostForm({ initial, submitLabel, onSubmit, onCancel, className }) {
  const uid = useId()
  const [name, setName] = useState(initial?.name ?? '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [period, setPeriod] = useState(initial?.period ?? 'monthly')
  const [dueDay, setDueDay] = useState(initial?.due_day ? String(initial.due_day) : '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const paidCount = (initial?.payments || []).length

  async function handleSubmit(e) {
    e.preventDefault()
    const value = parseAmount(amount)
    if (!name.trim()) return setError('Gib einen Namen an (z. B. Miete, Krankenkasse).')
    if (value <= 0) return setError('Gib einen Betrag größer als null ein.')
    setBusy(true)
    setError(null)
    try {
      const day = dueDay ? Math.min(31, Math.max(1, parseInt(dueDay, 10))) : null
      await onSubmit({
        name: name.trim(),
        amount: value,
        period,
        due_day: Number.isNaN(day) ? null : day,
        notes: notes.trim() || null,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-name`} className="label">Name</label>
          <input id={`${uid}-name`} className="input" placeholder="Miete, Krankenkasse…" value={name}
            onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <label htmlFor={`${uid}-amount`} className="label">Betrag (CHF)</label>
          <input id={`${uid}-amount`} inputMode="decimal" className="input" placeholder="0.00" value={amount}
            onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <span className="label">Zeitraum</span>
          <div className="flex rounded-xl border border-white/10 bg-ink-900/60 p-1 backdrop-blur-md">
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
          <label htmlFor={`${uid}-due-day`} className="label">Abbuchungstag (optional)</label>
          <input id={`${uid}-due-day`} inputMode="numeric" className="input" placeholder="z. B. 1 oder 25"
            value={dueDay} onChange={(e) => setDueDay(e.target.value.replace(/\D/g, '').slice(0, 2))} />
          <p className="mt-1.5 text-xs text-zinc-400">
            Mit Tag bucht die App automatisch. Fällt der Tag auf ein Wochenende, wird
            — wie beim Dauerauftrag — am Freitag davor abgebucht. Ohne Tag hakst du weiter selbst ab.
          </p>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${uid}-notes`} className="label">Notiz (optional)</label>
          <input id={`${uid}-notes`} className="input" placeholder="Anbieter, Vertragsende…" value={notes}
            onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      {amount && parseAmount(amount) > 0 && period !== 'monthly' && (
        <p className="text-xs text-zinc-400">
          ≈ {formatCHF(monthlyFixedCost({ amount: parseAmount(amount), period }))} pro Monat
        </p>
      )}
      {paidCount > 0 && (
        <p className="text-xs text-zinc-500">
          Bereits gebuchte Abbuchungen bleiben unverändert — ein neuer Betrag gilt erst ab der
          nächsten Buchung, dein Kontostand ändert sich also nicht rückwirkend.
        </p>
      )}
      {error && <p className="text-sm text-coral">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-ghost">Abbrechen</button>
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {submitLabel}
        </button>
      </div>
    </form>
  )
}
