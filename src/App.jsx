import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase, isConfigured } from './lib/supabase'
import { DataProvider } from './store/DataContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import SetupNotice from './pages/SetupNotice'
import Dashboard from './pages/Dashboard'
import Incomes from './pages/Incomes'
import FixedCosts from './pages/FixedCosts'
import Savings from './pages/Savings'
import Expenses from './pages/Expenses'
import AddExpense from './pages/AddExpense'
import Categories from './pages/Categories'
import Budgets from './pages/Budgets'
import Reports from './pages/Reports'

export default function App() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!isConfigured) {
      setChecking(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!isConfigured) return <SetupNotice />

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center text-zinc-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-700 border-t-accent" />
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <DataProvider session={session}>
      <Routes>
        <Route element={<Layout session={session} />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="expenses/add" element={<AddExpense />} />
          <Route path="expenses/:id/edit" element={<AddExpense />} />
          <Route path="incomes" element={<Incomes />} />
          <Route path="fixed-costs" element={<FixedCosts />} />
          <Route path="savings" element={<Savings />} />
          <Route path="categories" element={<Categories />} />
          <Route path="budgets" element={<Budgets />} />
          <Route path="reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </DataProvider>
  )
}
