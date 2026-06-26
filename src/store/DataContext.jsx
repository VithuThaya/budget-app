import {
  createContext, useContext, useEffect, useState, useCallback, useMemo, useRef,
} from 'react'
import { supabase, isConfigured } from '../lib/supabase'
import { DEFAULT_CATEGORIES } from '../lib/categoryMeta'

// ---------------------------------------------------------------------------
// DataContext is the SINGLE source of truth for the whole app. Every page
// reads from here via useData(), so totals on the Dashboard, Budgets and
// Reports are always derived from the same arrays — no desync, no duplicates.
// Mutations write to Supabase and update local state from the returned row
// (matched by id), and a realtime subscription keeps other devices in sync.
// ---------------------------------------------------------------------------

const DataContext = createContext(null)
export const useData = () => useContext(DataContext)

const TABLES = ['categories', 'budgets', 'incomes', 'expenses', 'fixed_costs', 'savings_goals', 'savings_contributions']

export function DataProvider({ session, children }) {
  const userId = session?.user?.id
  const [categories, setCategories] = useState([])
  const [budgets, setBudgets] = useState([])
  const [incomes, setIncomes] = useState([])
  const [expenses, setExpenses] = useState([])
  const [fixedCosts, setFixedCosts] = useState([])
  const [savingsGoals, setSavingsGoals] = useState([])
  const [savingsContributions, setSavingsContributions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const seededRef = useRef(false)

  const setters = useMemo(
    () => ({
      categories: setCategories,
      budgets: setBudgets,
      incomes: setIncomes,
      expenses: setExpenses,
      fixed_costs: setFixedCosts,
      savings_goals: setSavingsGoals,
      savings_contributions: setSavingsContributions,
    }),
    [],
  )

  // ---- Initial load -------------------------------------------------------
  const loadAll = useCallback(async () => {
    if (!isConfigured || !userId) return
    setLoading(true)
    setError(null)
    try {
      const [cats, buds, incs, exps, fixs, goals, contribs] = await Promise.all([
        supabase.from('categories').select('*').order('created_at', { ascending: true }),
        supabase.from('budgets').select('*'),
        supabase.from('incomes').select('*').order('date', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('fixed_costs').select('*').order('created_at', { ascending: true }),
        supabase.from('savings_goals').select('*').order('created_at', { ascending: true }),
        supabase.from('savings_contributions').select('*').order('date', { ascending: false }),
      ])
      for (const r of [cats, buds, incs, exps, fixs, goals, contribs]) if (r.error) throw r.error

      let categoryRows = cats.data || []
      // Seed default categories once for brand-new accounts.
      if (categoryRows.length === 0 && !seededRef.current) {
        seededRef.current = true
        const { data: seeded, error: seedErr } = await supabase
          .from('categories')
          .insert(DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: userId })))
          .select()
        if (!seedErr && seeded) categoryRows = seeded
      }

      setCategories(categoryRows)
      setBudgets(buds.data || [])
      setIncomes(incs.data || [])
      setExpenses(exps.data || [])
      setFixedCosts(fixs.data || [])
      setSavingsGoals(goals.data || [])
      setSavingsContributions(contribs.data || [])
    } catch (e) {
      setError(e.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // ---- Realtime sync across devices --------------------------------------
  useEffect(() => {
    if (!isConfigured || !userId) return
    const channel = supabase.channel(`rt-${userId}`)
    for (const table of TABLES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
        (payload) => {
          const set = setters[table]
          if (!set) return
          set((prev) => {
            if (payload.eventType === 'DELETE') return prev.filter((r) => r.id !== payload.old.id)
            const row = payload.new
            const exists = prev.some((r) => r.id === row.id)
            return exists ? prev.map((r) => (r.id === row.id ? row : r)) : [row, ...prev]
          })
        },
      )
    }
    channel.subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, setters])

  // ---- Generic CRUD helpers (optimistic, dedup by id) --------------------
  const create = useCallback(
    async (table, values) => {
      const setState = setters[table]
      const { data, error: err } = await supabase
        .from(table)
        .insert({ ...values, user_id: userId })
        .select()
        .single()
      if (err) throw err
      setState((prev) => (prev.some((r) => r.id === data.id) ? prev : [data, ...prev]))
      return data
    },
    [setters, userId],
  )

  const update = useCallback(
    async (table, id, values) => {
      const setState = setters[table]
      const { data, error: err } = await supabase
        .from(table)
        .update(values)
        .eq('id', id)
        .select()
        .single()
      if (err) throw err
      setState((prev) => prev.map((r) => (r.id === id ? data : r)))
      return data
    },
    [setters],
  )

  const remove = useCallback(
    async (table, id) => {
      const setState = setters[table]
      const { error: err } = await supabase.from(table).delete().eq('id', id)
      if (err) throw err
      setState((prev) => prev.filter((r) => r.id !== id))
    },
    [setters],
  )

  // ---- Convenience wrappers used by pages --------------------------------
  const addExpense = useCallback((v) => create('expenses', v), [create])
  const updateExpense = useCallback((id, v) => update('expenses', id, v), [update])
  const deleteExpense = useCallback((id) => remove('expenses', id), [remove])

  const addIncome = useCallback((v) => create('incomes', v), [create])
  const updateIncome = useCallback((id, v) => update('incomes', id, v), [update])
  const deleteIncome = useCallback((id) => remove('incomes', id), [remove])

  const addFixedCost = useCallback((v) => create('fixed_costs', v), [create])
  const updateFixedCost = useCallback((id, v) => update('fixed_costs', id, v), [update])
  const deleteFixedCost = useCallback((id) => remove('fixed_costs', id), [remove])

  const addSavingsGoal = useCallback((v) => create('savings_goals', v), [create])
  const updateSavingsGoal = useCallback((id, v) => update('savings_goals', id, v), [update])
  const deleteSavingsGoal = useCallback((id) => remove('savings_goals', id), [remove])

  const addContribution = useCallback((v) => create('savings_contributions', v), [create])
  const deleteContribution = useCallback((id) => remove('savings_contributions', id), [remove])

  const addCategory = useCallback((v) => create('categories', v), [create])
  const updateCategory = useCallback((id, v) => update('categories', id, v), [update])
  const deleteCategory = useCallback((id) => remove('categories', id), [remove])

  // Budgets are upserted per category (one budget row per category).
  const setBudget = useCallback(
    async (categoryId, amount) => {
      const existing = budgets.find((b) => b.category_id === categoryId)
      if (existing) return update('budgets', existing.id, { amount })
      return create('budgets', { category_id: categoryId, amount, period: 'monthly' })
    },
    [budgets, create, update],
  )
  const deleteBudget = useCallback((id) => remove('budgets', id), [remove])

  // Quick lookup map for rendering category icon/color/name on transactions.
  const categoryMap = useMemo(() => {
    const m = new Map()
    for (const c of categories) m.set(c.id, c)
    return m
  }, [categories])

  const value = {
    loading, error, isConfigured,
    categories, budgets, incomes, expenses, fixedCosts,
    savingsGoals, savingsContributions, categoryMap,
    reload: loadAll,
    addExpense, updateExpense, deleteExpense,
    addIncome, updateIncome, deleteIncome,
    addFixedCost, updateFixedCost, deleteFixedCost,
    addSavingsGoal, updateSavingsGoal, deleteSavingsGoal,
    addContribution, deleteContribution,
    addCategory, updateCategory, deleteCategory,
    setBudget, deleteBudget,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
