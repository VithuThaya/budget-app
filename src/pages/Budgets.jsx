import { useState, useMemo } from 'react'
import { Target, Check, Loader2 } from 'lucide-react'
import { useData } from '../store/DataContext'
import { iconFor } from '../lib/categoryMeta'
import { spendByCategory } from '../logic/selectors'
import { parseAmount } from '../lib/money'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import ProgressBar from '../components/ProgressBar'
import Money from '../components/Money'
import { formatMonthLabel } from '../lib/dates'

export default function Budgets() {
  const { categories, budgets, expenses, setBudget } = useData()
  const spent = useMemo(() => spendByCategory(expenses, { monthOnly: true }), [expenses])

  const budgetByCat = useMemo(
    () => new Map(budgets.map((b) => [b.category_id, Number(b.amount)])),
    [budgets],
  )

  const totals = useMemo(() => {
    let budgeted = 0
    let used = 0
    for (const [catId, amt] of budgetByCat.entries()) {
      budgeted += amt
      used += spent.get(catId) || 0
    }
    return { budgeted, used }
  }, [budgetByCat, spent])

  if (categories.length === 0) {
    return (
      <div>
        <PageHeader title="Budgets" subtitle={formatMonthLabel()} />
        <EmptyState icon={Target} title="Noch keine Kategorien"
          message="Erstelle zuerst Kategorien, dann lege je ein Monatsbudget fest."
          actionTo="/categories" actionLabel="Kategorien verwalten" />
      </div>
    )
  }

  const overallRatio = totals.budgeted > 0 ? totals.used / totals.budgeted : 0

  return (
    <div>
      <PageHeader title="Budgets" subtitle={`Monatslimits • ${formatMonthLabel()}`} />

      {/* Overall summary */}
      <div className="card mb-5 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="stat-label">Ausgegeben von Budget diesen Monat</span>
            <div className="mt-1 text-2xl font-semibold text-zinc-50">
              <Money value={totals.used} /> <span className="text-base font-normal text-zinc-500">/ <Money value={totals.budgeted} /></span>
            </div>
          </div>
          <span className={`chip ${overallRatio >= 1 ? 'bg-bad/10 text-red-300' : overallRatio >= 0.85 ? 'bg-warn/10 text-amber-300' : 'bg-good/10 text-green-300'}`}>
            {Math.round(overallRatio * 100)}% genutzt
          </span>
        </div>
        <div className="mt-3"><ProgressBar ratio={overallRatio} /></div>
      </div>

      <div className="space-y-3">
        {categories.map((cat) => (
          <BudgetRow
            key={cat.id}
            category={cat}
            budget={budgetByCat.get(cat.id) || 0}
            spent={spent.get(cat.id) || 0}
            onSave={(amt) => setBudget(cat.id, amt)}
          />
        ))}
      </div>
    </div>
  )
}

function BudgetRow({ category, budget, spent, onSave }) {
  const [value, setValue] = useState(budget ? String(budget) : '')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const Icon = iconFor(category.icon)
  const ratio = budget > 0 ? spent / budget : 0
  const remaining = budget - spent
  const dirty = parseAmount(value) !== budget

  async function save() {
    setBusy(true)
    try {
      await onSave(parseAmount(value))
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${category.color}22`, color: category.color }}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-zinc-100">{category.name}</p>
          <p className="text-xs text-zinc-500">
            <Money value={spent} /> ausgegeben
            {budget > 0 && (
              <> • {remaining >= 0 ? <span className="text-zinc-400"><Money value={remaining} /> übrig</span>
                : <span className="text-red-300"><Money value={-remaining} /> über</span>}</>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500">CHF</span>
            <input
              inputMode="decimal"
              className="input w-24 pl-10 sm:w-32"
              placeholder="0.00"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
          </div>
          <button onClick={save} disabled={busy || !dirty}
            className="btn-primary h-[42px] px-3" aria-label={`Budget ${category.name} speichern`}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {budget > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1"><ProgressBar ratio={ratio} /></div>
          <span className={`shrink-0 text-xs tabular-nums ${ratio >= 1 ? 'text-red-300' : ratio >= 0.85 ? 'text-amber-300' : 'text-zinc-500'}`}>
            {Math.round(ratio * 100)}%
          </span>
        </div>
      )}
      {saved && <p className="mt-2 text-xs text-green-400">Gespeichert</p>}
    </div>
  )
}
