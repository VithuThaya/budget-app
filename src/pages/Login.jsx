import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Wallet, Loader2 } from 'lucide-react'

export default function Login() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({ email, password })
        if (err) throw err
        setNotice('Konto erstellt. Wenn E-Mail-Bestätigung aktiv ist, prüfe dein Postfach — sonst bist du bereits angemeldet.')
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
      }
    } catch (err) {
      setError(err.message || 'Etwas ist schiefgelaufen')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent shadow-glow">
            <Wallet className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Budget</h1>
          <p className="mt-1 text-sm text-zinc-400">Cleveres Haushaltsbudget, auf all deinen Geräten synchron.</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <div className="flex rounded-xl border border-ink-700 bg-ink-900 p-1 text-sm">
            {['signin', 'signup'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg px-3 py-2 font-medium transition-colors duration-200 cursor-pointer ${
                  mode === m ? 'bg-accent text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {m === 'signin' ? 'Anmelden' : 'Konto erstellen'}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="email" className="label">E-Mail</label>
            <input
              id="email" type="email" required autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="input" placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="label">Passwort</label>
            <input
              id="password" type="password" required minLength={8}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="input" placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-red-300">{error}</p>
          )}
          {notice && (
            <p className="rounded-lg border border-good/30 bg-good/10 px-3 py-2 text-sm text-green-300">{notice}</p>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'signin' ? 'Anmelden' : 'Konto erstellen'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Deine Daten gehören nur deinem Konto und werden sicher in Supabase gespeichert.
        </p>
      </div>
    </div>
  )
}
