create table if not exists public.user_state (
  user_id text not null,
  key text not null check (key in ('portfolio','policies','calls','money-actions','eligibility')),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id,key)
);
alter table public.user_state enable row level security;
revoke all on public.user_state from anon, authenticated;
create table if not exists public.market_snapshots (
  id bigint generated always as identity primary key,
  ticker text not null,
  source text not null,
  price numeric not null check (price > 0),
  reference numeric not null check (reference > 0),
  captured_at timestamptz not null default now()
);
alter table public.market_snapshots enable row level security;
revoke all on public.market_snapshots from anon, authenticated;
create index if not exists snapshot_ticker_time on public.market_snapshots(ticker,captured_at desc);
