import { Database } from 'lucide-react'

// Shown when Supabase env vars are missing, so the app never hard-crashes.
export default function SetupNotice() {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <div className="card w-full p-8">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <Database className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-semibold text-zinc-100">Connect your free database</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          This app stores your data in Supabase (free) so it syncs across your devices.
          Create a <code className="text-zinc-300">.env</code> file in the project root with:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-ink-700 bg-ink-900 p-4 text-left text-xs text-zinc-300">
{`VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY`}
        </pre>
        <p className="mt-4 text-sm text-zinc-400">
          Full step-by-step setup is in <code className="text-zinc-300">README.md</code>. Then
          restart the dev server.
        </p>
      </div>
    </div>
  )
}
