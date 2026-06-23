import { useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import {
  PieChart, LineChart, BarChart3, PiggyBank, CalendarRange, Sparkles,
  Download, TrendingDown, Trophy, CalendarCheck, Loader2,
} from 'lucide-react'
import { useData } from '../store/DataContext'
import { iconFor } from '../lib/categoryMeta'
import PageHeader from '../components/PageHeader'
import PieBreakdown from '../components/charts/PieBreakdown'
import TrendLine from '../components/charts/TrendLine'
import WeeklyBars from '../components/charts/WeeklyBars'
import ProgressBar from '../components/ProgressBar'
import Money from '../components/Money'
import EmptyState from '../components/EmptyState'
import { formatCHF, formatPct } from '../lib/money'
import {
  dailyTotals, weeklyTotals, formatMonthLabel, isThisMonth, isThisWeek,
  startOfWeek, addDays, parseISO,
} from '../lib/dates'
import { categoryPieData } from '../logic/selectors'
import { savingsPotential } from '../logic/savingsPotential'
import { savingPlans } from '../logic/savingsPlan'
import { monthlyStory } from '../logic/monthlyStory'

export default function Reports() {
  const { expenses, incomes, categoryMap } = useData()

  const pie = useMemo(() => categoryPieData(expenses, categoryMap, { monthOnly: true }), [expenses, categoryMap])
  const trend = useMemo(() => dailyTotals(expenses, 30), [expenses])
  const weekly = useMemo(() => weeklyTotals(expenses, 8), [expenses])

  const compare = useMemo(() => buildComparisons(expenses), [expenses])
  const potential = useMemo(() => savingsPotential({ expenses, categoryMap }), [expenses, categoryMap])
  const plans = useMemo(() => savingPlans({ expenses, categoryMap }), [expenses, categoryMap])
  const story = useMemo(() => monthlyStory({ expenses, incomes, categoryMap }), [expenses, incomes, categoryMap])

  if (expenses.length === 0) {
    return (
      <div>
        <PageHeader title="Reports" subtitle="Insights, trends and saving plans." />
        <EmptyState icon={BarChart3} title="No data to report yet"
          message="Add a few expenses and your charts, savings potential and monthly story will appear here."
          actionTo="/expenses/add" actionLabel="Add expense" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Reports" subtitle={`Insights for ${formatMonthLabel()}`} />

      {/* Comparison summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ComparisonCard
          title="This week vs last week" icon={CalendarRange}
          current={compare.week.current} previous={compare.week.previous} />
        <ComparisonCard
          title="This month vs last month" icon={CalendarRange}
          current={compare.month.current} previous={compare.month.previous} />
      </div>

      {/* Pie + trend */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-zinc-100">
            <PieChart className="h-[18px] w-[18px] text-accent-soft" /> Spending by category
          </h2>
          <PieBreakdown data={pie} />
        </section>
        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-zinc-100">
            <LineChart className="h-[18px] w-[18px] text-accent-soft" /> Daily trend (30 days)
          </h2>
          <TrendLine data={trend} />
        </section>
      </div>

      {/* Weekly comparison bars */}
      <section className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-zinc-100">
          <BarChart3 className="h-[18px] w-[18px] text-accent-soft" /> Weekly comparison (8 weeks)
        </h2>
        <WeeklyBars data={weekly} height={260} />
      </section>

      {/* Savings potential */}
      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-semibold text-zinc-100">
            <PiggyBank className="h-[18px] w-[18px] text-accent-soft" /> Savings Potential
          </h2>
          <span className="chip bg-good/10 text-green-300">
            Up to <Money value={potential.totalSaving} className="ml-1" /> / mo
          </span>
        </div>
        {potential.items.length === 0 ? (
          <p className="text-sm text-zinc-500">No discretionary spending detected this month — nothing obvious to trim.</p>
        ) : (
          <>
            <p className="mb-4 text-sm text-zinc-400">
              If you trimmed flexible categories this month, you could save about{' '}
              <span className="font-semibold text-green-300">{formatCHF(potential.totalSaving)}</span>{' '}
              ({formatPct(potential.pctOfSpend)} of your spend).
            </p>
            <div className="space-y-3">
              {potential.items.map((it) => (
                <div key={it.name} className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: it.color }} />
                  <span className="w-28 shrink-0 truncate text-sm text-zinc-300">{it.name}</span>
                  <div className="flex-1"><ProgressBar ratio={it.suggested / it.current} color={it.color} /></div>
                  <span className="w-32 shrink-0 text-right text-xs text-zinc-400">
                    <Money value={it.current} /> → <span className="text-zinc-200"><Money value={it.suggested} /></span>
                  </span>
                  <span className="w-20 shrink-0 text-right text-xs font-medium text-green-300">save <Money value={it.saving} /></span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Saving plans */}
      <section className="card p-5">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-zinc-100">
          <Sparkles className="h-[18px] w-[18px] text-accent-soft" /> Saving Plan Generator
        </h2>
        <p className="mb-4 text-sm text-zinc-400">Personalised caps based on your real spending pace. Updates as you add expenses.</p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PlanCard title="7-day plan" plan={plans.week} />
          <PlanCard title="30-day plan" plan={plans.month} />
        </div>
      </section>

      {/* Monthly story */}
      <MonthlyStory story={story} />
    </div>
  )
}

// ---------------------------------------------------------------------------
function ComparisonCard({ title, icon: Icon, current, previous }) {
  const delta = current - previous
  const pct = previous > 0 ? delta / previous : null
  const up = delta > 0
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="stat-label flex items-center gap-1.5"><Icon className="h-4 w-4" /> {title}</span>
        {pct !== null && (
          <span className={`chip ${up ? 'bg-bad/10 text-red-300' : 'bg-good/10 text-green-300'}`}>
            {up ? '▲' : '▼'} {formatPct(Math.abs(pct))}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end gap-3">
        <span className="text-2xl font-semibold text-zinc-50"><Money value={current} /></span>
        <span className="pb-1 text-xs text-zinc-500">vs <Money value={previous} /> before</span>
      </div>
    </div>
  )
}

function PlanCard({ title, plan }) {
  if (!plan.lines.length) {
    return (
      <div className="rounded-xl border border-ink-700 bg-ink-900/50 p-4">
        <h3 className="font-medium text-zinc-200">{title}</h3>
        <p className="mt-2 text-sm text-zinc-500">Not enough spending history yet.</p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900/50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-zinc-200">{title}</h3>
        <span className="chip bg-good/10 text-green-300">save <Money value={plan.projectedSavings} /></span>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Target spend <Money value={plan.projectedSpend} /> vs <Money value={plan.baselineSpend} /> at current pace
      </p>
      <div className="mt-3 space-y-2.5">
        {plan.lines.slice(0, 5).map((l) => {
          const Icon = iconFor(l.icon)
          return (
            <div key={l.categoryId} className="flex items-center gap-2.5 text-sm">
              <Icon className="h-4 w-4 shrink-0" style={{ color: l.color }} />
              <span className="w-24 shrink-0 truncate text-zinc-300">{l.name}</span>
              <span className="flex-1 text-right text-xs text-zinc-500">
                cap <span className="font-medium text-zinc-200"><Money value={l.cap} /></span>
              </span>
              <span className="w-24 shrink-0 text-right text-xs text-amber-300">
                −{Math.round(l.reductionPct * 100)}% (<Money value={l.saving} />)
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MonthlyStory({ story }) {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)

  async function exportPng() {
    if (!ref.current) return
    setBusy(true)
    try {
      const dataUrl = await toPng(ref.current, {
        pixelRatio: 2,
        backgroundColor: '#0f0f12',
        cacheBust: true,
      })
      const link = document.createElement('a')
      link.download = `budget-story-${new Date().toISOString().slice(0, 7)}.png`
      link.href = dataUrl
      link.click()
    } catch (e) {
      console.error('Export failed', e)
      alert('Could not export the image. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold text-zinc-100">
          <Trophy className="h-[18px] w-[18px] text-accent-soft" /> Monthly Financial Story
        </h2>
        <button onClick={exportPng} disabled={busy} className="btn-ghost">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export
        </button>
      </div>

      {/* Infographic (also the export target) */}
      <div ref={ref} className="overflow-hidden rounded-2xl border border-ink-700 bg-gradient-to-br from-ink-900 to-ink-850 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-accent-soft">Monthly Story</p>
            <h3 className="text-xl font-semibold text-zinc-50">{formatMonthLabel()}</h3>
          </div>
          <div className="text-right">
            <p className="stat-label">Net</p>
            <p className={`text-lg font-semibold ${story.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              <Money value={story.net} signed />
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StoryStat label="Total spent" value={formatCHF(story.totalSpent)} />
          <StoryStat label="Total income" value={formatCHF(story.totalIncome)} />
          <StoryStat label="Daily average" value={formatCHF(story.dailyAvg)} />
          <StoryStat label="Transactions" value={String(story.transactionCount)} />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <HighlightRow icon={TrendingDown} tint="#ef4444"
            label="Top spending day"
            value={story.topDay ? `${story.topDay.label}` : '—'}
            sub={story.topDay ? formatCHF(story.topDay.amount) : ''} />
          <HighlightRow icon={CalendarCheck} tint="#22c55e"
            label={story.bestSavingDay ? 'Biggest saving day' : 'No-spend days'}
            value={story.bestSavingDay ? story.bestSavingDay.label : `${story.noSpendDays} days`}
            sub={story.bestSavingDay ? formatCHF(story.bestSavingDay.amount) : 'No spending'} />
        </div>

        {story.topCategory && (
          <div className="mt-3 rounded-xl border border-ink-700 bg-ink-900/60 p-3">
            <p className="stat-label">Biggest category</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: story.topCategory.color }} />
              <span className="font-medium text-zinc-100">{story.topCategory.name}</span>
              <span className="ml-auto font-semibold text-zinc-200">{formatCHF(story.topCategory.value)}</span>
            </div>
          </div>
        )}

        <p className="mt-4 text-xs text-zinc-500">
          {story.savingsRate !== null
            ? `You saved ${formatPct(Math.max(0, story.savingsRate))} of your income this month.`
            : `Projected month-end spend ≈ ${formatCHF(story.projectedMonth)} at your current pace.`}
        </p>
      </div>
    </section>
  )
}

function StoryStat({ label, value }) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900/60 p-3">
      <p className="stat-label">{label}</p>
      <p className="mt-1 text-base font-semibold text-zinc-50">{value}</p>
    </div>
  )
}

function HighlightRow({ icon: Icon, tint, label, value, sub }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-900/60 p-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${tint}22`, color: tint }}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="stat-label">{label}</p>
        <p className="truncate font-medium text-zinc-100">{value} {sub && <span className="text-xs text-zinc-500">• {sub}</span>}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
function buildComparisons(expenses) {
  const weekStart = startOfWeek()
  const lastWeekStart = addDays(weekStart, -7)
  let weekCur = 0, weekPrev = 0
  for (const e of expenses) {
    const d = parseISO(e.date)
    if (isThisWeek(e.date)) weekCur += Number(e.amount)
    else if (d >= lastWeekStart && d < weekStart) weekPrev += Number(e.amount)
  }

  const now = new Date()
  const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
  const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  let monthCur = 0, monthPrev = 0
  for (const e of expenses) {
    const d = parseISO(e.date)
    if (isThisMonth(e.date)) monthCur += Number(e.amount)
    else if (d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear) monthPrev += Number(e.amount)
  }

  return {
    week: { current: weekCur, previous: weekPrev },
    month: { current: monthCur, previous: monthPrev },
  }
}
