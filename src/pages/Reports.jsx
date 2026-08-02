import { useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import {
  PieChart, LineChart, BarChart3, PiggyBank, CalendarRange, Sparkles,
  Download, TrendingDown, TrendingUp, Landmark, Trophy, CalendarCheck, Loader2,
  ChevronLeft, ChevronRight, Wallet, Lightbulb,
} from 'lucide-react'
import { useData } from '../store/DataContext'
import { iconFor } from '../lib/categoryMeta'
import PageHeader from '../components/PageHeader'
import PieBreakdown from '../components/charts/PieBreakdown'
import TrendLine from '../components/charts/TrendLine'
import WeeklyBars from '../components/charts/WeeklyBars'
import MonthlyBars from '../components/charts/MonthlyBars'
import CategoryTrend from '../components/charts/CategoryTrend'
import SpendHeatmap from '../components/charts/SpendHeatmap'
import ProgressBar from '../components/ProgressBar'
import Money from '../components/Money'
import EmptyState from '../components/EmptyState'
import StatCard from '../components/StatCard'
import AlertBanner from '../components/AlertBanner'
import { formatCHF, formatPct } from '../lib/money'
import {
  monthlyDailyTotals, weeklyTotals, monthlyWeeklyTotals, formatMonthLabel, isSameMonth,
  startOfWeek, startOfMonth, addDays, addMonths, parseISO, toISODate, todayISO,
} from '../lib/dates'
import {
  categoryPieData, monthSpend, fixedDueThisMonth, monthlySeries, categoryMonthlySeries, yearlyDailyTotals,
} from '../logic/selectors'
import { monthSavings } from '../logic/savings'
import { savingsPotential } from '../logic/savingsPotential'
import { savingPlans } from '../logic/savingsPlan'
import { monthlyStory } from '../logic/monthlyStory'
import { generateInsights } from '../logic/insights'

const TABS = [
  { id: 'month', label: 'Monat' },
  { id: 'year', label: 'Jahr' },
  { id: 'advisor', label: 'Berater' },
]

export default function Reports() {
  const { expenses, incomes, fixedCosts, savingsContributions, budgets, categoryMap } = useData()
  const [tab, setTab] = useState('month')
  const [cursor, setCursor] = useState(() => startOfMonth())
  const [year, setYear] = useState(() => new Date().getFullYear())
  const isCurrent = isSameMonth(todayISO(), cursor)
  const isCurrentYear = year === new Date().getFullYear()

  if (expenses.length === 0) {
    return (
      <div>
        <PageHeader title="Berichte" subtitle="Einblicke, Trends und Sparpläne." />
        <EmptyState icon={BarChart3} title="Noch keine Daten"
          message="Füge ein paar Ausgaben hinzu, dann erscheinen hier Diagramme, Sparpotenzial und deine Monats-Story."
          actionTo="/expenses/add" actionLabel="Ausgabe hinzufügen" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Berichte" subtitle="Einblicke, Trends und Sparpläne.">
        <TabSwitcher tab={tab} setTab={setTab} />
      </PageHeader>

      {tab === 'month' && (
        <MonthTab
          cursor={cursor} setCursor={setCursor} isCurrent={isCurrent}
          expenses={expenses} incomes={incomes} fixedCosts={fixedCosts}
          savingsContributions={savingsContributions} categoryMap={categoryMap}
        />
      )}
      {tab === 'year' && (
        <YearTab
          year={year} setYear={setYear} isCurrentYear={isCurrentYear}
          expenses={expenses} incomes={incomes} fixedCosts={fixedCosts}
          savingsContributions={savingsContributions} categoryMap={categoryMap}
        />
      )}
      {tab === 'advisor' && (
        <AdvisorTab expenses={expenses} incomes={incomes} fixedCosts={fixedCosts} budgets={budgets} categoryMap={categoryMap} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
function TabSwitcher({ tab, setTab }) {
  const idx = TABS.findIndex((t) => t.id === tab)
  return (
    <div className="relative flex items-center gap-1 rounded-xl border border-white/10 bg-ink-900/60 p-1 backdrop-blur-md">
      <div
        className="absolute inset-y-1 rounded-lg bg-gradient-to-r from-accent to-accent-soft shadow-glow transition-transform duration-300 ease-out"
        style={{ width: `calc(${100 / TABS.length}% - 0.166rem)`, transform: `translateX(calc(${idx * 100}% + ${idx * 0.166}rem))` }}
      />
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          className={`relative z-10 cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
            tab === t.id ? 'text-white' : 'text-zinc-400 hover:text-zinc-100'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Monat
// ---------------------------------------------------------------------------
function MonthTab({ cursor, setCursor, isCurrent, expenses, incomes, fixedCosts, savingsContributions, categoryMap }) {
  const monthLabel = formatMonthLabel(cursor)

  const pie = useMemo(() => categoryPieData(expenses, categoryMap, { monthOnly: true, ref: cursor }), [expenses, categoryMap, cursor])
  const trend = useMemo(() => monthlyDailyTotals(expenses, cursor), [expenses, cursor])
  const weekly = useMemo(
    () => (isCurrent ? weeklyTotals(expenses, 8) : monthlyWeeklyTotals(expenses, cursor)),
    [expenses, cursor, isCurrent],
  )
  const compare = useMemo(() => buildComparisons(expenses, cursor, isCurrent), [expenses, cursor, isCurrent])
  const fixedDueMonth = useMemo(() => fixedDueThisMonth(fixedCosts, toISODate(cursor)), [fixedCosts, cursor])
  const variableSpend = useMemo(() => monthSpend(expenses, cursor), [expenses, cursor])
  const savedMonth = useMemo(() => monthSavings(savingsContributions, cursor), [savingsContributions, cursor])
  const potential = useMemo(() => savingsPotential({ expenses, categoryMap, ref: cursor }), [expenses, categoryMap, cursor])
  const plans = useMemo(() => savingPlans({ expenses, categoryMap, ref: cursor }), [expenses, categoryMap, cursor])
  const story = useMemo(() => monthlyStory({ expenses, incomes, categoryMap, ref: cursor }), [expenses, incomes, categoryMap, cursor])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">Einblicke für {monthLabel}</p>
        <MonthSwitcher cursor={cursor} setCursor={setCursor} isCurrent={isCurrent} />
      </div>

      {/* Wohin floss dein Geld */}
      <section className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-silver">
          <Wallet className="h-[18px] w-[18px] text-accent-soft" /> Wohin floss dein Geld
        </h2>
        <AllocationBar fixed={fixedDueMonth} variable={variableSpend} saved={savedMonth} />
      </section>

      {/* Comparison summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ComparisonCard
          title={isCurrent ? 'Diese Woche vs. Vorwoche' : 'Letzte Woche im Monat vs. Vorwoche'}
          icon={CalendarRange}
          current={compare.week.current} previous={compare.week.previous} />
        <ComparisonCard
          title={isCurrent ? 'Dieser Monat vs. Vormonat' : `${monthLabel} vs. Vormonat`}
          icon={CalendarRange}
          current={compare.month.current} previous={compare.month.previous} />
      </div>

      {/* Pie + trend */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-silver">
            <PieChart className="h-[18px] w-[18px] text-accent-soft" /> Ausgaben nach Kategorie
          </h2>
          <PieBreakdown data={pie} />
        </section>
        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-silver">
            <LineChart className="h-[18px] w-[18px] text-accent-soft" /> Täglicher Verlauf — {monthLabel}
          </h2>
          <TrendLine data={trend} />
        </section>
      </div>

      {/* Weekly bars — trailing 8 weeks live, or the selected past month's own weeks */}
      <section className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-silver">
          <BarChart3 className="h-[18px] w-[18px] text-accent-soft" />
          {isCurrent ? 'Wochenvergleich (8 Wochen)' : `Wochenverlauf — ${monthLabel}`}
        </h2>
        <WeeklyBars data={weekly} height={260} />
      </section>

      {/* Savings potential */}
      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-semibold text-silver">
            <PiggyBank className="h-[18px] w-[18px] text-accent-soft" /> Sparpotenzial
          </h2>
          <span className="chip bg-good/15 text-good">
            Bis zu <Money value={potential.totalSaving} className="ml-1" /> / Mt.
          </span>
        </div>
        {potential.items.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Keine flexiblen Ausgaben {isCurrent ? 'diesen Monat' : `im ${monthLabel}`} erkannt — nichts Offensichtliches zum Kürzen.
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-zinc-400">
              Wenn du flexible Kategorien {isCurrent ? 'diesen Monat' : `im ${monthLabel}`} kürzt, könntest du etwa{' '}
              <span className="font-semibold text-good">{formatCHF(potential.totalSaving)}</span>{' '}
              sparen ({formatPct(potential.pctOfSpend)} deiner Ausgaben).
            </p>
            <div className="space-y-4">
              {potential.items.map((it) => (
                <div key={it.name}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: it.color }} />
                      <span className="truncate text-sm text-zinc-300">{it.name}</span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-good">spare <Money value={it.saving} /></span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <div className="flex-1"><ProgressBar ratio={it.suggested / it.current} color={it.color} /></div>
                    <span className="shrink-0 text-xs tabular-nums text-zinc-400">
                      <Money value={it.current} /> → <span className="text-zinc-200"><Money value={it.suggested} /></span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Saving plans */}
      <section className="card p-5">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-silver">
          <Sparkles className="h-[18px] w-[18px] text-accent-soft" /> Sparplan-Generator
        </h2>
        <p className="mb-4 text-sm text-zinc-400">
          Persönliche Limits auf Basis deines echten Ausgabentempos.{' '}
          {isCurrent ? 'Aktualisiert sich mit jeder Ausgabe.' : `Basierend auf dem Tempo im ${monthLabel}.`}
        </p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PlanCard title="7-Tage-Plan" plan={plans.week} />
          <PlanCard title="30-Tage-Plan" plan={plans.month} />
        </div>
      </section>

      {/* Monthly story */}
      <MonthlyStory story={story} cursor={cursor} />
    </div>
  )
}

function MonthSwitcher({ cursor, setCursor, isCurrent }) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-ink-900/60 p-1 backdrop-blur-md">
      <button
        onClick={() => setCursor((c) => addMonths(c, -1))}
        aria-label="Vorheriger Monat"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-300 hover:bg-ink-800/60 hover:text-silver cursor-pointer"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-[7.5rem] px-2 text-center text-sm font-medium text-silver">
        {formatMonthLabel(cursor)}
      </span>
      <button
        onClick={() => setCursor((c) => addMonths(c, 1))}
        disabled={isCurrent}
        aria-label="Nächster Monat"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-300 hover:bg-ink-800/60 hover:text-silver disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

// Fix/Variabel/Gespart split for "Wohin floss dein Geld" — same three buckets
// the Dashboard's available-to-spend chain uses, so the numbers never drift.
function AllocationBar({ fixed, variable, saved }) {
  const total = fixed + variable + saved
  if (total <= 0) {
    return <p className="text-sm text-zinc-500">Noch keine Bewegungen in diesem Monat.</p>
  }
  const segments = [
    { key: 'fixed', label: 'Fixkosten', value: fixed, color: '#F5B942' },
    { key: 'variable', label: 'Variabel', value: variable, color: '#9D50BB' },
    { key: 'saved', label: 'Gespart', value: saved, color: '#34D399' },
  ]
  return (
    <div>
      <div className="flex h-3 w-full gap-1">
        {segments.map((s) => s.value > 0 && (
          <div
            key={s.key}
            className="rounded-full"
            style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color, boxShadow: `0 0 8px -1px ${s.color}99` }}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {segments.map((s) => (
          <div key={s.key}>
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} /> {s.label}
            </span>
            <p className="mt-0.5 truncate font-semibold text-silver"><Money value={s.value} /></p>
            <p className="text-xs text-zinc-500">{formatPct(s.value / total)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Jahr
// ---------------------------------------------------------------------------
function YearTab({ year, setYear, isCurrentYear, expenses, incomes, fixedCosts, savingsContributions, categoryMap }) {
  const series = useMemo(
    () => monthlySeries({ incomes, expenses, fixedCosts, contributions: savingsContributions, year }),
    [incomes, expenses, fixedCosts, savingsContributions, year],
  )
  const { data: catData, series: catSeries } = useMemo(
    () => categoryMonthlySeries({ expenses, categoryMap, year, topN: 5 }),
    [expenses, categoryMap, year],
  )
  const dailyTotals = useMemo(() => yearlyDailyTotals(expenses, year), [expenses, year])

  const totalIncome = series.reduce((a, r) => a + r.income, 0)
  const totalExpense = series.reduce((a, r) => a + r.expense, 0)
  const totalFixed = series.reduce((a, r) => a + r.fixed, 0)
  const totalSaved = series.reduce((a, r) => a + r.saved, 0)
  const savingsRate = totalIncome > 0 ? totalSaved / totalIncome : null

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">Einblicke für {year}</p>
        <YearSwitcher year={year} setYear={setYear} isCurrentYear={isCurrentYear} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Einnahmen" value={totalIncome} icon={TrendingUp} accent="#34D399" />
        <StatCard label="Ausgaben" value={totalExpense} icon={TrendingDown} accent="#FF6B7A" />
        <StatCard label="Fixkosten" value={totalFixed} icon={Landmark} accent="#F5B942" />
        <RatioCard label="Sparquote" ratio={savingsRate} icon={PiggyBank} accent="#34D399" />
      </div>

      <section className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-silver">
          <BarChart3 className="h-[18px] w-[18px] text-accent-soft" /> Einnahmen vs. Ausgaben
        </h2>
        <MonthlyBars data={series} />
      </section>

      <section className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-silver">
          <LineChart className="h-[18px] w-[18px] text-accent-soft" /> Kategorien im Jahresverlauf
        </h2>
        <CategoryTrend data={catData} series={catSeries} />
      </section>

      <section className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-silver">
          <CalendarRange className="h-[18px] w-[18px] text-accent-soft" /> Ausgabentage {year}
        </h2>
        <SpendHeatmap year={year} dailyTotals={dailyTotals} />
      </section>
    </div>
  )
}

function YearSwitcher({ year, setYear, isCurrentYear }) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-ink-900/60 p-1 backdrop-blur-md">
      <button
        onClick={() => setYear((y) => y - 1)}
        aria-label="Vorheriges Jahr"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-300 hover:bg-ink-800/60 hover:text-silver cursor-pointer"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-[4rem] px-2 text-center text-sm font-medium text-silver">{year}</span>
      <button
        onClick={() => setYear((y) => y + 1)}
        disabled={isCurrentYear}
        aria-label="Nächstes Jahr"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-300 hover:bg-ink-800/60 hover:text-silver disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

// Same visual language as StatCard, but for a percentage instead of a CHF value.
function RatioCard({ label, ratio, icon: Icon, accent = '#9D50BB' }) {
  return (
    <div className="card card-float p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="stat-label">{label}</span>
        {Icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}22`, color: accent }}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
      <div className="mt-2.5 truncate text-xl font-semibold tracking-tight text-silver sm:text-2xl">
        {ratio != null ? formatPct(ratio) : '—'}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Berater
// ---------------------------------------------------------------------------
function AdvisorTab({ expenses, incomes, fixedCosts, budgets, categoryMap }) {
  const insights = useMemo(
    () => generateInsights({ expenses, incomes, fixedCosts, categoryMap, budgets }),
    [expenses, incomes, fixedCosts, categoryMap, budgets],
  )
  return (
    <section className="card p-5">
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-silver">
        <Lightbulb className="h-[18px] w-[18px] text-accent-soft" /> Dein Berater
      </h2>
      <div className="space-y-3">
        {insights.map((i) => <AlertBanner key={i.id} level={i.level} title={i.title} detail={i.detail} />)}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Shared subcomponents (Monat tab)
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
          <span className={`chip ${up ? 'bg-bad/15 text-bad' : 'bg-good/15 text-good'}`}>
            {up ? '▲' : '▼'} {formatPct(Math.abs(pct))}
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
        <span className="text-2xl font-semibold text-silver"><Money value={current} /></span>
        <span className="pb-1 text-xs text-zinc-500">vs. <Money value={previous} /> zuvor</span>
      </div>
    </div>
  )
}

function PlanCard({ title, plan }) {
  if (!plan.lines.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-ink-900/40 p-4 backdrop-blur-md">
        <h3 className="font-medium text-zinc-200">{title}</h3>
        <p className="mt-2 text-sm text-zinc-500">Noch nicht genug Ausgaben-Historie.</p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-white/10 bg-ink-900/40 p-4 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-zinc-200">{title}</h3>
        <span className="chip bg-good/15 text-good">spare <Money value={plan.projectedSavings} /></span>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Zielausgabe <Money value={plan.projectedSpend} /> statt <Money value={plan.baselineSpend} /> beim aktuellen Tempo
      </p>
      <div className="mt-3 space-y-2.5">
        {plan.lines.slice(0, 5).map((l) => {
          const Icon = iconFor(l.icon)
          return (
            <div key={l.categoryId} className="flex items-center gap-2.5 text-sm">
              <Icon className="h-4 w-4 shrink-0" style={{ color: l.color }} />
              <span className="min-w-0 flex-1 truncate text-zinc-300">{l.name}</span>
              <span className="shrink-0 text-right text-xs leading-tight">
                <span className="block tabular-nums text-zinc-400">
                  Limit <span className="font-medium text-zinc-200"><Money value={l.cap} /></span>
                </span>
                <span className="block text-warn">
                  −{Math.round(l.reductionPct * 100)}% (<Money value={l.saving} />)
                </span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MonthlyStory({ story, cursor }) {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)

  async function exportPng() {
    if (!ref.current) return
    setBusy(true)
    try {
      const dataUrl = await toPng(ref.current, {
        pixelRatio: 2,
        backgroundColor: '#0F1020',
        cacheBust: true,
      })
      const link = document.createElement('a')
      link.download = `budget-story-${toISODate(cursor).slice(0, 7)}.png`
      link.href = dataUrl
      link.click()
    } catch (e) {
      console.error('Export failed', e)
      alert('Bild konnte nicht exportiert werden. Bitte versuche es erneut.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold text-silver">
          <Trophy className="h-[18px] w-[18px] text-accent-soft" /> Monatliche Finanz-Story
        </h2>
        <button onClick={exportPng} disabled={busy} className="btn-ghost">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Exportieren
        </button>
      </div>

      {/* Infographic (also the export target — no backdrop-blur here, html-to-image
          can't render it and the PNG export would break silently) */}
      <div ref={ref} className="card-solid overflow-hidden bg-aurora p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-accent-soft">Monats-Story</p>
            <h3 className="text-xl font-semibold text-silver">{formatMonthLabel(cursor)}</h3>
          </div>
          <div className="text-right">
            <p className="stat-label">Netto</p>
            <p className={`text-lg font-semibold ${story.net >= 0 ? 'text-good' : 'text-bad'}`}>
              <Money value={story.net} signed />
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StoryStat label="Ausgegeben gesamt" value={formatCHF(story.totalSpent)} />
          <StoryStat label="Einnahmen gesamt" value={formatCHF(story.totalIncome)} />
          <StoryStat label="Tagesschnitt" value={formatCHF(story.dailyAvg)} />
          <StoryStat label="Buchungen" value={String(story.transactionCount)} />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <HighlightRow icon={TrendingDown} tint="#FF6B7A"
            label="Teuerster Tag"
            value={story.topDay ? `${story.topDay.label}` : '—'}
            sub={story.topDay ? formatCHF(story.topDay.amount) : ''} />
          <HighlightRow icon={CalendarCheck} tint="#34D399"
            label={story.bestSavingDay ? 'Bester Spartag' : 'Ausgabenfreie Tage'}
            value={story.bestSavingDay ? story.bestSavingDay.label : `${story.noSpendDays} Tage`}
            sub={story.bestSavingDay ? formatCHF(story.bestSavingDay.amount) : 'Keine Ausgaben'} />
        </div>

        {story.topCategory && (
          <div className="mt-3 rounded-xl border border-white/10 bg-ink-900/50 p-3">
            <p className="stat-label">Größte Kategorie</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: story.topCategory.color }} />
              <span className="font-medium text-silver">{story.topCategory.name}</span>
              <span className="ml-auto font-semibold text-zinc-200">{formatCHF(story.topCategory.value)}</span>
            </div>
          </div>
        )}

        <p className="mt-4 text-xs text-zinc-500">
          {story.savingsRate !== null
            ? `Du hast diesen Monat ${formatPct(Math.max(0, story.savingsRate))} deines Einkommens gespart.`
            : `Voraussichtliche Ausgaben zum Monatsende ≈ ${formatCHF(story.projectedMonth)} beim aktuellen Tempo.`}
        </p>
      </div>
    </section>
  )
}

function StoryStat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-ink-900/50 p-3">
      <p className="stat-label">{label}</p>
      <p className="mt-1 text-base font-semibold text-silver">{value}</p>
    </div>
  )
}

function HighlightRow({ icon: Icon, tint, label, value, sub }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-ink-900/50 p-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${tint}22`, color: tint }}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="stat-label">{label}</p>
        <p className="truncate font-medium text-silver">{value}</p>
        {sub && <p className="truncate text-xs text-zinc-500">{sub}</p>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
function buildComparisons(expenses, ref = new Date(), isCurrent = true) {
  const refDate = ref instanceof Date ? ref : parseISO(ref)

  // Week comparison: today's week if current, else the selected month's last week.
  const weekAnchor = isCurrent ? new Date() : new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0)
  const weekStart = startOfWeek(weekAnchor)
  const weekEnd = addDays(weekStart, 7)
  const lastWeekStart = addDays(weekStart, -7)
  let weekCur = 0, weekPrev = 0
  for (const e of expenses) {
    const d = parseISO(e.date)
    if (d >= weekStart && d < weekEnd) weekCur += Number(e.amount)
    else if (d >= lastWeekStart && d < weekStart) weekPrev += Number(e.amount)
  }

  // Month comparison: selected month vs the month before it.
  const prevMonth = addMonths(refDate, -1)
  let monthCur = 0, monthPrev = 0
  for (const e of expenses) {
    if (isSameMonth(e.date, refDate)) monthCur += Number(e.amount)
    else if (isSameMonth(e.date, prevMonth)) monthPrev += Number(e.amount)
  }

  return {
    week: { current: weekCur, previous: weekPrev },
    month: { current: monthCur, previous: monthPrev },
  }
}
