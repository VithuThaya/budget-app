# Budget — Smart personal finance

A modern, dark-themed budgeting app with multi-device sync, built with **React + Vite +
Tailwind** and a free **Supabase** backend. Amounts are formatted in **CHF**.

## Features

- **Dashboard** — month/week spending, income, net, weekly bars, budget status, live advisor alerts, recent transactions
- **Expenses** — searchable/sortable list grouped by day; add/edit/delete; recurring (subscriptions)
- **Add Expense** — amount, category, date, notes, recurring (weekly/monthly)
- **Incomes** — one-time and recurring income
- **Categories** — editable name, icon and colour
- **Budgets** — monthly cap per category with live progress
- **Reports** — category pie, daily trend, weekly comparison bars, week/month comparisons,
  **Savings Potential**, **Saving Plan Generator** (7 & 30 day), and a **Monthly Financial
  Story** you can export as a PNG infographic
- **Adaptive Spending Advisor** — detects spending spikes, rising trends and budget overspend,
  with contextual alerts that update live as you add expenses
- All data flows from one source of truth, so every page stays in sync (with realtime sync
  across devices via Supabase)

---

## 1. Set up the free database (Supabase) — ~5 minutes

1. Go to **https://supabase.com** -> sign in (you can use GitHub) -> **New project** (free tier).
   Choose a name, a strong database password, and a region near you (e.g. Frankfurt for CH).
   Wait ~1-2 min for it to provision.
2. In the project, open **Project Settings -> API** and copy:
   - **Project URL**
   - **anon public**
3. In the project, open **SQL Editor -> New query**, paste the entire contents of
   `supabase/schema.sql`, and click **Run**. This creates the tables and security rules
   (each user only sees their own data) and enables realtime sync.
4. Open **Authentication -> Providers -> Email** and make sure it is enabled. For the easiest
   testing, turn **off** "Confirm email" so you can sign in immediately. (You can turn it
   back on later.)

## 2. Run it locally

```bash
# 1) install dependencies
npm install

# 2) create your .env from the template and paste your two values
cp .env.example .env
#   then edit .env:
#   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
#   VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY

# 3) start the dev server
npm run dev
```

Open the printed URL, click **Create account**, sign up, and start adding expenses. The app
seeds a default set of categories on first login.

## 3. Publish free on GitHub Pages

1. Create a GitHub repo named **`budget-app`** (the Vite `base` is set to `/budget-app/`).
   If you use a different name, update `base` in `vite.config.js`.
2. Push this project to the repo's `main` branch.
3. In the repo: **Settings -> Pages -> Build and deployment -> Source: GitHub Actions**.
4. In the repo: **Settings -> Secrets and variables -> Actions -> New repository secret**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Push to `main` (or run the workflow manually). The included
   `.github/workflows/deploy.yml` builds and publishes.
   Your live app: `https://<your-username>.github.io/budget-app/`

Open the live URL on desktop and on your phone, sign in with the **same account**, and your
data syncs across both.

> The Supabase **anon key** is safe to expose in a frontend — Row Level Security (set up by
> `schema.sql`) ensures each user can only read/write their own rows.

## Tech

React 18 · Vite 5 · Tailwind CSS 3 · React Router (HashRouter) · Recharts · lucide-react ·
html-to-image · Supabase (Postgres + Auth + Realtime).
