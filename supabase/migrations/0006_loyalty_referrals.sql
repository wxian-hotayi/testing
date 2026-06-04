-- =============================================================================
-- 0006_loyalty_referrals.sql — Loyalty points + referral program
-- =============================================================================

-- One ledger account per customer. `balance` is denormalized from the
-- transaction log and kept in sync by a trigger.
create table public.loyalty_accounts (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  balance       int not null default 0 check (balance >= 0),
  lifetime_earned int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger loyalty_accounts_set_updated_at
  before update on public.loyalty_accounts
  for each row execute function set_updated_at();

-- Append-only ledger. Positive points = earned, negative = redeemed/expired.
create table public.loyalty_transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  type          loyalty_txn_type not null,
  points        int not null,                          -- signed
  description   text,
  order_id      uuid references public.orders(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index loyalty_txn_user_idx on public.loyalty_transactions(user_id);
create index loyalty_txn_order_idx on public.loyalty_transactions(order_id);

-- Keep loyalty_accounts.balance / lifetime_earned consistent with the ledger.
create or replace function apply_loyalty_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.loyalty_accounts (user_id, balance, lifetime_earned)
  values (
    new.user_id,
    greatest(new.points, 0),
    greatest(new.points, 0)
  )
  on conflict (user_id) do update
  set balance = public.loyalty_accounts.balance + new.points,
      lifetime_earned = public.loyalty_accounts.lifetime_earned
        + greatest(new.points, 0),
      updated_at = now();
  return new;
end;
$$;

create trigger loyalty_txn_apply
  after insert on public.loyalty_transactions
  for each row execute function apply_loyalty_transaction();

-- --- referrals ---------------------------------------------------------------
create table public.referrals (
  id            uuid primary key default gen_random_uuid(),
  referrer_id   uuid not null references public.profiles(id) on delete cascade,
  referee_id    uuid references public.profiles(id) on delete set null,
  referee_email citext,
  code          text not null,
  status        referral_status not null default 'pending',
  reward_points int not null default 0,
  qualifying_order_id uuid references public.orders(id) on delete set null,
  rewarded_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index referrals_referrer_idx on public.referrals(referrer_id);
create index referrals_code_idx on public.referrals(code);
create index referrals_status_idx on public.referrals(status);

create trigger referrals_set_updated_at
  before update on public.referrals
  for each row execute function set_updated_at();
