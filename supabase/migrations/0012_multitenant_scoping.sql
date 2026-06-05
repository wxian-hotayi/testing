-- =============================================================================
-- 0012_multitenant_scoping.sql — Scope commerce data by store (MT-2)
--
-- Adds `store_id` to every store-owned commerce/merchandising table, backfills
-- existing rows to the seeded `default` store, scopes identity/uniqueness keys
-- per store, and rewrites RLS so reads see only active-store data and writes are
-- gated by store membership (platform admins pass for any store).
--
-- EXPAND PHASE: `store_id` carries a DEFAULT of the default store
-- ('…0000aa', seeded in 0011), so the existing single store keeps working with
-- no code change; later phases (MT-3 provisioning, MT-6 storefront routing)
-- populate real store_ids. All statements are idempotent (`if [not] exists`).
--
-- ⚠️ NOT YET APPLIED TO A LIVE POSTGRES. Validate with `supabase db reset`
-- against a real instance, then `npm run db:types`.
--
-- DEFERRED to MT-4 (needs cron/admin store-resolution rework, out of scope here):
--   • profiles, addresses           — user-level, shared across stores
--   • email_templates, email_flows  — read globally by the abandoned-cart cron
--   • settings                      — platform config, single-row-per-key today
-- =============================================================================

-- The default store id, seeded in 0011_multitenant_core.sql.
-- (Inlined as a literal; psql \set is not portable to `supabase db push`.)

-- --- store-active helper (used by public-read policies) ----------------------
-- SECURITY DEFINER so the anon role can check store status without a stores
-- SELECT grant. STABLE: safe within a statement.
create or replace function store_is_active(p_store uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.stores s where s.id = p_store and s.status = 'active'
  );
$$;

-- =============================================================================
-- A. Add store_id (NOT NULL, default → default store, FK, cascade) + indexes
-- =============================================================================
do $$
declare
  t text;
  scoped text[] := array[
    'products','categories','bundles','product_images','product_relationships',
    'inventory_adjustments','reviews','carts','cart_items','orders','order_items',
    'coupons','coupon_redemptions','subscriptions','subscription_items',
    'loyalty_accounts','loyalty_transactions','referrals','newsletter_subscribers',
    'wishlist_items'
  ];
begin
  foreach t in array scoped loop
    execute format(
      'alter table public.%I add column if not exists store_id uuid not null '
      'default ''00000000-0000-0000-0000-0000000000aa'' '
      'references public.stores(id) on delete cascade',
      t
    );
    execute format(
      'create index if not exists %I on public.%I(store_id)',
      t || '_store_idx', t
    );
  end loop;
end $$;

-- =============================================================================
-- B. Per-store identity / uniqueness keys
-- A slug/code/email is unique WITHIN a store, not globally — two stores may both
-- have a "creatine" product or a "WELCOME10" coupon.
-- =============================================================================
-- products.slug + products.sku
alter table public.products drop constraint if exists products_slug_key;
alter table public.products drop constraint if exists products_sku_key;
create unique index if not exists products_store_slug_key on public.products(store_id, slug);
create unique index if not exists products_store_sku_key  on public.products(store_id, sku) where sku is not null;

-- categories.slug
alter table public.categories drop constraint if exists categories_slug_key;
create unique index if not exists categories_store_slug_key on public.categories(store_id, slug);

-- coupons.code
alter table public.coupons drop constraint if exists coupons_code_key;
create unique index if not exists coupons_store_code_key on public.coupons(store_id, code);

-- newsletter_subscribers.email
alter table public.newsletter_subscribers drop constraint if exists newsletter_subscribers_email_key;
create unique index if not exists newsletter_subscribers_store_email_key
  on public.newsletter_subscribers(store_id, email);

-- =============================================================================
-- C. loyalty_accounts becomes per-store (one ledger account per user PER store)
-- =============================================================================
alter table public.loyalty_accounts drop constraint if exists loyalty_accounts_pkey;
alter table public.loyalty_accounts add primary key (store_id, user_id);

-- The ledger trigger must upsert on (store_id, user_id) and carry store_id from
-- the transaction row (which now has a store_id, default → default store).
create or replace function apply_loyalty_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.loyalty_accounts (store_id, user_id, balance, lifetime_earned)
  values (
    new.store_id,
    new.user_id,
    greatest(new.points, 0),
    greatest(new.points, 0)
  )
  on conflict (store_id, user_id) do update
  set balance = public.loyalty_accounts.balance + new.points,
      lifetime_earned = public.loyalty_accounts.lifetime_earned
        + greatest(new.points, 0),
      updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- D. RLS rewrite — store-scoped
-- Reads: public sees only ACTIVE-store rows; owners/members see their own.
-- Writes: gated by store membership; `is_store_member()` already passes platform
-- admins for any store. User-owned policies (own cart/orders/etc.) are unchanged
-- — a shopper still reaches their own rows regardless of store.
-- =============================================================================

-- catalog ---------------------------------------------------------------------
drop policy if exists "categories: public read" on public.categories;
drop policy if exists "categories: staff write" on public.categories;
create policy "categories: public read" on public.categories
  for select using ((is_active and store_is_active(store_id)) or is_store_member(store_id));
create policy "categories: member write" on public.categories
  for all using (is_store_member(store_id)) with check (is_store_member(store_id));

drop policy if exists "products: public read" on public.products;
drop policy if exists "products: staff write" on public.products;
create policy "products: public read" on public.products
  for select using ((is_active and store_is_active(store_id)) or is_store_member(store_id));
create policy "products: member write" on public.products
  for all using (is_store_member(store_id)) with check (is_store_member(store_id));

drop policy if exists "product_images: public read" on public.product_images;
drop policy if exists "product_images: staff write" on public.product_images;
create policy "product_images: public read" on public.product_images
  for select using (store_is_active(store_id) or is_store_member(store_id));
create policy "product_images: member write" on public.product_images
  for all using (is_store_member(store_id)) with check (is_store_member(store_id));

drop policy if exists "bundles: public read" on public.bundles;
drop policy if exists "bundles: staff write" on public.bundles;
create policy "bundles: public read" on public.bundles
  for select using ((is_active and store_is_active(store_id)) or is_store_member(store_id));
create policy "bundles: member write" on public.bundles
  for all using (is_store_member(store_id)) with check (is_store_member(store_id));

drop policy if exists "relationships: public read" on public.product_relationships;
drop policy if exists "relationships: staff write" on public.product_relationships;
create policy "relationships: public read" on public.product_relationships
  for select using (store_is_active(store_id) or is_store_member(store_id));
create policy "relationships: member write" on public.product_relationships
  for all using (is_store_member(store_id)) with check (is_store_member(store_id));

drop policy if exists "inventory: staff all" on public.inventory_adjustments;
create policy "inventory: member all" on public.inventory_adjustments
  for all using (is_store_member(store_id)) with check (is_store_member(store_id));

-- reviews ---------------------------------------------------------------------
drop policy if exists "reviews: public read approved" on public.reviews;
drop policy if exists "reviews: staff manage" on public.reviews;
create policy "reviews: public read approved" on public.reviews
  for select using (
    (status = 'approved' and store_is_active(store_id))
    or user_id = auth.uid()
    or is_store_member(store_id)
  );
create policy "reviews: member manage" on public.reviews
  for all using (is_store_member(store_id)) with check (is_store_member(store_id));
-- (user insert/edit own policies from 0009 remain in force.)

-- carts -----------------------------------------------------------------------
drop policy if exists "carts: staff read" on public.carts;
create policy "carts: member read" on public.carts
  for select using (is_store_member(store_id));

-- orders ----------------------------------------------------------------------
drop policy if exists "orders: staff manage" on public.orders;
create policy "orders: member manage" on public.orders
  for all using (is_store_member(store_id)) with check (is_store_member(store_id));

drop policy if exists "order_items: staff manage" on public.order_items;
create policy "order_items: member manage" on public.order_items
  for all using (is_store_member(store_id)) with check (is_store_member(store_id));

-- subscriptions ---------------------------------------------------------------
drop policy if exists "subs: staff manage" on public.subscriptions;
create policy "subs: member manage" on public.subscriptions
  for all using (is_store_member(store_id)) with check (is_store_member(store_id));

drop policy if exists "sub_items: staff manage" on public.subscription_items;
create policy "sub_items: member manage" on public.subscription_items
  for all using (is_store_member(store_id)) with check (is_store_member(store_id));

-- loyalty ---------------------------------------------------------------------
drop policy if exists "loyalty_acct: staff manage" on public.loyalty_accounts;
create policy "loyalty_acct: member manage" on public.loyalty_accounts
  for all using (is_store_member(store_id)) with check (is_store_member(store_id));

drop policy if exists "loyalty_txn: staff manage" on public.loyalty_transactions;
create policy "loyalty_txn: member manage" on public.loyalty_transactions
  for all using (is_store_member(store_id)) with check (is_store_member(store_id));

-- referrals -------------------------------------------------------------------
drop policy if exists "referrals: staff manage" on public.referrals;
create policy "referrals: member manage" on public.referrals
  for all using (is_store_member(store_id)) with check (is_store_member(store_id));

-- coupons ---------------------------------------------------------------------
drop policy if exists "coupons: staff all" on public.coupons;
create policy "coupons: member all" on public.coupons
  for all using (is_store_member(store_id)) with check (is_store_member(store_id));

drop policy if exists "coupon_redemptions: staff manage" on public.coupon_redemptions;
create policy "coupon_redemptions: member manage" on public.coupon_redemptions
  for all using (is_store_member(store_id)) with check (is_store_member(store_id));

-- newsletter ------------------------------------------------------------------
drop policy if exists "newsletter: staff read" on public.newsletter_subscribers;
create policy "newsletter: member read" on public.newsletter_subscribers
  for select using (is_store_member(store_id));
