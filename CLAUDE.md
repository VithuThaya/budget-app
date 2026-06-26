# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working practices (standing instructions from the user)

- **Persist important changes to memory.** Whenever something non-obvious changes — a feature, an architectural decision, a Supabase dashboard setting, a new convention — record it in the project memory (`MEMORY.md` + a memory file) so the next session has full context. Dashboard/backend settings are especially important because they are not visible in the repo.
- **Push to git after every change.** Once a change is made and verified (build/app working), commit it and `git push` to `main` — do not leave finished work uncommitted. Pushing to `main` auto-deploys to GitHub Pages.

## Commands

```bash
npm run dev      # Vite dev server at http://localhost:5173/budget-app/
npm run build    # production build to dist/
npm run preview  # serve the production build locally
```

There is no test runner, linter, or formatter configured.

Requires a `.env` (copy from `.env.example`) with `VITE_SUPABASE_URL` (base URL, **no** `/rest/v1/` suffix) and `VITE_SUPABASE_ANON_KEY`. Without these the app renders `SetupNotice` instead of crashing (`isConfigured` in `src/lib/supabase.js`).

## Architecture

A single-page React + Vite app (no SSR) with a Supabase Postgres/Auth/Realtime backend. There is **no custom backend code** — the browser talks to Supabase directly, and Row Level Security (defined in `supabase/schema.sql`) is the only authorization layer. The anon key is intentionally shipped to the client.

**Three-layer separation:**

1. **`src/store/DataContext.jsx`** — the single source of truth. It loads all tables (`categories`, `budgets`, `incomes`, `expenses`, `fixed_costs`, `savings_goals`, `savings_contributions`) once on login, holds them in React state, and exposes `useData()`. The table list lives in the `TABLES` array (drives both the parallel load and the realtime subscription). All mutations go through generic `create`/`update`/`remove` helpers (wrapped per-table as `addExpense`, `setBudget`, `addFixedCost`, `addSavingsGoal`, `addContribution`, etc.) that write to Supabase and reconcile local state by row `id`. A realtime subscription filtered by `user_id` keeps other devices in sync. **Pages must never query Supabase directly** — go through `useData()` so every view derives from the same arrays and stays consistent.

2. **`src/logic/`** — pure functions that derive everything from the raw arrays. `selectors.js` holds shared aggregations (month/week spend, spend-by-category, trailing averages, **fixed-cost monthly normalisation** via `PERIOD_TO_MONTHLY`/`monthlyFixedTotal`/`availableToSpend`); the "intelligence" modules build on it: `advisor.js` (`generateAlerts`), `savingsPotential.js`, `savingsPlan.js`, `monthlyStory.js`, and `savings.js` (savings-goal balances/progress — distinct from the spend-cap `savingsPlan.js`). Keep new derivations here and pure so Dashboard, Budgets, Reports, Fixed costs and Savings always compute identical numbers.

3. **`src/pages/` + `src/components/`** — presentation only. Pages read `useData()` and call logic functions; components (including `components/charts/` built on Recharts) are dumb renderers.

**Auth/routing flow** (`src/App.jsx`): on load, check `isConfigured` → if false render `SetupNotice`; else read the Supabase session. No session → `Login`. With a session, mount `DataProvider` and the routes under `Layout`. Routing uses **HashRouter** (`main.jsx`) so deep links work on GitHub Pages without server config.

**First-login seeding:** when a new account has zero categories, `DataContext.loadAll` inserts `DEFAULT_CATEGORIES` from `src/lib/categoryMeta.js` (guarded by `seededRef` against double-seeding).

## Conventions

- **Money:** amounts are `numeric(12,2)` in CHF. Always format via `src/lib/money.js` (`formatCHF`, `formatSignedCHF`) and parse user input with `parseAmount`. Never hand-roll currency formatting.
- **Dates:** stored as ISO `date` strings. Use `src/lib/dates.js` helpers (`isThisMonth`, `isThisWeek`, `startOfWeek`, `weeklyTotals`, etc.) rather than raw `Date` math so week/month boundaries match across the app.
- **Budgets** are one row per category (unique `user_id, category_id`); use `setBudget(categoryId, amount)` which upserts.
- **Fixed costs** (`fixed_costs`, page `/fixed-costs`) are a planning layer: recurring obligations with a `period` (`weekly|monthly|quarterly|yearly`) normalised to a monthly value. They are **not** expenses (no double-counting).
- **Savings** (`savings_goals` + `savings_contributions`, page `/savings`) are manual pots. A goal's balance is the sum of its contributions; `target_amount`/`target_date`/`monthly_target` are optional.
- **The Dashboard "available to spend" chain:** `Income − Fixed costs = Available`, then `Available − Spent − Saved-this-month = Left to spend`. When adding anything that affects disposable income, keep this chain consistent (logic in `selectors.js` + `savings.js`).
- **Styling:** Tailwind with a custom dark palette (`ink-*`, `accent`) defined in `tailwind.config.js`. Icons come from `lucide-react`; category icons are stored as lucide icon names (strings).

## Security

The security boundary is **Supabase Row Level Security** (`supabase/schema.sql`), not the client — the anon key ships in the bundle by design and every table policy enforces `auth.uid() = user_id`. The `service_role` key must never appear in frontend code, `.env` (`VITE_` vars are public), or the repo.

- **Content-Security-Policy** is injected into `index.html` **only in the production build** by the `cspPlugin` in `vite.config.js` (`apply: 'build'`). It is intentionally absent in dev because Vite HMR uses inline scripts that `script-src 'self'` would block. If you add a third-party API, font, or analytics host, you must extend the matching CSP directive there or requests will be blocked in production. `modulePreload.polyfill` is disabled so the build contains no inline `<script>`, keeping `script-src` free of `'unsafe-inline'`.
- **Auth hardening lives in the Supabase dashboard, not the code**: email confirmation on, new-user sign-ups disabled, and minimum password length (set under Authentication settings). The client `minLength={8}` in `Login.jsx` is UX only — the real enforcement is server-side.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml` which builds and publishes to GitHub Pages. The build reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from **repository** Actions secrets. `base: '/budget-app/'` in `vite.config.js` must match the repo name, or asset URLs break on Pages.
