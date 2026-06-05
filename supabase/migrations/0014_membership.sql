-- =============================================================================
-- 0014_membership.sql — Store member management, invitations & audit (MT-4)
--
-- Lets store admins manage memberships and assign the RBAC roles without DB
-- access. Adds membership status + an invitation lifecycle + a membership audit
-- trail, and FIXES store_role_rank() so the departmental roles added in 0013
-- (manager/marketing/warehouse/support) actually pass is_store_member().
--
-- ⚠️ NOT YET APPLIED TO A LIVE POSTGRES — validate with `supabase db reset`,
-- then `npm run db:types`.
-- =============================================================================

-- --- Fix: rank the departmental roles (0013 left them at 0) -------------------
-- Without this, is_store_member(store, 'staff') (rank 1) is FALSE for
-- marketing/warehouse/support, locking them out of their own store via RLS.
create or replace function store_role_rank(r store_member_role)
returns int
language sql
immutable
as $$
  select case r
    when 'owner'     then 4
    when 'admin'     then 3
    when 'manager'   then 2
    when 'marketing' then 1
    when 'warehouse' then 1
    when 'support'   then 1
    when 'staff'     then 1   -- legacy generic
    else 0
  end;
$$;

-- --- Enums -------------------------------------------------------------------
create type store_member_status as enum ('active', 'suspended', 'removed');
create type store_invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');

-- --- store_members: lifecycle columns ----------------------------------------
alter table public.store_members
  add column if not exists status store_member_status not null default 'active',
  add column if not exists invited_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists store_members_status_idx on public.store_members(store_id, status);

create trigger store_members_set_updated_at
  before update on public.store_members
  for each row execute function set_updated_at();

-- --- store_invitations -------------------------------------------------------
-- An invitation is created BEFORE the invitee necessarily has an account. On
-- accept (email match, server-side) it materialises a store_members row.
create table public.store_invitations (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  email         citext not null,
  role          store_member_role not null default 'support',
  status        store_invitation_status not null default 'pending',
  token         text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by    uuid references public.profiles(id) on delete set null,
  expires_at    timestamptz not null default (now() + interval '14 days'),
  accepted_at   timestamptz,
  accepted_by   uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index store_invitations_store_idx on public.store_invitations(store_id, status);
create index store_invitations_email_idx on public.store_invitations(email);
-- At most one OUTSTANDING invite per email per store (re-invites allowed once
-- a prior invite is accepted/revoked/expired).
create unique index store_invitations_pending_unique
  on public.store_invitations(store_id, email)
  where status = 'pending';

create trigger store_invitations_set_updated_at
  before update on public.store_invitations
  for each row execute function set_updated_at();

-- --- membership_audit --------------------------------------------------------
-- Append-only trail of every membership/role change. Written via the service
-- role from server actions; never updated.
create table public.membership_audit (
  id             uuid primary key default gen_random_uuid(),
  store_id       uuid not null references public.stores(id) on delete cascade,
  actor_id       uuid references public.profiles(id) on delete set null,
  actor_email    citext,
  action         text not null,            -- invited|role_changed|member_removed|…
  target_user_id uuid references public.profiles(id) on delete set null,
  target_email   citext,
  old_value      jsonb,
  new_value      jsonb,
  ip_address     text,
  created_at     timestamptz not null default now()
);

create index membership_audit_store_idx on public.membership_audit(store_id, created_at desc);

-- --- RLS ---------------------------------------------------------------------
-- All three tables are admin-scoped: only store admins/owners (and platform
-- admins, via is_store_member) read them. Mutations go through server actions
-- using the service-role client, which bypasses RLS; these policies are
-- defense-in-depth for any user-context access.
alter table public.store_invitations enable row level security;
create policy "store_invitations: admin manage" on public.store_invitations
  for all using (is_store_member(store_id, 'admin'))
  with check (is_store_member(store_id, 'admin'));

alter table public.membership_audit enable row level security;
create policy "membership_audit: admin read" on public.membership_audit
  for select using (is_store_member(store_id, 'admin'));
