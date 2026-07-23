import { useMemo, useState } from 'react'
import {
  Plus, Loader2, Trash2, Pencil, Check, X, PiggyBank, ChevronDown,
  Wallet, CalendarClock,
} from 'lucide-react'
import { useData } from '../store/DataContext'
import { ICON_NAMES, COLORS, iconFor } from '../lib/categoryMeta'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import Money from '../components/Money'
import ProgressBar from '../components/ProgressBar'
import PieBreakdown from '../components/charts/PieBreakdown'
import { parseAmount, formatCHF } from '../lib/money'
import { todayISO, formatDate } from '../lib/dates'
import {
  goalProgress, totalSaved, monthSavings, savingsPieData,
} from '../logic/savings'
import { leftToSpendThisMonth } from '../logic/selectors'

const blankGoal = { name: '', icon: 'PiggyBank', color: '#22c55e', target_amount: '', target_date: '', monthly_target: '' }

export default function Savings() {
  const {
    savingsGoals, savingsContributions, incomes, expenses, fixedCosts,
    addSavingsGoal, updateSavingsGoal, deleteSavingsGoal,
  } = useData()
  const [editing, setEditing] = useState(null) // id | 'new' | null
  const [draft, setDraft] = useState(blankGoal)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const saved = useMemo(() => totalSaved(savingsContributions), [savingsContributions])
  const savedMonth = useMemo(() => monthSavings(savingsContributions), [savingsContributions])
  const pie = useMemo(() => savingsPieData(savingsGoals, savingsContributions), [savingsGoals, savingsContributions])
  const availableToSave = useMemo(
    () => leftToSpendThisMonth({ incomes, expenses, fixedCosts, savedThisMonth: savedMonth }),
    [incomes, expenses, fixedCosts, savedMonth],
  )

  function startNew() {
    setDraft(blankGoal); setEditing('new'); setError(null)
  }
  function startEdit(goal) {
    setDraft({
      name: goal.name,
      icon: goal.icon || 'PiggyBank',
      color: goal.color || '#22c55e',
      target_amount: goal.target_amount != null ? String(goal.target_amount) : '',
      target_date: goal.target_date || '',
      monthly_target: goal.monthly_target != null ? String(goal.monthly_target) : '',
    })
    setEditing(goal.id); setError(null)
  }
  function cancel() {
    setEditing(null); setDraft(blankGoal); setError(null)
  }

  async function save() {
    if (!draft.name.trim()) return setError('Bitte gib einen Namen ein.')
    const payload = {
      name: draft.name.trim(),
      icon: draft.icon,
      color: draft.color,
      target_amount: draft.target_amount ? parseAmount(draft.target_amount) || null : null,
      target_date: draft.target_date || null,
      monthly_target: draft.monthly_target ? parseAmount(draft.monthly_target) || null : null,
    }
    setBusy(true); setError(null)
    try {
      if (editing === 'new') await addSavingsGoal(payload)
      else await updateSavingsGoal(editing, payload)
      cancel()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(goal) {
    if (!window.confirm(`Sparziel „${goal.name}" löschen? Damit werden auch die Einzahlungen entfernt.`)) return
    try {
      await deleteSavingsGoal(goal.id)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div>
      <PageHeader title="Sparen" subtitle="Ziele setzen, in deine Töpfe einzahlen und sie wachsen sehen.">
        <button onClick={startNew} className="btn-primary"><Plus className="h-4 w-4" /> Neues Ziel</button>
      </PageHeader>

      {/* How much is actually free to save this month (guards against saving into the red) */}
      <div className={`card mb-5 p-5 ${availableToSave <= 0 ? 'border-bad/30' : ''}`}>
        <span className="stat-label flex items-center gap-1.5">
          <Wallet className="h-4 w-4" /> Verfügbar zum Sparen diesen Monat
        </span>
        <div className={`mt-1.5 truncate text-2xl font-bold sm:text-3xl ${availableToSave > 0 ? 'text-green-400' : 'text-red-300'}`}>
          <Money value={availableToSave} />
        </div>
        <p className="mt-1.5 text-xs text-zinc-500">
          {availableToSave > 0
            ? 'Bleibt nach Einnahmen − Fixkosten − Ausgaben − bereits Gespartem. So viel kannst du diesen Monat noch in einen Topf legen.'
            : 'Diesen Monat ist nichts zum Sparen übrig — du bist im Minus. Sparen lohnt sich erst wieder, wenn Geld verfügbar ist.'}
        </p>
      </div>

      {/* Summary */}
      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="grid grid-cols-2 gap-3 lg:col-span-1 lg:grid-cols-1 lg:gap-4">
          <div className="card p-4">
            <span className="stat-label">Gesamt gespart</span>
            <div className="mt-1.5 truncate text-xl font-semibold text-green-400 sm:text-2xl"><Money value={saved} /></div>
          </div>
          <div className="card p-4">
            <span className="stat-label">Diesen Monat gespart</span>
            <div className="mt-1.5 truncate text-xl font-semibold text-zinc-100 sm:text-2xl"><Money value={savedMonth} /></div>
          </div>
        </div>
        {pie.length > 0 && (
          <section className="card p-5 lg:col-span-2">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-zinc-100">
              <PiggyBank className="h-[18px] w-[18px] text-accent-soft" /> So verteilt sich dein Sparen
            </h2>
            <PieBreakdown data={pie} />
          </section>
        )}
      </div>

      {editing === 'new' && (
        <div className="mb-5">
          <GoalEditor draft={draft} setDraft={setDraft} onSave={save} onCancel={cancel} busy={busy} error={error} />
        </div>
      )}

      {savingsGoals.length === 0 && editing !== 'new' ? (
        <EmptyState icon={PiggyBank} title="Noch keine Sparziele"
          message="Erstelle einen Topf wie „Ferien“, „Notgroschen“ oder „Neues Auto“ und zahle ein." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {savingsGoals.map((goal) => {
            if (editing === goal.id) {
              return (
                <div key={goal.id} className="lg:col-span-2">
                  <GoalEditor draft={draft} setDraft={setDraft} onSave={save} onCancel={cancel} busy={busy} error={error} />
                </div>
              )
            }
            return (
              <GoalCard key={goal.id} goal={goal}
                onEdit={() => startEdit(goal)} onDelete={() => handleDelete(goal)} />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
function GoalCard({ goal, onEdit, onDelete }) {
  const { savingsContributions, addContribution, deleteContribution } = useData()
  const [adding, setAdding] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const Icon = iconFor(goal.icon)
  const p = goalProgress(goal, savingsContributions)
  const contributions = useMemo(
    () => savingsContributions
      .filter((c) => c.goal_id === goal.id)
      .sort((a, b) => String(b.date).localeCompare(String(a.date))),
    [savingsContributions, goal.id],
  )

  async function handleAdd(e) {
    e.preventDefault()
    const value = parseAmount(amount)
    if (value <= 0) return setError('Enter an amount greater than zero.')
    setBusy(true); setError(null)
    try {
      await addContribution({ goal_id: goal.id, amount: value, date, notes: note.trim() || null })
      setAmount(''); setNote(''); setDate(todayISO()); setAdding(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const shown = showAll ? contributions : contributions.slice(0, 3)

  return (
    <div className="card flex flex-col p-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${goal.color}22`, color: goal.color }}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-zinc-100">{goal.name}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {p.hasTarget
              ? <>{formatCHF(p.balance)} <span className="text-zinc-600">von</span> {formatCHF(p.target)}</>
              : <span className="text-zinc-400">Offener Topf · {formatCHF(p.balance)} gespart</span>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={onEdit} aria-label={`${goal.name} bearbeiten`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-ink-700 hover:text-zinc-100 cursor-pointer">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={onDelete} aria-label={`${goal.name} löschen`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-bad/15 hover:text-red-300 cursor-pointer">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Target progress */}
      {p.hasTarget && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className={p.done ? 'font-medium text-green-300' : 'text-zinc-400'}>
              {p.done ? '🎉 Ziel erreicht!' : `noch ${formatCHF(p.remaining)}`}
            </span>
            <span className="tabular-nums text-zinc-400">{Math.round(p.pct * 100)}%</span>
          </div>
          <ProgressBar ratio={p.pct} color={goal.color} />
        </div>
      )}

      {/* Time-to-target / pace hints */}
      {(p.neededPerMonth != null || p.monthsLeft != null) && !p.done && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
          {goal.target_date && (
            <span className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" />
              {p.overdue ? 'Zieldatum überschritten' : `noch ${p.monthsLeft} ${p.monthsLeft === 1 ? 'Monat' : 'Monate'}`}
            </span>
          )}
          {p.neededPerMonth != null && (
            <span className="tabular-nums">
              <span className="font-medium text-zinc-300">{formatCHF(p.neededPerMonth)}</span>/Mt. nötig
            </span>
          )}
        </div>
      )}

      {/* Monthly plan progress */}
      {p.monthlyTarget != null && p.monthlyTarget > 0 && (
        <div className="mt-3 rounded-xl border border-ink-700 bg-ink-900/50 p-3">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-zinc-400">Plan diesen Monat</span>
            <span className="tabular-nums text-zinc-300">{formatCHF(p.savedThisMonth)} / {formatCHF(p.monthlyTarget)}</span>
          </div>
          <ProgressBar ratio={p.monthlyPct} color="#22c55e" />
        </div>
      )}

      {/* Contribute */}
      <div className="mt-4">
        {adding ? (
          <form onSubmit={handleAdd} className="space-y-3 rounded-xl border border-ink-700 bg-ink-900/50 p-3">
            <div className="grid grid-cols-2 gap-2">
              <input inputMode="decimal" autoFocus className="input" placeholder="Betrag (CHF)"
                value={amount} onChange={(e) => setAmount(e.target.value)} />
              <input type="date" className="input" value={date} max={todayISO()}
                onChange={(e) => setDate(e.target.value)} />
            </div>
            <input className="input" placeholder="Notiz (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            {error && <p className="text-xs text-red-300">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setAdding(false); setError(null) }} className="btn-ghost">Abbrechen</button>
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Einzahlen
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setAdding(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink-700 py-2.5 text-sm font-medium text-zinc-300 transition-colors duration-200 hover:border-accent hover:text-accent-soft cursor-pointer">
            <Wallet className="h-4 w-4" /> Einzahlen
          </button>
        )}
      </div>

      {/* Contribution history */}
      {contributions.length > 0 && (
        <div className="mt-4 border-t border-ink-800 pt-3">
          <div className="space-y-1.5">
            {shown.map((c) => (
              <div key={c.id} className="group flex items-center gap-2 text-sm">
                <span className="text-zinc-500">{formatDate(c.date)}</span>
                {c.notes && <span className="min-w-0 flex-1 truncate text-xs text-zinc-500">· {c.notes}</span>}
                <span className={`tabular-nums text-green-400 ${c.notes ? '' : 'ml-auto'}`}>+<Money value={c.amount} /></span>
                <button onClick={() => window.confirm('Diese Einzahlung löschen?') && deleteContribution(c.id)}
                  aria-label="Einzahlung löschen"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 opacity-0 transition-opacity duration-200 hover:bg-bad/15 hover:text-red-300 cursor-pointer group-hover:opacity-100 focus:opacity-100">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          {contributions.length > 3 && (
            <button onClick={() => setShowAll((v) => !v)}
              className="mt-2 flex items-center gap-1 text-xs font-medium text-accent-soft hover:underline cursor-pointer">
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showAll ? 'rotate-180' : ''}`} />
              {showAll ? 'Weniger anzeigen' : `Alle ${contributions.length} anzeigen`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
function GoalEditor({ draft, setDraft, onSave, onCancel, busy, error }) {
  const Preview = iconFor(draft.icon)
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${draft.color}22`, color: draft.color }}>
          <Preview className="h-6 w-6" />
        </span>
        <input autoFocus className="input flex-1" placeholder="Zielname (z. B. Ferien)"
          value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="label">Zielbetrag (optional)</label>
          <input inputMode="decimal" className="input" placeholder="z. B. 3000"
            value={draft.target_amount} onChange={(e) => setDraft({ ...draft, target_amount: e.target.value })} />
        </div>
        <div>
          <label className="label">Zieldatum (optional)</label>
          <input type="date" className="input" value={draft.target_date} min={todayISO()}
            onChange={(e) => setDraft({ ...draft, target_date: e.target.value })} />
        </div>
        <div>
          <label className="label">Geplant / Monat (optional)</label>
          <input inputMode="decimal" className="input" placeholder="z. B. 300"
            value={draft.monthly_target} onChange={(e) => setDraft({ ...draft, monthly_target: e.target.value })} />
        </div>
      </div>

      <div className="mt-4">
        <span className="label">Icon</span>
        <div className="flex flex-wrap gap-1.5">
          {ICON_NAMES.map((name) => {
            const Icon = iconFor(name)
            const active = draft.icon === name
            return (
              <button key={name} type="button" onClick={() => setDraft({ ...draft, icon: name })}
                aria-label={name} aria-pressed={active}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors duration-200 cursor-pointer ${
                  active ? 'border-accent bg-accent/15 text-accent' : 'border-ink-700 bg-ink-900 text-zinc-400 hover:text-zinc-200'
                }`}>
                <Icon className="h-[18px] w-[18px]" />
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4">
        <span className="label">Farbe</span>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setDraft({ ...draft, color: c })}
              aria-label={`Farbe ${c}`} aria-pressed={draft.color === c}
              className={`h-8 w-8 rounded-full transition-transform duration-200 cursor-pointer ${
                draft.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-ink-850' : ''
              }`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onCancel} className="btn-ghost"><X className="h-4 w-4" /> Abbrechen</button>
        <button onClick={onSave} disabled={busy} className="btn-primary">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Speichern
        </button>
      </div>
    </div>
  )
}
