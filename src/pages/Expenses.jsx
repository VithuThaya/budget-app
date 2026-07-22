import { useMemo, useState } from 'react'
import { Plus, Search, ReceiptText } from 'lucide-react'
import { useData } from '../store/DataContext'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import TransactionCard from '../components/TransactionCard'
import EmptyState from '../components/EmptyState'
import Money from '../components/Money'
import { formatDate } from '../lib/dates'
import { sumBy } from '../lib/money'

const SORTS = {
  'date-desc': (a, b) => String(b.date).localeCompare(String(a.date)),
  'date-asc': (a, b) => String(a.date).localeCompare(String(b.date)),
  'amount-desc': (a, b) => b.amount - a.amount,
  'amount-asc': (a, b) => a.amount - b.amount,
}

export default function Expenses() {
  const { expenses, categories, categoryMap, deleteExpense } = useData()
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [sort, setSort] = useState('date-desc')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return expenses
      .filter((e) => (catFilter === 'all' ? true : e.category_id === catFilter))
      .filter((e) => {
        if (!q) return true
        const cat = categoryMap.get(e.category_id)
        return (
          (e.notes || '').toLowerCase().includes(q) ||
          (cat?.name || '').toLowerCase().includes(q)
        )
      })
      .sort(SORTS[sort])
  }, [expenses, query, catFilter, sort, categoryMap])

  // Group by day for the date-sorted views.
  const groups = useMemo(() => {
    if (!sort.startsWith('date')) return [{ key: 'all', label: null, items: filtered }]
    const map = new Map()
    for (const e of filtered) {
      const key = String(e.date).slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(e)
    }
    return [...map.entries()].map(([key, items]) => ({ key, label: formatDate(key), items }))
  }, [filtered, sort])

  async function handleDelete(id) {
    if (!window.confirm('Diese Ausgabe löschen?')) return
    await deleteExpense(id)
  }

  return (
    <div>
      <PageHeader title="Ausgaben" subtitle={`${filtered.length} von ${expenses.length} Buchungen`}>
        <Link to="/expenses/add" className="btn-primary"><Plus className="h-4 w-4" /> Ausgabe hinzufügen</Link>
      </PageHeader>

      {/* Filters */}
      <div className="card mb-5 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input className="input pl-9" placeholder="Notiz oder Kategorie suchen…"
            value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="input sm:w-44" value={catFilter} onChange={(e) => setCatFilter(e.target.value)} aria-label="Nach Kategorie filtern">
          <option value="all">Alle Kategorien</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input sm:w-44" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sortieren">
          <option value="date-desc">Neueste zuerst</option>
          <option value="date-asc">Älteste zuerst</option>
          <option value="amount-desc">Höchster Betrag</option>
          <option value="amount-asc">Niedrigster Betrag</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={expenses.length ? 'Keine passenden Ausgaben' : 'Noch keine Ausgaben'}
          message={expenses.length ? 'Passe Suche oder Filter an.' : 'Füge deine erste Ausgabe hinzu, um zu starten.'}
          actionTo={expenses.length ? undefined : '/expenses/add'}
          actionLabel={expenses.length ? undefined : 'Ausgabe hinzufügen'}
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.key}>
              {group.label && (
                <div className="mb-2 flex items-center justify-between px-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{group.label}</h3>
                  <span className="text-xs text-zinc-500"><Money value={sumBy(group.items)} /></span>
                </div>
              )}
              <div className="space-y-2">
                {group.items.map((e) => (
                  <TransactionCard
                    key={e.id}
                    title={e.notes}
                    amount={e.amount}
                    date={e.date}
                    category={categoryMap.get(e.category_id)}
                    editTo={`/expenses/${e.id}/edit`}
                    onDelete={() => handleDelete(e.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
