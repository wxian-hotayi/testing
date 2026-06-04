-- =============================================================================
-- 0001_init.sql — Extensions, enums, profiles, addresses, core helpers
-- =============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";      -- case-insensitive email/slug

-- --- Enums -------------------------------------------------------------------
create type user_role as enum ('customer', 'staff', 'admin');
create type order_status as enum (
  'pending', 'paid', 'processing', 'shipped', 'delivered',
  'cancelled', 'refunded', 'partially_refunded'
);
create type payment_status as enum ('unpaid', 'paid', 'refunded', 'partially_refunded', 'failed');
create type fulfillment_status as enum ('unfulfilled', 'partial', 'fulfilled');
create type subscription_status as enum ('active', 'paused', 'cancelled', 'past_due');
create type subscription_interval as enum ('monthly', 'quarterly');
create type discount_type as enum ('percentage', 'fixed_amount', 'free_shipping');
create type review_status as enum ('pending', 'approved', 'rejected');
create type loyalty_txn_type as enum ('earn', 'redeem', 'expire', 'adjust', 'referral');
create type referral_status as enum ('pending', 'qualified', 'rewarded', 'expired');
create type cart_status as enum ('active', 'converted', 'abandoned', 'recovered');
create type address_type as enum ('shipping', 'billing');

-- --- Core helper functions ---------------------------------------------------

-- Generic updated_at trigger.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Role lookup used by RLS policies. SECURITY DEFINER avoids RLS recursion when
-- a policy on `profiles` itself needs to read the caller's role.
create or replace function current_user_role()
returns user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(current_user_role() in ('staff', 'admin'), false);
$$;

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(current_user_role() = 'admin', false);
$$;

-- --- profiles ----------------------------------------------------------------
-- 1:1 with auth.users. Holds role + storefront profile data.
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         citext not null,
  full_name     text,
  avatar_url    text,
  phone         text,
  role          user_role not null default 'customer',
  marketing_opt_in boolean not null default false,
  referral_code text unique,
  referred_by   uuid references public.profiles(id) on delete set null,
  stripe_customer_id text unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);
create index profiles_referred_by_idx on public.profiles(referred_by);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function set_updated_at();

-- Auto-create a profile row when a new auth user signs up. A short random
-- referral code is generated; collisions are astronomically unlikely but the
-- unique constraint guards against them.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, referral_code)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- --- addresses ---------------------------------------------------------------
create table public.addresses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  type          address_type not null default 'shipping',
  is_default    boolean not null default false,
  recipient_name text not null,
  phone         text,
  line1         text not null,
  line2         text,
  city          text not null,
  state         text not null,
  postal_code   text not null,
  country       text not null default 'MY',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index addresses_user_idx on public.addresses(user_id);

create trigger addresses_set_updated_at
  before update on public.addresses
  for each row execute function set_updated_at();
