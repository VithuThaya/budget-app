import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ReceiptText, Plus, TrendingUp, Tags, Target,
  BarChart3, Wallet, LogOut, X, CalendarClock, PiggyBank,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import AuroraOrbs from './AuroraOrbs'

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
                ? 'bg-accent/15 text-white shadow-glow ring-1 ring-inset ring-accent/30'
                : 'text-zinc-400 hover:bg-ink-800/70 hover:text-zinc-100'
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
      <AuroraOrbs />

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-white/5 bg-ink-900/50 p-4 backdrop-blur-xl lg:flex">
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
      {/* Backdrop — blurs the page content behind the bubble menu */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink-950/60 backdrop-blur-md"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Bubble menu — glass circles fanning up from the center button */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-32 z-50 grid grid-cols-2 justify-items-center gap-x-8 gap-y-5 px-8"
        aria-hidden={!open}
      >
        {fluidItems.map((item, i) => {
          const Icon = item.icon
          // No pointer-events here: the bubbles stay mounted while closed (so
          // they can animate) and would otherwise keep catching taps through
          // their opacity-0 state. Enabled per item in `anim` only while open.
          const bubble = item.accent
            ? 'bg-gradient-to-br from-accent to-accent-ring shadow-glow-lg text-white'
            : 'bg-white/10 shadow-card text-silver'
          const anim = open
            ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-6 scale-75 opacity-0'
          const style = { transitionDelay: `${open ? i * 45 : 0}ms` }
          const content = (
            <div className="flex flex-col items-center gap-2">
              <span
                className={`flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border border-white/15 backdrop-blur-xl transition-transform duration-300 active:scale-95 ${bubble}`}
              >
                <Icon className="h-7 w-7" />
              </span>
              <span className="text-xs font-medium text-silver">{item.label}</span>
            </div>
          )
          const cls = `transition-all duration-300 ease-out will-change-transform ${anim}`
          return item.to ? (
            <NavLink key={item.key} to={item.to} onClick={close} className={cls} style={style} tabIndex={open ? 0 : -1}>
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
        <div className="flex items-end gap-1 rounded-[1.7rem] border border-white/10 bg-ink-900/75 px-2 py-1.5 shadow-card backdrop-blur-2xl">
          <DockTab tab={DOCK_TABS[0]} />
          <DockTab tab={DOCK_TABS[1]} />

          {/* Fluid center button */}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Menü schließen' : 'Menü öffnen'}
            aria-expanded={open}
            className="relative -mt-7 mx-0.5 flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.4rem] bg-gradient-to-b from-accent-soft to-accent-ring text-white shadow-[0_0_28px_2px_rgba(157,80,187,0.55),0_10px_22px_-6px_rgba(157,80,187,0.65)] ring-4 ring-ink-900 transition-transform duration-200 active:scale-95"
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
            <span className="absolute top-0 h-1 w-7 rounded-full bg-accent shadow-glow" />
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
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent shadow-glow">
        <Wallet className="h-5 w-5" />
      </div>
      {!compact && <span className="text-lg font-semibold tracking-tight text-silver">Budget</span>}
      {compact && <span className="text-base font-semibold tracking-tight text-silver">Budget</span>}
    </div>
  )
}

function UserFooter({ email, onSignOut }) {
  return (
    <div className="mt-4 border-t border-white/5 pt-4">
      <div className="mb-2 truncate px-1 text-xs text-zinc-500" title={email}>{email}</div>
      <button onClick={onSignOut} className="btn-ghost w-full justify-start">
        <LogOut className="h-4 w-4" />
        Abmelden
      </button>
    </div>
  )
}
