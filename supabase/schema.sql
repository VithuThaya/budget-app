-- ============================================================================
-- Budget App — Supabase schema
-- Paste this whole file into Supabase: SQL Editor -> New query -> Run.
-- It creates the tables and Row Level Security so every user only ever sees
-- and edits their own rows. Safe to re-run (uses IF NOT EXISTS / OR REPLACE).
-- ============================================================================

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  icon        text not null default 'Tag',
  color       text not null default '#2563eb',
  created_at  timestamptz not null default now()
);

create table if not exists public.budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid references public.categories (id) on delete cascade,
  amount      numeric(12, 2) not null default 0,
  period      text not null default 'monthly',
  created_at  timestamptz not null default now(),
  unique (user_id, category_id)
);

-- Planning-only figure: the income the user expects to distribute across
-- budgets. Deliberately separate from `incomes` so it never counts as money
-- actually received (Dashboard/Kontostand stay based on real incomes).
create table if not exists public.budget_settings (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  planned_income numeric(12, 2) not null default 0,
  created_at     timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.incomes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source         text not null,
  amount         numeric(12, 2) not null default 0,
  date           date not null default current_date,
  recurring      boolean not null default false,
  recur_interval text,                         -- 'weekly' | 'monthly' | null
  notes          text,
  created_at     timestamptz not null default now()
);

create table if not exists public.expenses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount         numeric(12, 2) not null default 0,
  category_id    uuid references public.categories (id) on delete set null,
  date           date not null default current_date,
  notes          text,
  recurring      boolean not null default false,
  recur_interval text,                         -- 'weekly' | 'monthly' | null
  created_at     timestamptz not null default now()
);

-- Fixed costs are a PLANNING layer: recurring obligations (rent, insurance,
-- subscriptions) that are subtracted from income to show how much is left to
-- spend. They are NOT expenses and are never double-counted against the
-- expenses table. Each row's `amount` is normalised to a monthly value in the
-- app via its `period`.
create table if not exists public.fixed_costs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  amount      numeric(12, 2) not null default 0,
  period      text not null default 'monthly',  -- 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  paid_months text[] not null default '{}',      -- months ('YYYY-MM') the user ticked as paid; drives Kontostand & month-end projection
  active      boolean not null default true,
  notes       text,
  created_at  timestamptz not null default now()
);

-- Savings goals ("pots"): a named target the user saves towards. target_amount
-- and target_date are optional (an open pot just accumulates). monthly_target
-- is the user's planned contribution per month, shown as a guideline.
create table if not exists public.savings_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name           text not null,
  icon           text not null default 'PiggyBank',
  color          text not null default '#22c55e',
  target_amount  numeric(12, 2),
  target_date    date,
  monthly_target numeric(12, 2),
  created_at     timestamptz not null default now()
);

-- Manual contributions into a goal. Their sum is the pot's balance, and
-- contributions dated in the current month reduce "left to spend" on the
-- dashboard (saving is treated like a committed outflow).
create table if not exists public.savings_contributions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id     uuid not null references public.savings_goals (id) on delete cascade,
  amount      numeric(12, 2) not null default 0,
  date        date not null default current_date,
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists contributions_user_goal_idx on public.savings_contributions (user_id, goal_id);

create index if not exists expenses_user_date_idx on public.expenses (user_id, date desc);
create index if not exists incomes_user_date_idx  on public.incomes (user_id, date desc);

-- ---------------------------------------------------------------------------
-- Row Level Security: each user can only touch their own rows
-- ---------------------------------------------------------------------------
alter table public.categories            enable row level security;
alter table public.budgets               enable row level security;
alter table public.budget_settings       enable row level security;
alter table public.incomes               enable row level security;
alter table public.expenses              enable row level security;
alter table public.fixed_costs           enable row level security;
alter table public.savings_goals         enable row level security;
alter table public.savings_contributions enable row level security;

do $$
declare t text;
begin
  foreach t in array array['categories', 'budgets', 'budget_settings', 'incomes', 'expenses', 'fixed_costs', 'savings_goals', 'savings_contributions']
  loop
    execute format('drop policy if exists "own_select" on public.%I;', t);
    execute format('drop policy if exists "own_insert" on public.%I;', t);
    execute format('drop policy if exists "own_update" on public.%I;', t);
    execute format('drop policy if exists "own_delete" on public.%I;', t);

    execute format('create policy "own_select" on public.%I for select using (auth.uid() = user_id);', t);
    execute format('create policy "own_insert" on public.%I for insert with check (auth.uid() = user_id);', t);
    execute format('create policy "own_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
    execute format('create policy "own_delete" on public.%I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Realtime: broadcast changes so a second device updates instantly
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.expenses;
exception when others then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.incomes;
exception when others then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.budgets;
exception when others then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.budget_settings;
exception when others then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.categories;
exception when others then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.fixed_costs;
exception when others then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.savings_goals;
exception when others then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.savings_contributions;
exception when others then null;
end $$;

-- RPC for the iPhone Shortcut direct-write path: send the category NAME,
-- resolve it to the caller's own category_id server-side. SECURITY INVOKER so
-- RLS applies and auth.uid() is the calling user (never trusts a client-sent
-- user_id). Unknown/absent name -> category_id null (expense still saves;
-- categorise later in the app). All params default so partial calls work.
create or replace function public.add_expense(
  amount numeric default 0,
  notes text default null,
  expense_date date default current_date,
  category_name text default null
) returns public.expenses
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_cat uuid;
  v_row public.expenses;
begin
  -- Match the client-side rule (AddExpense.jsx): reject non-positive amounts so
  -- a buggy/compromised Shortcut can't skew the user's own totals.
  if amount is null or amount <= 0 then
    raise exception 'amount must be greater than zero';
  end if;

  if category_name is not null and length(trim(category_name)) > 0 then
    select c.id into v_cat
    from public.categories c
    where c.user_id = auth.uid()
      and lower(c.name) = lower(trim(category_name))
    limit 1;
  end if;

  insert into public.expenses (user_id, amount, category_id, date, notes)
  values (auth.uid(), amount, v_cat, coalesce(expense_date, current_date),
          nullif(trim(notes), ''))
  returning * into v_row;

  return v_row;
end;
$$;

-- Least privilege: Supabase's default privileges grant EXECUTE on new public
-- functions to the anon role; revoke it so only authenticated (logged-in)
-- sessions can call this. Must run AFTER create-or-replace, which re-applies
-- the default grant each time.
revoke execute on function public.add_expense(numeric, text, date, text) from public, anon;
grant execute on function public.add_expense(numeric, text, date, text) to authenticated;
