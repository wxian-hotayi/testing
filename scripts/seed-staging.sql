-- =============================================================================
-- seed-staging.sql — repeatable STAGING seed for tenant-isolation + RBAC tests.
--
-- ⚠️ STAGING ONLY. Run AFTER migrations 0011–0015 are applied (the tenancy
-- tables + store_id must exist — see reports/schema-remediation.md).
--
-- Prerequisite: create the auth accounts first (the app /login → "create
-- account", or Supabase Dashboard → Authentication), using these emails. SQL
-- cannot mint Supabase auth users safely; this script maps EXISTING accounts to
-- stores/roles by email. Idempotent (safe to re-run).
--
--   platform-admin@staging.test    → platform operator (super_admin)
--   store-a-admin@staging.test     → owner of Store A
--   store-b-admin@staging.test     → owner of Store B   (isolation counter-party)
--   manager@staging.test           → Store A manager
--   marketing@staging.test         → Store A marketing
--   warehouse@staging.test         → Store A warehouse
--   support@staging.test           → Store A support
--   customer@staging.test          → shopper (no membership)
-- =============================================================================

begin;

-- --- Stores ------------------------------------------------------------------
insert into public.stores (slug, name, status, currency)
values ('store-a', 'Store A (staging)', 'active', 'MYR'),
       ('store-b', 'Store B (staging)', 'active', 'MYR')
on conflict (slug) do update set name = excluded.name, status = 'active';

-- --- Platform admin ----------------------------------------------------------
update public.profiles set is_platform_admin = true
 where email = 'platform-admin@staging.test';

-- Clear legacy global role on test operators so the default-store legacy
-- fallback can't grant cross-tenant admin (RBAC fix relies on this).
update public.profiles set role = 'customer'
 where email in (
   'store-a-admin@staging.test','store-b-admin@staging.test','manager@staging.test',
   'marketing@staging.test','warehouse@staging.test','support@staging.test',
   'customer@staging.test'
 );

-- --- Store memberships -------------------------------------------------------
-- Store A roster (owner + each departmental role).
insert into public.store_members (store_id, user_id, role, status)
select s.id, p.id, v.role::store_member_role, 'active'
from (values
  ('store-a-admin@staging.test','owner'),
  ('manager@staging.test',      'manager'),
  ('marketing@staging.test',    'marketing'),
  ('warehouse@staging.test',    'warehouse'),
  ('support@staging.test',      'support')
) as v(email, role)
join public.profiles p on p.email = v.email
join public.stores  s on s.slug   = 'store-a'
on conflict (store_id, user_id) do update set role = excluded.role, status = 'active';

-- Store B roster (owner only — isolation counter-party).
insert into public.store_members (store_id, user_id, role, status)
select s.id, p.id, 'owner'::store_member_role, 'active'
from public.profiles p
join public.stores  s on s.slug = 'store-b'
where p.email = 'store-b-admin@staging.test'
on conflict (store_id, user_id) do update set role = 'owner', status = 'active';

-- --- Minimal commerce data per store (for RLS proof + tenant isolation) ------
insert into public.products (store_id, slug, name, price_sen, is_active)
select s.id, v.slug, v.name, v.price, true
from (values
  ('store-a', 'a-creatine', 'A — Creatine', 9900),
  ('store-b', 'b-omega3',   'B — Omega 3',  7900)
) as v(store_slug, slug, name, price)
join public.stores s on s.slug = v.store_slug
on conflict (store_id, slug) do nothing;

commit;

-- Verify:
--   select s.slug, count(m.*) members from public.stores s
--     left join public.store_members m on m.store_id = s.id group by s.slug;
--   select email, role, is_platform_admin from public.profiles
--     where email like '%@staging.test' order by email;
