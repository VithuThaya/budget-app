import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ReceiptText, Plus, TrendingUp, Tags, Target,
  BarChart3, Wallet, LogOut, Menu, X, CalendarClock, PiggyBank,
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
  const [open, setOpen] = useState(false)
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

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink-800 bg-ink-900/80 px-4 py-3 backdrop-blur lg:hidden">
        <Brand compact />
        <button
          aria-label="Menü öffnen"
          onClick={() => setOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-ink-700 bg-ink-800 text-zinc-200 cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-ink-800 bg-ink-900 p-4">
            <div className="flex items-center justify-between">
              <Brand />
              <button
                aria-label="Menü schließen"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-ink-700 bg-ink-800 text-zinc-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 flex-1">
              <NavItems onNavigate={() => setOpen(false)} />
            </div>
            <UserFooter email={email} onSignOut={signOut} />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="min-w-0 px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
        <div className="mx-auto w-full max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Floating add button (always reachable) */}
      <button
        onClick={() => navigate('/expenses/add')}
        className="fixed bottom-6 right-5 z-40 flex h-14 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-white shadow-glow transition-colors duration-200 hover:bg-accent-soft cursor-pointer sm:right-8"
      >
        <Plus className="h-5 w-5" />
        <span className="hidden sm:inline">Ausgabe</span>
      </button>
    </div>
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
