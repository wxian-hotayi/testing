-- =============================================================================
-- 0011_multitenant_core.sql — Tenancy spine (MT-1)
-- Introduces stores (tenants) + per-store membership + platform admin, WITHOUT
-- yet scoping commerce tables (that's MT-2). A default store is created so the
-- existing single-store data has a home once store_id columns are added.
-- =============================================================================

create type store_status as enum ('active', 'suspended', 'pending');
create type store_member_role as enum ('owner', 'admin', 'staff');

-- Platform-level super-admin flag (the SaaS operator — you). Distinct from
-- per-store roles, which live in store_members.
alter table public.profiles
  add column if not exists is_platform_admin boolean not null default false;

-- --- stores (the tenant) -----------------------------------------------------
create table public.stores (
  id            uuid primary key default gen_random_uuid(),
  slug          citext not null unique,            -- subdomain: <slug>.app.com
  name          text not null,
  custom_domain citext unique,                     -- optional vanity domain
  owner_id      uuid references public.profiles(id) on delete set null,
  status        store_status not null default 'active',
  -- Branding
  logo_url      text,
  primary_color text,
  currency      text not null default 'MYR',
  -- Stripe Connect (MT-5)
  stripe_account_id text unique,
  stripe_charges_enabled boolean not null default false,
  -- Per-store config (free-ship threshold overrides, feature flags, etc.)
  settings      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index stores_owner_idx on public.stores(owner_id);
create index stores_status_idx on public.stores(status);

create trigger stores_set_updated_at
  before update on public.stores
  for each row execute function set_updated_at();

-- --- store_members (per-store roles) -----------------------------------------
-- A user's relationship to a store as a MERCHANT operator. Shoppers do NOT get
-- a row here — their commerce data is store-scoped via store_id (MT-2).
create table public.store_members (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  role          store_member_role not null default 'staff',
  created_at    timestamptz not null default now(),
  unique (store_id, user_id)
);

create index store_members_store_idx on public.store_members(store_id);
create index store_members_user_idx on public.store_members(user_id);

-- --- Tenancy helper functions (defined AFTER the tables) ----------------------
create or replace function is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_platform_admin from public.profiles where id = auth.uid()), false);
$$;

-- Rank roles so a single check covers "at least this level".
create or replace function store_role_rank(r store_member_role)
returns int
language sql
immutable
as $$
  select case r when 'owner' then 3 when 'admin' then 2 when 'staff' then 1 else 0 end;
$$;

-- Is the caller a member of p_store with at least p_min_role? Platform admins
-- pass for any store. SECURITY DEFINER to avoid RLS recursion on store_members.
create or replace function is_store_member(p_store uuid, p_min_role store_member_role default 'staff')
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select is_platform_admin() or exists (
    select 1 from public.store_members m
    where m.store_id = p_store
      and m.user_id = auth.uid()
      and store_role_rank(m.role) >= store_role_rank(p_min_role)
  );
$$;

-- --- default store -----------------------------------------------------------
-- Existing single-store data conceptually belongs here; MT-2 backfills store_id.
insert into public.stores (id, slug, name, status)
values ('00000000-0000-0000-0000-0000000000aa', 'default', 'Vitalis', 'active')
on conflict (slug) do nothing;

-- --- RLS ---------------------------------------------------------------------
alter table public.stores enable row level security;
-- Public can read active stores (storefront needs store branding/resolution).
create policy "stores: public read active" on public.stores
  for select using (status = 'active' or is_store_member(id) or is_platform_admin());
-- Authenticated users may create a store (becomes owner — enforced app-side in MT-3).
create policy "stores: authenticated create" on public.stores
  for insert with check (auth.uid() is not null and owner_id = auth.uid());
-- Owners (and platform admins) manage their store.
create policy "stores: owner manage" on public.stores
  for update using (is_store_member(id, 'owner')) with check (is_store_member(id, 'owner'));
create policy "stores: platform admin all" on public.stores
  for all using (is_platform_admin()) with check (is_platform_admin());

alter table public.store_members enable row level security;
-- Members can see the roster of stores they belong to.
create policy "store_members: read same store" on public.store_members
  for select using (is_store_member(store_id) or user_id = auth.uid());
-- Owners (and platform admins) manage membership.
create policy "store_members: owner manage" on public.store_members
  for all using (is_store_member(store_id, 'owner')) with check (is_store_member(store_id, 'owner'));
create policy "store_members: platform admin all" on public.store_members
  for all using (is_platform_admin()) with check (is_platform_admin());
