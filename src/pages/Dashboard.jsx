import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Wallet, TrendingDown, TrendingUp, CalendarDays, ArrowRight, Sparkles, Target,
  CalendarClock,
} from 'lucide-react'
import { useData } from '../store/DataContext'
import { iconFor } from '../lib/categoryMeta'
import {
  monthSpend, weekSpend, monthIncome, spendByCategory, monthlyFixedTotal, accountBalance,
  fixedChargesToDate, leftToSpendThisMonth,
} from '../logic/selectors'
import { monthSavings } from '../logic/savings'
import { generateAlerts } from '../logic/advisor'
import { weeklyTotals, formatMonthLabel } from '../lib/dates'
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
  } = useData()

  const spentMonth = useMemo(() => monthSpend(expenses), [expenses])
  const spentWeek = useMemo(() => weekSpend(expenses), [expenses])
  const incomeMonth = useMemo(() => monthIncome(incomes), [incomes])
  const fixedMonth = useMemo(() => monthlyFixedTotal(fixedCosts), [fixedCosts])
  const savedMonth = useMemo(() => monthSavings(savingsContributions), [savingsContributions])
  const available = incomeMonth - fixedMonth
  const leftToSpend = leftToSpendThisMonth({ incomes, expenses, fixedCosts, savedThisMonth: savedMonth })
  const fixedBilled = useMemo(() => fixedChargesToDate(fixedCosts), [fixedCosts])
  const balance = useMemo(() => accountBalance(incomes, expenses, fixedCosts), [incomes, expenses, fixedCosts])
  const totalIncome = useMemo(() => incomes.reduce((a, i) => a + Number(i.amount), 0), [incomes])
  const totalSpent = useMemo(() => expenses.reduce((a, e) => a + Number(e.amount), 0), [expenses])

  const weekly = useMemo(() => weeklyTotals(expenses, 6), [expenses])
  const weekTrend = useMemo(() => {
    const prev = weekly[weekly.length - 2]?.total || 0
    const cur = weekly[weekly.length - 1]?.total || 0
    if (prev === 0) return null
    const pct = Math.round(((cur - prev) / prev) * 100)
    return { dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat', label: `${Math.abs(pct)}% vs last wk` }
  }, [weekly])

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

  if (loading) return <DashboardSkeleton />

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-[1.65rem]">Übersicht</h1>
        <p className="mt-1 text-sm text-zinc-400">{formatMonthLabel()} im Überblick</p>
      </div>

      {/* Account balance (bank-style: all income − all expenses, carries forward) */}
      <section className="card mb-5 overflow-hidden bg-gradient-to-br from-ink-900 to-ink-850 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="stat-label flex items-center gap-1.5">
            <Wallet className="h-4 w-4" /> Kontostand
          </span>
          <span className={`chip ${balance >= 0 ? 'bg-good/10 text-green-300' : 'bg-bad/10 text-red-300'}`}>
            {balance >= 0 ? 'im Plus' : 'im Minus'}
          </span>
        </div>
        <div className={`mt-1.5 truncate text-3xl font-bold tracking-tight sm:text-4xl ${balance >= 0 ? 'text-green-400' : 'text-red-300'}`}>
          <Money value={balance} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
          <span className="whitespace-nowrap">Einnahmen <Money value={totalIncome} className="tabular-nums text-green-400" /></span>
          <span className="whitespace-nowrap">− Ausgaben <Money value={totalSpent} className="tabular-nums text-zinc-300" /></span>
          <Link to="/fixed-costs" className="whitespace-nowrap hover:text-accent-soft hover:underline cursor-pointer">
            − Fixkosten <Money value={fixedBilled} className="tabular-nums text-zinc-300" />
          </Link>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Einnahmen − Ausgaben − bereits fällige Fixkosten, fortlaufend — wie dein echtes Bankkonto. Wird in den nächsten Monat übertragen.
        </p>
      </section>

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Einnahmen diesen Monat" value={incomeMonth} icon={TrendingUp} accent="#22c55e" />
        <StatCard label="Fixkosten / Mt." value={fixedMonth} icon={CalendarClock} accent="#f59e0b" />
        <StatCard label="Ausgegeben diesen Monat" value={spentMonth} icon={TrendingDown} accent="#ef4444" />
        <StatCard label={leftToSpend >= 0 ? 'Übrig zum Ausgeben' : 'Über Budget'} value={leftToSpend} icon={Wallet} accent="#2563eb" />
      </div>

      {/* Available-to-spend breakdown */}
      <section className="card mt-5 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-zinc-100">
            <Wallet className="h-[18px] w-[18px] text-accent-soft" /> Verfügbar zum Ausgeben
          </h2>
          <span className="text-xs text-zinc-500">{formatMonthLabel()}</span>
        </div>
        <div className="space-y-2.5 text-sm">
          <BreakdownRow label="Einnahmen diesen Monat" value={incomeMonth} tone="pos" />
          <BreakdownRow label="Fixkosten" value={-fixedMonth} tone="neg" linkTo="/fixed-costs" />
          <div className="flex items-center justify-between border-t border-ink-800 pt-2.5 font-medium text-zinc-100">
            <span>Verfügbar</span>
            <Money value={available} className="text-base font-semibold" />
          </div>
          <BreakdownRow label="Ausgegeben diesen Monat" value={-spentMonth} tone="neg" />
          {savedMonth > 0 && <BreakdownRow label="Diesen Monat gespart" value={-savedMonth} tone="neg" linkTo="/savings" />}
          <div className="flex items-center justify-between border-t border-ink-800 pt-2.5 font-semibold">
            <span className="text-zinc-100">Übrig zum Ausgeben</span>
            <Money value={leftToSpend} className={`text-lg font-bold ${leftToSpend >= 0 ? 'text-green-400' : 'text-red-300'}`} />
          </div>
        </div>
        {incomeMonth === 0 && (
          <p className="mt-3 text-xs text-zinc-500">
            Noch keine Einnahmen diesen Monat — trage sie unter „Einnahmen" ein, für ein genaues Bild.
          </p>
        )}
      </section>

      {/* Advisor + weekly */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-zinc-100">
              <CalendarDays className="h-[18px] w-[18px] text-accent-soft" /> Wöchentliche Ausgaben
            </h2>
            <Link to="/reports" className="text-xs font-medium text-accent-soft hover:underline cursor-pointer">Berichte ansehen</Link>
          </div>
          <WeeklyBars data={weekly} height={220} />
        </section>

        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-zinc-100">
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
            <h2 className="flex items-center gap-2 font-semibold text-zinc-100">
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
            <h2 className="font-semibold text-zinc-100">Letzte Buchungen</h2>
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

function BreakdownRow({ label, value, tone, linkTo }) {
  const color = tone === 'pos' ? 'text-green-400' : tone === 'neg' ? 'text-zinc-300' : 'text-zinc-300'
  return (
    <div className="flex items-center justify-between text-zinc-400">
      {linkTo ? (
        <Link to={linkTo} className="hover:text-accent-soft hover:underline cursor-pointer">{label}</Link>
      ) : (
        <span>{label}</span>
      )}
      <Money value={value} signed={value < 0} className={`tabular-nums ${color}`} />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-8 w-48 rounded-lg bg-ink-800" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-ink-800" />)}
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-72 rounded-2xl bg-ink-800 lg:col-span-2" />
        <div className="h-72 rounded-2xl bg-ink-800" />
      </div>
    </div>
  )
}
