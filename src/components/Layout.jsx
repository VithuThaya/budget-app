import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ReceiptText, Plus, TrendingUp, Tags, Target,
  BarChart3, Wallet, LogOut, X, CalendarClock, PiggyBank,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

const NAV = [
  { to: '/', label: 'Übersicht', icon: LayoutDashboard, end: true },
  { to: '/expenses', label: 'Ausgaben', icon: ReceiptText },
  { to: '/incomes', label: 'Einnahmen', icon: TrendingUp },
  { to: '/fixed-costs', label: 'Fixkosten', icon: CalendarClock },
  { to: '/savings', label: 'Sparen', icon: PiggyBank },
  { to: '/budgets', label: 'Budgets', icon: Target },
  { to: '/categories', label: 'Kategorien', icon: Tags },
  { to: '/reports', label: 'Berichte', icon: BarChart3 },
]

// Mobile bottom dock: 4 primary tabs, rest live in the fluid center menu.
const DOCK_TABS = [NAV[0], NAV[1], NAV[5], NAV[7]] // Übersicht, Ausgaben, Budgets, Berichte
const FLUID_NAV = [NAV[2], NAV[3], NAV[4], NAV[6]] // Einnahmen, Fixkosten, Sparen, Kategorien

function NavItems({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 cursor-pointer ${
              isActive
                ? 'bg-accent/15 text-white ring-1 ring-inset ring-accent/30'
                : 'text-zinc-400 hover:bg-ink-800 hover:text-zinc-100'
            }`
          }
        >
          <Icon className="h-[18px] w-[18px] shrink-0" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export default function Layout({ session }) {
  const navigate = useNavigate()
  const email = session?.user?.email

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-ink-800 bg-ink-900/60 p-4 backdrop-blur lg:flex">
        <Brand />
        <div className="mt-6 flex-1">
          <NavItems />
        </div>
        <UserFooter email={email} onSignOut={signOut} />
      </aside>

      {/* Main content */}
      <main className="min-w-0 px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
        <div className="mx-auto w-full max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Mobile dock */}
      <MobileDock onNavigate={navigate} onSignOut={signOut} />
    </div>
  )
}

function MobileDock({ onNavigate, onSignOut }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  // Actions + overflow pages revealed by the fluid center button (bottom → top).
  const fluidItems = [
    { key: 'add', label: 'Neue Ausgabe', icon: Plus, accent: true, action: () => onNavigate('/expenses/add') },
    ...FLUID_NAV.map((n) => ({ key: n.to, label: n.label, icon: n.icon, to: n.to })),
    { key: 'signout', label: 'Abmelden', icon: LogOut, danger: true, action: onSignOut },
  ]

  return (
    <div className="lg:hidden">
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Fluid menu — expands upward from the center button */}
      <div className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex flex-col-reverse items-center gap-2.5 px-4">
        {fluidItems.map((item, i) => {
          const Icon = item.icon
          const base =
            'pointer-events-auto flex items-center gap-3 rounded-full border py-2.5 pl-2.5 pr-4 shadow-card backdrop-blur-xl transition-all duration-300 will-change-transform'
          const tone = item.accent
            ? 'border-accent/40 bg-accent text-white'
            : item.danger
              ? 'border-ink-700 bg-ink-800/90 text-zinc-300'
              : 'border-ink-700 bg-ink-800/90 text-zinc-100'
          const anim = open
            ? 'translate-y-0 opacity-100 scale-100'
            : 'translate-y-4 opacity-0 scale-95'
          const iconWrap = item.accent
            ? 'bg-white/20 text-white'
            : item.danger
              ? 'bg-ink-700 text-bad'
              : 'bg-ink-700 text-accent'
          const content = (
            <>
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${iconWrap}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium">{item.label}</span>
            </>
          )
          const cls = `${base} ${tone} ${anim}`
          const style = { transitionDelay: `${open ? i * 40 : 0}ms` }
          return item.to ? (
            <NavLink key={item.key} to={item.to} onClick={close} className={cls} style={style}>
              {content}
            </NavLink>
          ) : (
            <button
              key={item.key}
              onClick={() => { item.action(); close() }}
              className={cls}
              style={style}
              tabIndex={open ? 0 : -1}
            >
              {content}
            </button>
          )
        })}
      </div>

      {/* Dock bar */}
      <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
        <div className="flex items-end gap-1 rounded-[1.7rem] border border-ink-700/80 bg-ink-900/85 px-2 py-1.5 shadow-card backdrop-blur-xl">
          <DockTab tab={DOCK_TABS[0]} />
          <DockTab tab={DOCK_TABS[1]} />

          {/* Fluid center button */}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Menü schließen' : 'Menü öffnen'}
            aria-expanded={open}
            className="relative -mt-7 mx-0.5 flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.4rem] bg-gradient-to-b from-accent-soft to-accent-ring text-white shadow-[0_0_28px_2px_rgba(37,99,235,0.55),0_10px_22px_-6px_rgba(37,99,235,0.65)] ring-4 ring-ink-900 transition-transform duration-200 active:scale-95"
          >
            <Plus
              className={`absolute h-7 w-7 transition-all duration-300 ${open ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}
            />
            <X
              className={`absolute h-7 w-7 transition-all duration-300 ${open ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`}
            />
          </button>

          <DockTab tab={DOCK_TABS[2]} />
          <DockTab tab={DOCK_TABS[3]} />
        </div>
      </div>
    </div>
  )
}

function DockTab({ tab }) {
  const { to, label, icon: Icon, end } = tab
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative flex w-[68px] flex-col items-center gap-1 rounded-2xl px-1 py-1.5 transition-colors duration-200 ${
          isActive ? 'text-accent' : 'text-zinc-400'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute top-0 h-1 w-7 rounded-full bg-accent" />
          )}
          <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.4 : 2} />
          <span className="text-[10px] font-medium leading-none">{label}</span>
        </>
      )}
    </NavLink>
  )
}

function Brand({ compact }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
        <Wallet className="h-5 w-5" />
      </div>
      {!compact && <span className="text-lg font-semibold tracking-tight text-zinc-50">Budget</span>}
      {compact && <span className="text-base font-semibold tracking-tight text-zinc-50">Budget</span>}
    </div>
  )
}

function UserFooter({ email, onSignOut }) {
  return (
    <div className="mt-4 border-t border-ink-800 pt-4">
      <div className="mb-2 truncate px-1 text-xs text-zinc-500" title={email}>{email}</div>
      <button onClick={onSignOut} className="btn-ghost w-full justify-start">
        <LogOut className="h-4 w-4" />
        Abmelden
      </button>
    </div>
  )
}
