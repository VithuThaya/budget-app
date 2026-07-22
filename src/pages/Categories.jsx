import { useState } from 'react'
import { Plus, Check, X, Pencil, Trash2, Loader2 } from 'lucide-react'
import { useData } from '../store/DataContext'
import { ICON_NAMES, COLORS, iconFor } from '../lib/categoryMeta'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { Tags } from 'lucide-react'

const blank = { name: '', icon: 'Tag', color: '#2563eb' }

export default function Categories() {
  const { categories, expenses, budgets, addCategory, updateCategory, deleteCategory } = useData()
  const [editing, setEditing] = useState(null) // id | 'new' | null
  const [draft, setDraft] = useState(blank)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  function startNew() {
    setDraft(blank)
    setEditing('new')
    setError(null)
  }
  function startEdit(cat) {
    setDraft({ name: cat.name, icon: cat.icon, color: cat.color })
    setEditing(cat.id)
    setError(null)
  }
  function cancel() {
    setEditing(null)
    setDraft(blank)
    setError(null)
  }

  async function save() {
    if (!draft.name.trim()) {
      setError('Bitte gib einen Namen ein.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (editing === 'new') await addCategory({ ...draft, name: draft.name.trim() })
      else await updateCategory(editing, { ...draft, name: draft.name.trim() })
      cancel()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(cat) {
    const inUse = expenses.some((e) => e.category_id === cat.id)
    const msg = inUse
      ? `„${cat.name}" wird von bestehenden Ausgaben genutzt. Beim Löschen bleiben diese Ausgaben ohne Kategorie. Trotzdem löschen?`
      : `Kategorie „${cat.name}" löschen?`
    if (!window.confirm(msg)) return
    try {
      await deleteCategory(cat.id)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div>
      <PageHeader title="Kategorien" subtitle="Ausgaben mit eigenen Namen, Icons und Farben ordnen.">
        <button onClick={startNew} className="btn-primary">
          <Plus className="h-4 w-4" /> Neue Kategorie
        </button>
      </PageHeader>

      {editing === 'new' && (
        <div className="mb-5">
          <Editor draft={draft} setDraft={setDraft} onSave={save} onCancel={cancel} busy={busy} error={error} />
        </div>
      )}

      {categories.length === 0 && editing !== 'new' ? (
        <EmptyState icon={Tags} title="Noch keine Kategorien" message="Erstelle deine erste Kategorie, um loszulegen." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const Icon = iconFor(cat.icon)
            const count = expenses.filter((e) => e.category_id === cat.id).length
            const hasBudget = budgets.some((b) => b.category_id === cat.id)
            if (editing === cat.id) {
              return (
                <div key={cat.id} className="sm:col-span-2 lg:col-span-3">
                  <Editor draft={draft} setDraft={setDraft} onSave={save} onCancel={cancel} busy={busy} error={error} />
                </div>
              )
            }
            return (
              <div key={cat.id} className="card group flex items-center gap-3 p-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${cat.color}22`, color: cat.color }}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-100">{cat.name}</p>
                  <p className="text-xs text-zinc-500">
                    {count} {count === 1 ? 'Ausgabe' : 'Ausgaben'}{hasBudget ? ' • Budget' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
                  <button onClick={() => startEdit(cat)} aria-label={`${cat.name} bearbeiten`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-ink-700 hover:text-zinc-100 cursor-pointer">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(cat)} aria-label={`${cat.name} löschen`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-bad/15 hover:text-red-300 cursor-pointer">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Editor({ draft, setDraft, onSave, onCancel, busy, error }) {
  const Preview = iconFor(draft.icon)
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${draft.color}22`, color: draft.color }}>
          <Preview className="h-6 w-6" />
        </span>
        <input
          autoFocus
          className="input flex-1"
          placeholder="Kategoriename"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && onSave()}
        />
      </div>

      <div className="mt-4">
        <span className="label">Icon</span>
        <div className="flex flex-wrap gap-1.5">
          {ICON_NAMES.map((name) => {
            const Icon = iconFor(name)
            const active = draft.icon === name
            return (
              <button key={name} type="button" onClick={() => setDraft({ ...draft, icon: name })}
                aria-label={name} aria-pressed={active}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors duration-200 cursor-pointer ${
                  active ? 'border-accent bg-accent/15 text-accent' : 'border-ink-700 bg-ink-900 text-zinc-400 hover:text-zinc-200'
                }`}>
                <Icon className="h-[18px] w-[18px]" />
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4">
        <span className="label">Farbe</span>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setDraft({ ...draft, color: c })}
              aria-label={`Farbe ${c}`} aria-pressed={draft.color === c}
              className={`h-8 w-8 rounded-full transition-transform duration-200 cursor-pointer ${
                draft.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-ink-850' : ''
              }`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onCancel} className="btn-ghost"><X className="h-4 w-4" /> Abbrechen</button>
        <button onClick={onSave} disabled={busy} className="btn-primary">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Speichern
        </button>
      </div>
    </div>
  )
}
