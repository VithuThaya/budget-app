import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Wallet, TrendingDown, TrendingUp, CalendarDays, ArrowRight, Sparkles, Target,
  CalendarClock, ClipboardCheck, Check, Loader2, ChevronDown,
} from 'lucide-react'
import { useData } from '../store/DataContext'
import { iconFor } from '../lib/categoryMeta'
import {
  monthSpend, weekSpend, monthIncome, spendByCategory, monthlyFixedTotal, accountBalance,
  fixedPaidTotal, monthCarryover, fixedDueThisMonth, leftToSpendThisMonth,
  projectedMonthEndBalance, fixedOpenThisMonth, isFixedOpenThisMonth,
} from '../logic/selectors'
import { monthSavings } from '../logic/savings'
import { generateAlerts } from '../logic/advisor'
import { monthEndCheck } from '../logic/fixedSchedule'
import { weeklyTotals, formatMonthLabel, todayISO, parseISO, formatDate } from '../lib/dates'
import StatCard from '../components/StatCard'
import AlertBanner from '../components/AlertBanner'
import ProgressBar from '../components/ProgressBar'
import WeeklyBars from '../components/charts/WeeklyBars'
import TransactionCard from '../components/TransactionCard'
import EmptyState from '../components/EmptyState'
import Money from '../components/Money'

export default function Dashboard() {
  const {
    expenses, incomes, fixedCosts, savingsContributions,
    categories, budgets, categoryMap, deleteExpense, loading,
    fixedCheckMonth, confirmFixedCheck,
  } = useData()

  const spentMonth = useMemo(() => monthSpend(expenses), [expenses])
  const spentWeek = useMemo(() => weekSpend(expenses), [expenses])
  const incomeMonth = useMemo(() => monthIncome(incomes), [incomes])
  const fixedMonth = useMemo(() => monthlyFixedTotal(fixedCosts), [fixedCosts])
  const fixedDueMonth = useMemo(() => fixedDueThisMonth(fixedCosts), [fixedCosts])
  const savedMonth = useMemo(() => monthSavings(savingsContributions), [savingsContributions])
  const carryover = useMemo(() => monthCarryover(incomes, expenses, fixedCosts), [incomes, expenses, fixedCosts])
  const leftToSpend = useMemo(
    () => leftToSpendThisMonth({ incomes, expenses, fixedCosts, savedThisMonth: savedMonth }),
    [incomes, expenses, fixedCosts, savedMonth],
  )
  const fixedBilled = useMemo(() => fixedPaidTotal(fixedCosts), [fixedCosts])
  const balance = useMemo(() => accountBalance(incomes, expenses, fixedCosts), [incomes, expenses, fixedCosts])
  // Month-end view: today's balance minus the fixed costs still to be debited.
  // Both numbers converge on the last day of the month — if they don't, something
  // was missed. That is the built-in cross-check.
  const projected = useMemo(() => projectedMonthEndBalance(incomes, expenses, fixedCosts), [incomes, expenses, fixedCosts])
  const fixedStillOpen = useMemo(() => fixedOpenThisMonth(fixedCosts), [fixedCosts])
  const openCount = useMemo(() => (fixedCosts || []).filter((fc) => isFixedOpenThisMonth(fc)).length, [fixedCosts])
  const totalIncome = useMemo(() => incomes.reduce((a, i) => a + Number(i.amount), 0), [incomes])
  const totalSpent = useMemo(() => expenses.reduce((a, e) => a + Number(e.amount), 0), [expenses])

  const weekly = useMemo(() => weeklyTotals(expenses, 6), [expenses])

  // Month-end reconciliation: at the turn of the month, show what the app booked
  // by itself so it can be held against the bank statement once.
  const check = useMemo(
    () => monthEndCheck(fixedCosts, todayISO(), fixedCheckMonth),
    [fixedCosts, fixedCheckMonth],
  )

  const alerts = useMemo(
    () => generateAlerts({ expenses, budgets, categoryMap }),
    [expenses, budgets, categoryMap],
  )

  const budgetStatus = useMemo(() => {
    const spent = spendByCategory(expenses, { monthOnly: true })
    return budgets
      .map((b) => {
        const cat = categoryMap.get(b.category_id)
        if (!cat) return null
        const used = spent.get(b.category_id) || 0
        return { cat, budget: Number(b.amount), used, ratio: b.amount > 0 ? used / b.amount : 0 }
      })
      .filter(Boolean)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 5)
  }, [budgets, expenses, categoryMap])

  const recent = useMemo(
    () => [...expenses].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 6),
    [expenses],
  )

  const [expanded, setExpanded] = useState(false)

  if (loading) return <DashboardSkeleton />

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-silver sm:text-[1.65rem]">Übersicht</h1>
        <p className="mt-1 text-sm text-zinc-400">{formatMonthLabel()} im Überblick</p>
      </div>

      {check && <MonthEndCheck check={check} onConfirm={confirmFixedCheck} />}

      {/* Account balance (bank-style: all income − all expenses, carries forward) */}
      <section className="card card-float mb-5 overflow-hidden bg-aurora p-5 shadow-glow-lg sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="stat-label flex items-center gap-1.5">
            <Wallet className="h-4 w-4" /> Kontostand
          </span>
          <span className={`chip ${balance >= 0 ? 'bg-good/15 text-good' : 'bg-bad/15 text-bad'}`}>
            {balance >= 0 ? '▲ im Plus' : '▼ im Minus'}
          </span>
        </div>
        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Jetzt auf dem Konto</p>
        <div className={`mt-0.5 truncate text-4xl font-bold tracking-tight sm:text-5xl ${balance >= 0 ? 'text-good' : 'text-bad'}`}>
          <Money value={balance} />
        </div>

        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-4 flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-900/40 px-3.5 py-2.5 text-xs font-medium text-zinc-400 backdrop-blur-md transition-colors hover:text-zinc-200 cursor-pointer"
          aria-expanded={expanded}
        >
          <span>Details {expanded ? 'ausblenden' : 'anzeigen'}</span>
          <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
        </button>

        <div className={`grid transition-all duration-300 ease-out ${expanded ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
              <span className="whitespace-nowrap">Einnahmen <Money value={totalIncome} className="tabular-nums text-good" /></span>
              <span className="whitespace-nowrap">− Ausgaben <Money value={totalSpent} className="tabular-nums text-zinc-300" /></span>
              <Link to="/fixed-costs" className="whitespace-nowrap hover:text-accent-soft hover:underline cursor-pointer">
                − Fixkosten <Money value={fixedBilled} className="tabular-nums text-zinc-300" />
              </Link>
            </div>

            {/* Month-end projection. Converges with the live balance once every fixed
                cost is debited — a mismatch on the 31st means something was missed. */}
            <div className="mt-4 border-t border-white/10 pt-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Ende {formatMonthLabel()} erwartet
                </p>
                {fixedStillOpen > 0 && (
                  <span className="text-xs text-warn">
                    − <Money value={fixedStillOpen} className="tabular-nums" /> offen
                  </span>
                )}
              </div>
              <div className={`mt-0.5 truncate text-2xl font-semibold tracking-tight ${projected >= 0 ? 'text-good' : 'text-bad'}`}>
                <Money value={projected} />
              </div>
              {openCount > 0 ? (
                <Link to="/fixed-costs" className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-accent-soft hover:underline cursor-pointer">
                  {openCount === 1 ? '1 Fixkosten-Abbuchung kommt noch' : `${openCount} Fixkosten-Abbuchungen kommen noch`}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              ) : (
                <p className="mt-1.5 text-xs text-good">Alle Fixkosten diesen Monat abgebucht.</p>
              )}
            </div>

            <p className="mt-3 text-xs text-zinc-500">
              Oben: Einnahmen − Ausgaben − bereits abgebuchte Fixkosten, fortlaufend wie dein Bankkonto.
              Unten: was Ende Monat übrig ist, wenn keine weiteren Ausgaben dazukommen. Am Monatsende sind beide Zahlen gleich.
            </p>
          </div>
        </div>
      </section>

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Einnahmen diesen Monat" value={incomeMonth} icon={TrendingUp} accent="#34D399" />
        <StatCard label="Fixkosten / Mt." value={fixedMonth} icon={CalendarClock} accent="#F5B942" />
        <StatCard label="Ausgegeben diesen Monat" value={spentMonth} icon={TrendingDown} accent="#FF6B7A" />
        <StatCard label={leftToSpend >= 0 ? 'Übrig zum Ausgeben' : 'Über Budget'} value={leftToSpend} icon={Wallet} accent="#9D50BB" />
      </div>


      {/* Advisor + weekly */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-silver">
              <CalendarDays className="h-[18px] w-[18px] text-accent-soft" /> Wöchentliche Ausgaben
            </h2>
            <Link to="/reports" className="text-xs font-medium text-accent-soft hover:underline cursor-pointer">Berichte ansehen</Link>
          </div>
          <WeeklyBars data={weekly} height={220} />
        </section>

        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-silver">
            <Sparkles className="h-[18px] w-[18px] text-accent-soft" /> Ausgaben-Berater
          </h2>
          <div className="space-y-2.5">
            {alerts.slice(0, 4).map((a) => (
              <AlertBanner key={a.id} level={a.level} title={a.title} detail={a.detail} />
            ))}
          </div>
        </section>
      </div>

      {/* Budget status + recent */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-silver">
              <Target className="h-[18px] w-[18px] text-accent-soft" /> Budget-Status
            </h2>
            <Link to="/budgets" className="text-xs font-medium text-accent-soft hover:underline cursor-pointer">Verwalten</Link>
          </div>
          {budgetStatus.length === 0 ? (
            <EmptyState icon={Target} title="Keine Budgets gesetzt"
              message="Lege monatliche Limits fest, um deinen Fortschritt zu verfolgen."
              actionTo="/budgets" actionLabel="Budgets festlegen" />
          ) : (
            <div className="space-y-4">
              {budgetStatus.map(({ cat, budget, used, ratio }) => {
                const Icon = iconFor(cat.icon)
                return (
                  <div key={cat.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2 text-zinc-200">
                        <Icon className="h-4 w-4 shrink-0" style={{ color: cat.color }} /> <span className="truncate">{cat.name}</span>
                      </span>
                      <span className="shrink-0 whitespace-nowrap tabular-nums text-zinc-400">
                        <Money value={used} /> / <Money value={budget} />
                      </span>
                    </div>
                    <ProgressBar ratio={ratio} />
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-silver">Letzte Buchungen</h2>
            <Link to="/expenses" className="flex items-center gap-1 text-xs font-medium text-accent-soft hover:underline cursor-pointer">
              Alle ansehen <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState title="Noch keine Ausgaben" message="Füge deine erste Ausgabe hinzu, um sie hier zu sehen."
              actionTo="/expenses/add" actionLabel="Ausgabe hinzufügen" />
          ) : (
            <div className="space-y-2">
              {recent.map((e) => (
                <TransactionCard
                  key={e.id}
                  title={e.notes}
                  amount={e.amount}
                  date={e.date}
                  category={categoryMap.get(e.category_id)}
                  editTo={`/expenses/${e.id}/edit`}
                  onDelete={() => window.confirm('Diese Ausgabe löschen?') && deleteExpense(e.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

/**
 * Month-end reconciliation prompt. Automatic booking is only trustworthy if it
 * is checked against the real account once per month — this is that check.
 * Confirming writes the month to budget_settings, so it clears on every device.
 */
function MonthEndCheck({ check, onConfirm }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const monthLabel = formatMonthLabel(parseISO(`${check.month}-01`))

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      await onConfirm(check.month)
    } catch (e) {
      setError(e.message || 'Bestätigung fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card mb-5 border-accent/30 bg-accent/5 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent-soft shadow-glow">
          <ClipboardCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-silver">Monatsabschluss {monthLabel}</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Diese Fixkosten hat die App automatisch gebucht. Vergleiche sie einmal mit
            deinem Bankkonto — dann stimmt der Kontostand garantiert.
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2 border-t border-white/10 pt-3 text-sm">
        {check.items.map((it, i) => (
          <li key={`${it.name}-${it.date}-${i}`} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="truncate text-zinc-200">{it.name}</span>
              <span className="shrink-0 text-xs text-zinc-500">{formatDate(it.date)}</span>
            </span>
            <Money value={it.amount} className="shrink-0 tabular-nums text-zinc-300" />
          </li>
        ))}
        <li className="flex items-center justify-between border-t border-white/10 pt-2.5 font-semibold">
          <span className="text-silver">Gesamt gebucht</span>
          <Money value={check.total} className="tabular-nums text-silver" />
        </li>
      </ul>

      {check.openCount > 0 && (
        <p className="mt-3 text-xs text-warn">
          {check.openCount === 1
            ? '1 Fixkosten-Abbuchung wurde für diesen Monat nicht gebucht — bitte auf der Fixkosten-Seite prüfen.'
            : `${check.openCount} Fixkosten-Abbuchungen wurden für diesen Monat nicht gebucht — bitte auf der Fixkosten-Seite prüfen.`}
        </p>
      )}
      {error && <p className="mt-3 text-sm text-coral">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button onClick={confirm} disabled={busy} className="btn-primary">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Stimmt
        </button>
        <Link to="/fixed-costs" className="btn-ghost">Fixkosten ansehen</Link>
      </div>
    </section>
  )
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-8 w-48 rounded-lg bg-ink-800/70" />
      <div className="mb-5 h-40 rounded-2xl bg-ink-800/70" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-ink-800/70" />)}
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-72 rounded-2xl bg-ink-800/70 lg:col-span-2" />
        <div className="h-72 rounded-2xl bg-ink-800/70" />
      </div>
    </div>
  )
}
