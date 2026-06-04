-- ============================================================
-- Vitalis — full database setup (all migrations + seed)
-- Paste this WHOLE file into the Supabase SQL editor and Run.
-- Safe to re-run: it resets the public schema first.
-- ============================================================

-- Reset public schema (fresh project only — drops everything in public).
drop schema if exists public cascade;
create schema public;
grant usage on schema public to anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;


-- >>> 0001_init.sql >>>
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

-- NOTE: the role-lookup helpers (current_user_role/is_staff/is_admin) are
-- defined AFTER the profiles table below — `language sql` bodies are validated
-- at CREATE time, so they cannot reference profiles before it exists.

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

-- --- Role-lookup helpers (defined AFTER profiles so SQL bodies validate) -----
-- SECURITY DEFINER avoids RLS recursion when a policy on `profiles` itself
-- needs to read the caller's role.
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


-- >>> 0002_catalog.sql >>>
-- =============================================================================
-- 0002_catalog.sql — Categories, products, images, bundles, cross-sell, stock
-- =============================================================================

-- --- categories --------------------------------------------------------------
create table public.categories (
  id            uuid primary key default gen_random_uuid(),
  slug          citext not null unique,
  name          text not null,
  description   text,
  image_url     text,
  parent_id     uuid references public.categories(id) on delete set null,
  position      int not null default 0,
  is_active     boolean not null default true,
  -- SEO
  meta_title    text,
  meta_description text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index categories_parent_idx on public.categories(parent_id);
create index categories_active_idx on public.categories(is_active);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function set_updated_at();

-- --- products ----------------------------------------------------------------
-- Pricing is stored in minor units (sen). `compare_at_price_sen` powers the
-- struck-through "was" price for perceived-value CRO.
create table public.products (
  id            uuid primary key default gen_random_uuid(),
  slug          citext not null unique,
  sku           text unique,
  name          text not null,
  subtitle      text,
  description   text,
  category_id   uuid references public.categories(id) on delete set null,
  price_sen     int not null check (price_sen >= 0),
  compare_at_price_sen int check (compare_at_price_sen >= 0),
  cost_sen      int check (cost_sen >= 0),          -- for margin analytics
  -- Supplement-specific structured content (rendered on PDP).
  ingredients   text,
  benefits      jsonb not null default '[]'::jsonb,  -- ["Supports focus", ...]
  usage_instructions text,
  supplement_facts jsonb,                            -- structured facts panel
  -- Merchandising
  is_active     boolean not null default true,
  is_featured   boolean not null default false,
  is_best_seller boolean not null default false,
  is_subscribable boolean not null default true,
  rating_avg    numeric(3,2) not null default 0,     -- denormalized for sort/filter
  rating_count  int not null default 0,
  -- Inventory (simple single-location model).
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  low_stock_threshold int not null default 10,
  track_inventory boolean not null default true,
  -- Stripe linkage (populated when synced).
  stripe_product_id text,
  stripe_price_id   text,
  -- SEO
  meta_title    text,
  meta_description text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index products_category_idx on public.products(category_id);
create index products_active_idx on public.products(is_active);
create index products_featured_idx on public.products(is_featured) where is_featured;
create index products_best_seller_idx on public.products(is_best_seller) where is_best_seller;

create trigger products_set_updated_at
  before update on public.products
  for each row execute function set_updated_at();

-- --- product_images ----------------------------------------------------------
create table public.product_images (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  url           text not null,
  alt           text,
  position      int not null default 0,
  is_primary    boolean not null default false,
  created_at    timestamptz not null default now()
);

create index product_images_product_idx on public.product_images(product_id);

-- --- bundles -----------------------------------------------------------------
-- Quantity-based pricing tiers for a single product (the RM99/179/249 ladder).
-- `price_sen` is the TOTAL price for `quantity` units.
create table public.bundles (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  quantity      int not null check (quantity >= 1),
  price_sen     int not null check (price_sen >= 0),
  label         text,                                -- e.g. "Most Popular"
  is_active     boolean not null default true,
  position      int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (product_id, quantity)
);

create index bundles_product_idx on public.bundles(product_id);

create trigger bundles_set_updated_at
  before update on public.bundles
  for each row execute function set_updated_at();

-- --- product_relationships ---------------------------------------------------
-- Drives the cross-sell / "frequently bought together" engine. When a customer
-- adds `product_id`, recommend `related_product_id`.
create type relationship_type as enum ('cross_sell', 'upsell', 'frequently_bought_together', 'related');

create table public.product_relationships (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  related_product_id uuid not null references public.products(id) on delete cascade,
  type          relationship_type not null default 'cross_sell',
  position      int not null default 0,
  created_at    timestamptz not null default now(),
  check (product_id <> related_product_id),
  unique (product_id, related_product_id, type)
);

create index product_relationships_product_idx on public.product_relationships(product_id);

-- --- inventory_adjustments ---------------------------------------------------
-- Audit log of stock changes (restock, sale, manual correction, return).
create table public.inventory_adjustments (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  delta         int not null,                        -- +restock / -sale
  reason        text not null,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index inventory_adjustments_product_idx on public.inventory_adjustments(product_id);


-- >>> 0003_reviews_wishlist.sql >>>
-- =============================================================================
-- 0003_reviews_wishlist.sql — Reviews, wishlists, newsletter
-- =============================================================================

-- --- reviews -----------------------------------------------------------------
create table public.reviews (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  user_id       uuid references public.profiles(id) on delete set null,
  author_name   text not null,
  rating        int not null check (rating between 1 and 5),
  title         text,
  body          text,
  is_verified_purchase boolean not null default false,
  status        review_status not null default 'pending',
  helpful_count int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index reviews_product_idx on public.reviews(product_id);
create index reviews_status_idx on public.reviews(status);

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function set_updated_at();

-- Maintain denormalized rating_avg / rating_count on products from APPROVED
-- reviews only, so storefront sorting and the PDP star widget stay fast.
create or replace function recalc_product_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products p
  set rating_avg = coalesce((
        select round(avg(rating)::numeric, 2)
        from public.reviews r
        where r.product_id = target and r.status = 'approved'
      ), 0),
      rating_count = (
        select count(*) from public.reviews r
        where r.product_id = target and r.status = 'approved'
      )
  where p.id = target;
  return null;
end;
$$;

create trigger reviews_recalc_rating
  after insert or update or delete on public.reviews
  for each row execute function recalc_product_rating();

-- --- wishlists ---------------------------------------------------------------
create table public.wishlist_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  product_id    uuid not null references public.products(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (user_id, product_id)
);

create index wishlist_user_idx on public.wishlist_items(user_id);

-- --- newsletter_subscribers --------------------------------------------------
create table public.newsletter_subscribers (
  id            uuid primary key default gen_random_uuid(),
  email         citext not null unique,
  user_id       uuid references public.profiles(id) on delete set null,
  source        text,                                -- 'footer', 'exit_intent', etc.
  is_confirmed  boolean not null default false,
  unsubscribed_at timestamptz,
  created_at    timestamptz not null default now()
);


-- >>> 0004_cart_orders.sql >>>
-- =============================================================================
-- 0004_cart_orders.sql — Carts, cart items, orders, order items
-- =============================================================================

-- --- carts -------------------------------------------------------------------
-- A cart belongs to either a logged-in user OR an anonymous session (token).
-- `email` is captured early (e.g. at checkout step 1 or newsletter) to enable
-- abandoned-cart recovery even before account creation.
create table public.carts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete cascade,
  session_token text,                                 -- anonymous identifier
  email         citext,
  status        cart_status not null default 'active',
  -- Recovery tracking
  abandoned_at  timestamptz,
  recovered_at  timestamptz,
  recovery_emails_sent int not null default 0,
  last_recovery_email_at timestamptz,
  applied_coupon_id uuid,                              -- FK added in 0007
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index carts_user_idx on public.carts(user_id);
create index carts_session_idx on public.carts(session_token);
create index carts_status_idx on public.carts(status);
-- Supports the abandoned-cart cron sweep.
create index carts_abandoned_idx on public.carts(status, abandoned_at)
  where status = 'abandoned';

create trigger carts_set_updated_at
  before update on public.carts
  for each row execute function set_updated_at();

-- --- cart_items --------------------------------------------------------------
-- `bundle_id` (nullable) records which pricing tier was chosen so AOV math and
-- the cart drawer can reconstruct savings. `unit_price_sen` is snapshotted.
create table public.cart_items (
  id            uuid primary key default gen_random_uuid(),
  cart_id       uuid not null references public.carts(id) on delete cascade,
  product_id    uuid not null references public.products(id) on delete cascade,
  bundle_id     uuid references public.bundles(id) on delete set null,
  quantity      int not null check (quantity >= 1),
  unit_price_sen int not null check (unit_price_sen >= 0),
  is_subscription boolean not null default false,
  subscription_interval subscription_interval,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (cart_id, product_id, bundle_id, is_subscription)
);

create index cart_items_cart_idx on public.cart_items(cart_id);

create trigger cart_items_set_updated_at
  before update on public.cart_items
  for each row execute function set_updated_at();

-- --- orders ------------------------------------------------------------------
-- Human-readable order number generated by a sequence (e.g. VL-100001).
create sequence if not exists order_number_seq start 100001;

create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  order_number  text not null unique default ('VL-' || nextval('order_number_seq')),
  user_id       uuid references public.profiles(id) on delete set null,
  email         citext not null,
  status        order_status not null default 'pending',
  payment_status payment_status not null default 'unpaid',
  fulfillment_status fulfillment_status not null default 'unfulfilled',
  -- Monetary breakdown, all in sen.
  subtotal_sen  int not null default 0,
  discount_sen  int not null default 0,
  shipping_sen  int not null default 0,
  tax_sen       int not null default 0,
  total_sen     int not null default 0,
  loyalty_points_redeemed int not null default 0,
  loyalty_points_earned int not null default 0,
  currency      text not null default 'MYR',
  -- Attribution (for CAC / channel analytics).
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  -- Linkages
  coupon_id     uuid,                                  -- FK added in 0007
  subscription_id uuid,                                -- FK added in 0006
  cart_id       uuid references public.carts(id) on delete set null,
  -- Stripe
  stripe_checkout_session_id text,
  stripe_payment_intent_id   text,
  -- Address snapshots (immutable copy at purchase time).
  shipping_address jsonb,
  billing_address  jsonb,
  -- Fulfillment
  tracking_number text,
  tracking_url    text,
  notes         text,
  placed_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index orders_user_idx on public.orders(user_id);
create index orders_status_idx on public.orders(status);
create index orders_payment_status_idx on public.orders(payment_status);
create index orders_created_idx on public.orders(created_at);
create index orders_stripe_session_idx on public.orders(stripe_checkout_session_id);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function set_updated_at();

-- --- order_items -------------------------------------------------------------
-- Snapshots product name/sku/price so historical orders are stable even if the
-- catalog later changes.
create table public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_id    uuid references public.products(id) on delete set null,
  bundle_id     uuid references public.bundles(id) on delete set null,
  product_name  text not null,
  product_sku   text,
  quantity      int not null check (quantity >= 1),
  unit_price_sen int not null check (unit_price_sen >= 0),
  total_sen     int not null check (total_sen >= 0),
  is_subscription boolean not null default false,
  created_at    timestamptz not null default now()
);

create index order_items_order_idx on public.order_items(order_id);
create index order_items_product_idx on public.order_items(product_id);


-- >>> 0005_subscriptions.sql >>>
-- =============================================================================
-- 0005_subscriptions.sql — Recurring subscriptions + items
-- =============================================================================

create table public.subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  status        subscription_status not null default 'active',
  interval      subscription_interval not null default 'monthly',
  discount_percent int not null default 15 check (discount_percent between 0 and 100),
  -- Scheduling
  next_billing_date date,
  paused_until      date,
  skip_next         boolean not null default false,
  cancelled_at      timestamptz,
  cancel_reason     text,
  -- Delivery / payment references (editable from the customer dashboard).
  shipping_address_id uuid references public.addresses(id) on delete set null,
  -- Stripe
  stripe_subscription_id text unique,
  stripe_customer_id     text,
  stripe_price_id        text,
  -- Denormalized totals (sen) for dashboard display.
  recurring_total_sen int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index subscriptions_user_idx on public.subscriptions(user_id);
create index subscriptions_status_idx on public.subscriptions(status);
create index subscriptions_next_billing_idx on public.subscriptions(next_billing_date)
  where status = 'active';

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function set_updated_at();

create table public.subscription_items (
  id            uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  product_id    uuid not null references public.products(id) on delete restrict,
  quantity      int not null check (quantity >= 1),
  unit_price_sen int not null check (unit_price_sen >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index subscription_items_sub_idx on public.subscription_items(subscription_id);

create trigger subscription_items_set_updated_at
  before update on public.subscription_items
  for each row execute function set_updated_at();

-- Now that subscriptions exists, wire the deferred FK from orders.
alter table public.orders
  add constraint orders_subscription_id_fkey
  foreign key (subscription_id) references public.subscriptions(id) on delete set null;


-- >>> 0006_loyalty_referrals.sql >>>
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


-- >>> 0007_coupons.sql >>>
-- =============================================================================
-- 0007_coupons.sql — Coupons / discount codes + redemptions
-- =============================================================================

create table public.coupons (
  id            uuid primary key default gen_random_uuid(),
  code          citext not null unique,
  description   text,
  discount_type discount_type not null,
  -- For 'percentage': 0-100. For 'fixed_amount': value in sen. Ignored for
  -- 'free_shipping'.
  discount_value int not null default 0,
  -- Conditions
  min_order_sen int not null default 0,
  max_discount_sen int,                                -- cap for percentage coupons
  -- Usage limits
  usage_limit   int,                                   -- null = unlimited
  usage_limit_per_user int,
  times_used    int not null default 0,
  -- Scheduling
  starts_at     timestamptz,
  expires_at    timestamptz,
  is_active     boolean not null default true,
  -- Whether auto-generated by abandoned-cart flow.
  is_automatic  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index coupons_active_idx on public.coupons(is_active);

create trigger coupons_set_updated_at
  before update on public.coupons
  for each row execute function set_updated_at();

create table public.coupon_redemptions (
  id            uuid primary key default gen_random_uuid(),
  coupon_id     uuid not null references public.coupons(id) on delete cascade,
  user_id       uuid references public.profiles(id) on delete set null,
  order_id      uuid references public.orders(id) on delete set null,
  discount_sen  int not null default 0,
  created_at    timestamptz not null default now()
);

create index coupon_redemptions_coupon_idx on public.coupon_redemptions(coupon_id);
create index coupon_redemptions_user_idx on public.coupon_redemptions(user_id);

-- Wire the deferred FKs from carts + orders now that coupons exists.
alter table public.carts
  add constraint carts_applied_coupon_id_fkey
  foreign key (applied_coupon_id) references public.coupons(id) on delete set null;

alter table public.orders
  add constraint orders_coupon_id_fkey
  foreign key (coupon_id) references public.coupons(id) on delete set null;


-- >>> 0008_marketing.sql >>>
-- =============================================================================
-- 0008_marketing.sql — Email templates, logs, flows, and editable settings
-- =============================================================================

create type email_flow_key as enum (
  'welcome_series', 'abandoned_cart', 'post_purchase',
  'subscription_reminder', 'win_back', 'referral', 'newsletter'
);

-- Admin-editable templates. `body_html` may contain {{handlebars}}-style
-- variables resolved at send time by the email service.
create table public.email_templates (
  id            uuid primary key default gen_random_uuid(),
  key           text not null unique,                  -- 'abandoned_cart_1h', etc.
  flow          email_flow_key,
  name          text not null,
  subject       text not null,
  preheader     text,
  body_html     text not null,
  body_text     text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger email_templates_set_updated_at
  before update on public.email_templates
  for each row execute function set_updated_at();

-- Defines a marketing automation flow and its (admin-configurable) steps.
-- `steps` is an array of { afterMinutes, templateKey, discountPercent? }.
create table public.email_flows (
  id            uuid primary key default gen_random_uuid(),
  key           email_flow_key not null unique,
  name          text not null,
  is_enabled    boolean not null default true,
  steps         jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger email_flows_set_updated_at
  before update on public.email_flows
  for each row execute function set_updated_at();

-- Send log — deduplicates flow steps (don't email the same cart twice) and
-- powers deliverability analytics.
create table public.email_logs (
  id            uuid primary key default gen_random_uuid(),
  to_email      citext not null,
  user_id       uuid references public.profiles(id) on delete set null,
  template_key  text,
  flow          email_flow_key,
  subject       text,
  related_cart_id uuid references public.carts(id) on delete set null,
  related_order_id uuid references public.orders(id) on delete set null,
  related_subscription_id uuid references public.subscriptions(id) on delete set null,
  provider_message_id text,
  status        text not null default 'sent',          -- sent|failed|opened|clicked
  error         text,
  created_at    timestamptz not null default now()
);

create index email_logs_cart_idx on public.email_logs(related_cart_id);
create index email_logs_flow_idx on public.email_logs(flow);
create index email_logs_user_idx on public.email_logs(user_id);

-- --- settings ----------------------------------------------------------------
-- Single-row-per-key store for admin-tunable platform config (free-shipping
-- threshold overrides, feature flags, store info). Avoids redeploys for ops.
create table public.settings (
  key           text primary key,
  value         jsonb not null,
  description   text,
  updated_at    timestamptz not null default now()
);

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function set_updated_at();


-- >>> 0009_rls.sql >>>
-- =============================================================================
-- 0009_rls.sql — Row Level Security
-- Default-deny: RLS is enabled on every table; access is granted explicitly.
-- The service-role key (server-only) bypasses all of these for trusted ops
-- like webhooks, order creation, and cron jobs.
-- =============================================================================

-- Helper: is the caller the owner of a cart (incl. its items)?
create or replace function owns_cart(cart uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.carts c
    where c.id = cart and c.user_id = auth.uid()
  );
$$;

-- --- profiles ----------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select using (id = auth.uid() or is_staff());
create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: staff manage" on public.profiles
  for all using (is_admin()) with check (is_admin());

-- --- addresses ---------------------------------------------------------------
alter table public.addresses enable row level security;

create policy "addresses: owner all" on public.addresses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "addresses: staff read" on public.addresses
  for select using (is_staff());

-- --- catalog (public read of active rows; staff write) -----------------------
alter table public.categories enable row level security;
create policy "categories: public read" on public.categories
  for select using (is_active or is_staff());
create policy "categories: staff write" on public.categories
  for all using (is_staff()) with check (is_staff());

alter table public.products enable row level security;
create policy "products: public read" on public.products
  for select using (is_active or is_staff());
create policy "products: staff write" on public.products
  for all using (is_staff()) with check (is_staff());

alter table public.product_images enable row level security;
create policy "product_images: public read" on public.product_images
  for select using (true);
create policy "product_images: staff write" on public.product_images
  for all using (is_staff()) with check (is_staff());

alter table public.bundles enable row level security;
create policy "bundles: public read" on public.bundles
  for select using (is_active or is_staff());
create policy "bundles: staff write" on public.bundles
  for all using (is_staff()) with check (is_staff());

alter table public.product_relationships enable row level security;
create policy "relationships: public read" on public.product_relationships
  for select using (true);
create policy "relationships: staff write" on public.product_relationships
  for all using (is_staff()) with check (is_staff());

alter table public.inventory_adjustments enable row level security;
create policy "inventory: staff all" on public.inventory_adjustments
  for all using (is_staff()) with check (is_staff());

-- --- reviews -----------------------------------------------------------------
alter table public.reviews enable row level security;
create policy "reviews: public read approved" on public.reviews
  for select using (status = 'approved' or user_id = auth.uid() or is_staff());
create policy "reviews: user insert own" on public.reviews
  for insert with check (user_id = auth.uid());
create policy "reviews: user edit own" on public.reviews
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reviews: staff manage" on public.reviews
  for all using (is_staff()) with check (is_staff());

-- --- wishlist ----------------------------------------------------------------
alter table public.wishlist_items enable row level security;
create policy "wishlist: owner all" on public.wishlist_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- --- newsletter --------------------------------------------------------------
alter table public.newsletter_subscribers enable row level security;
create policy "newsletter: anyone subscribe" on public.newsletter_subscribers
  for insert with check (true);
create policy "newsletter: staff read" on public.newsletter_subscribers
  for select using (is_staff());

-- --- carts + items (authenticated owners; anonymous carts via service role) --
alter table public.carts enable row level security;
create policy "carts: owner all" on public.carts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "carts: staff read" on public.carts
  for select using (is_staff());

alter table public.cart_items enable row level security;
create policy "cart_items: owner all" on public.cart_items
  for all using (owns_cart(cart_id)) with check (owns_cart(cart_id));

-- --- orders + items (read own; created server-side via service role) ---------
alter table public.orders enable row level security;
create policy "orders: read own" on public.orders
  for select using (user_id = auth.uid() or is_staff());
create policy "orders: staff manage" on public.orders
  for all using (is_staff()) with check (is_staff());

alter table public.order_items enable row level security;
create policy "order_items: read own" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.user_id = auth.uid() or is_staff())
    )
  );
create policy "order_items: staff manage" on public.order_items
  for all using (is_staff()) with check (is_staff());

-- --- subscriptions -----------------------------------------------------------
alter table public.subscriptions enable row level security;
create policy "subs: owner read" on public.subscriptions
  for select using (user_id = auth.uid() or is_staff());
-- Customers may self-serve pause/skip/cancel/address; webhooks (service role)
-- handle status changes from Stripe.
create policy "subs: owner update" on public.subscriptions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "subs: staff manage" on public.subscriptions
  for all using (is_staff()) with check (is_staff());

alter table public.subscription_items enable row level security;
create policy "sub_items: owner read" on public.subscription_items
  for select using (
    exists (
      select 1 from public.subscriptions s
      where s.id = subscription_id and (s.user_id = auth.uid() or is_staff())
    )
  );
create policy "sub_items: staff manage" on public.subscription_items
  for all using (is_staff()) with check (is_staff());

-- --- loyalty -----------------------------------------------------------------
alter table public.loyalty_accounts enable row level security;
create policy "loyalty_acct: owner read" on public.loyalty_accounts
  for select using (user_id = auth.uid() or is_staff());
create policy "loyalty_acct: staff manage" on public.loyalty_accounts
  for all using (is_staff()) with check (is_staff());

alter table public.loyalty_transactions enable row level security;
create policy "loyalty_txn: owner read" on public.loyalty_transactions
  for select using (user_id = auth.uid() or is_staff());
create policy "loyalty_txn: staff manage" on public.loyalty_transactions
  for all using (is_staff()) with check (is_staff());

-- --- referrals ---------------------------------------------------------------
alter table public.referrals enable row level security;
create policy "referrals: referrer read" on public.referrals
  for select using (referrer_id = auth.uid() or is_staff());
create policy "referrals: staff manage" on public.referrals
  for all using (is_staff()) with check (is_staff());

-- --- coupons (validation via SECURITY DEFINER RPC; no public table read) -----
alter table public.coupons enable row level security;
create policy "coupons: staff all" on public.coupons
  for all using (is_staff()) with check (is_staff());

alter table public.coupon_redemptions enable row level security;
create policy "coupon_redemptions: owner read" on public.coupon_redemptions
  for select using (user_id = auth.uid() or is_staff());
create policy "coupon_redemptions: staff manage" on public.coupon_redemptions
  for all using (is_staff()) with check (is_staff());

-- --- marketing (staff only) --------------------------------------------------
alter table public.email_templates enable row level security;
create policy "email_templates: staff all" on public.email_templates
  for all using (is_staff()) with check (is_staff());

alter table public.email_flows enable row level security;
create policy "email_flows: staff all" on public.email_flows
  for all using (is_staff()) with check (is_staff());

alter table public.email_logs enable row level security;
create policy "email_logs: staff all" on public.email_logs
  for all using (is_staff()) with check (is_staff());

alter table public.settings enable row level security;
create policy "settings: staff all" on public.settings
  for all using (is_staff()) with check (is_staff());


-- >>> 0010_functions.sql >>>
-- =============================================================================
-- 0010_functions.sql — Callable business RPCs
-- =============================================================================

-- Validate a coupon code against an order subtotal and return the computed
-- discount. SECURITY DEFINER so customers can validate codes without SELECT
-- access to the coupons table (prevents code enumeration). Returns:
--   { valid: bool, reason: text, coupon_id: uuid, discount_type: text,
--     discount_sen: int, free_shipping: bool }
create or replace function validate_coupon(
  p_code text,
  p_subtotal_sen int
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  c public.coupons%rowtype;
  v_discount int := 0;
  v_uses_by_user int := 0;
begin
  select * into c from public.coupons
  where code = p_code and is_active = true;

  if not found then
    return jsonb_build_object('valid', false, 'reason', 'Invalid code');
  end if;

  if c.starts_at is not null and c.starts_at > now() then
    return jsonb_build_object('valid', false, 'reason', 'Not yet active');
  end if;
  if c.expires_at is not null and c.expires_at < now() then
    return jsonb_build_object('valid', false, 'reason', 'Expired');
  end if;
  if p_subtotal_sen < c.min_order_sen then
    return jsonb_build_object('valid', false, 'reason', 'Minimum order not met');
  end if;
  if c.usage_limit is not null and c.times_used >= c.usage_limit then
    return jsonb_build_object('valid', false, 'reason', 'Usage limit reached');
  end if;

  if c.usage_limit_per_user is not null and auth.uid() is not null then
    select count(*) into v_uses_by_user
    from public.coupon_redemptions
    where coupon_id = c.id and user_id = auth.uid();
    if v_uses_by_user >= c.usage_limit_per_user then
      return jsonb_build_object('valid', false, 'reason', 'Already redeemed');
    end if;
  end if;

  if c.discount_type = 'percentage' then
    v_discount := floor(p_subtotal_sen * c.discount_value / 100.0);
    if c.max_discount_sen is not null then
      v_discount := least(v_discount, c.max_discount_sen);
    end if;
  elsif c.discount_type = 'fixed_amount' then
    v_discount := least(c.discount_value, p_subtotal_sen);
  end if;

  return jsonb_build_object(
    'valid', true,
    'coupon_id', c.id,
    'discount_type', c.discount_type,
    'discount_sen', v_discount,
    'free_shipping', (c.discount_type = 'free_shipping')
  );
end;
$$;

-- Compute the next billing date for a subscription interval from a base date.
create or replace function next_billing_date(
  p_from date,
  p_interval subscription_interval
)
returns date
language sql
immutable
as $$
  select case p_interval
    when 'monthly' then p_from + interval '1 month'
    when 'quarterly' then p_from + interval '3 months'
  end::date;
$$;

-- Decrement product stock atomically when an order is paid; logs the
-- adjustment. Called server-side from the Stripe webhook (service role).
create or replace function decrement_stock(p_product_id uuid, p_qty int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
  set stock_quantity = greatest(stock_quantity - p_qty, 0)
  where id = p_product_id and track_inventory = true;

  insert into public.inventory_adjustments (product_id, delta, reason)
  values (p_product_id, -p_qty, 'order_sale');
end;
$$;


-- >>> seed.sql >>>
-- =============================================================================
-- seed.sql — Demo catalog + marketing config.
-- Compliance note: all copy uses structure/function language ("supports",
-- "helps maintain"). No disease-treatment or "cure"/"guaranteed" claims.
-- Run with `supabase db reset` (applies migrations then this seed).
-- =============================================================================

-- --- categories --------------------------------------------------------------
insert into public.categories (id, slug, name, description, meta_title, meta_description, position) values
  ('11111111-1111-1111-1111-111111111101', 'performance', 'Performance',
   'Formulas to support training, strength, and recovery.',
   'Performance Supplements | Vitalis', 'Support your training and recovery with science-backed performance supplements.', 1),
  ('11111111-1111-1111-1111-111111111102', 'wellness', 'Daily Wellness',
   'Everyday essentials to support overall wellbeing.',
   'Daily Wellness Supplements | Vitalis', 'Everyday vitamins and essentials to support your overall wellbeing.', 2),
  ('11111111-1111-1111-1111-111111111103', 'sleep-recovery', 'Sleep & Recovery',
   'Support restful sleep and day-to-day recovery.',
   'Sleep & Recovery Supplements | Vitalis', 'Support restful sleep and recovery with our calming formulas.', 3);

-- --- products ----------------------------------------------------------------
insert into public.products
  (id, slug, sku, name, subtitle, description, category_id, price_sen, compare_at_price_sen, cost_sen,
   ingredients, benefits, usage_instructions, is_featured, is_best_seller, stock_quantity, low_stock_threshold,
   meta_title, meta_description)
values
  ('22222222-2222-2222-2222-222222222201', 'whey-protein-isolate', 'VL-WHEY-001',
   'Whey Protein Isolate', '27g protein • low lactose',
   'A clean, fast-absorbing whey protein isolate to support muscle recovery and daily protein intake.',
   '11111111-1111-1111-1111-111111111101', 9900, 12900, 4200,
   'Whey protein isolate, natural cocoa, stevia leaf extract, sunflower lecithin.',
   '["Supports muscle recovery", "27g protein per serving", "Low in lactose and sugar"]'::jsonb,
   'Mix one scoop with 250ml of water or milk. Take 1–2 servings daily.',
   true, true, 140, 20,
   'Whey Protein Isolate | Vitalis', 'Clean 27g whey protein isolate to support muscle recovery. Low lactose, low sugar.'),

  ('22222222-2222-2222-2222-222222222202', 'creatine-monohydrate', 'VL-CREA-001',
   'Creatine Monohydrate', 'Micronized • 5g per serving',
   'Pure micronized creatine monohydrate to support strength and high-intensity performance.',
   '11111111-1111-1111-1111-111111111101', 9900, null, 2800,
   '100% micronized creatine monohydrate.',
   '["Supports strength output", "5g pure creatine", "Unflavored, mixes easily"]'::jsonb,
   'Mix one 5g scoop with water or your favourite beverage daily.',
   true, true, 200, 20,
   'Creatine Monohydrate | Vitalis', 'Micronized 5g creatine monohydrate to support strength and performance.'),

  ('22222222-2222-2222-2222-222222222203', 'daily-multivitamin', 'VL-MULTI-001',
   'Daily Multivitamin', '23 vitamins & minerals',
   'A comprehensive daily multivitamin to help fill nutritional gaps and support overall wellbeing.',
   '11111111-1111-1111-1111-111111111102', 9900, 11900, 3100,
   'Vitamins A, C, D, E, K, B-complex, zinc, magnesium, selenium, iodine.',
   '["Supports immune function", "Helps fill dietary gaps", "Once-daily convenience"]'::jsonb,
   'Take one capsule daily with food.',
   false, true, 95, 15,
   'Daily Multivitamin | Vitalis', '23 essential vitamins and minerals to support everyday wellbeing.'),

  ('22222222-2222-2222-2222-222222222204', 'omega-3-fish-oil', 'VL-OMEGA-001',
   'Omega-3 Fish Oil', '1000mg EPA/DHA',
   'High-purity omega-3 fish oil to support heart, brain, and joint health.',
   '11111111-1111-1111-1111-111111111102', 9900, null, 3300,
   'Fish oil concentrate (EPA, DHA), gelatin softgel, mixed tocopherols.',
   '["Supports heart and brain health", "1000mg EPA/DHA", "Molecularly distilled for purity"]'::jsonb,
   'Take two softgels daily with food.',
   false, false, 8, 15,
   'Omega-3 Fish Oil | Vitalis', 'High-purity 1000mg omega-3 to support heart, brain, and joint health.'),

  ('22222222-2222-2222-2222-222222222205', 'magnesium-glycinate', 'VL-MAG-001',
   'Magnesium Glycinate', 'Gentle • highly absorbable',
   'A gentle, highly absorbable form of magnesium to support muscle relaxation and restful sleep.',
   '11111111-1111-1111-1111-111111111103', 9900, null, 2600,
   'Magnesium bisglycinate chelate, vegetable capsule.',
   '["Supports muscle relaxation", "Supports restful sleep", "Gentle on the stomach"]'::jsonb,
   'Take two capsules in the evening with water.',
   true, false, 60, 15,
   'Magnesium Glycinate | Vitalis', 'Gentle, highly absorbable magnesium glycinate to support relaxation and sleep.'),

  ('22222222-2222-2222-2222-222222222206', 'ashwagandha-ksm66', 'VL-ASH-001',
   'Ashwagandha KSM-66', '600mg standardized extract',
   'A clinically studied ashwagandha extract to support the body''s response to everyday stress.',
   '11111111-1111-1111-1111-111111111103', 9900, 10900, 2900,
   'KSM-66 ashwagandha root extract (standardized to 5% withanolides).',
   '["Supports stress resilience", "600mg standardized extract", "Supports calm focus"]'::jsonb,
   'Take one capsule daily, or as directed.',
   false, false, 75, 15,
   'Ashwagandha KSM-66 | Vitalis', 'Clinically studied 600mg ashwagandha to support the body''s response to stress.');

-- --- product images (placeholder photography from Unsplash) ------------------
insert into public.product_images (product_id, url, alt, position, is_primary)
select id,
       'https://images.unsplash.com/photo-1556227702-d1e4e7b5c232?w=800&q=80',
       name || ' product image', 0, true
from public.products;

-- --- bundles (the RM99 / RM179 / RM249 ladder for every product) -------------
insert into public.bundles (product_id, quantity, price_sen, label, position)
select p.id, t.quantity, t.price_sen, t.label, t.position
from public.products p
cross join (values
  (1, 9900, null, 0),
  (2, 17900, 'Most Popular', 1),
  (3, 24900, 'Best Value', 2)
) as t(quantity, price_sen, label, position);

-- --- cross-sell relationships ------------------------------------------------
-- Whey + Creatine + Magnesium = classic training stack.
insert into public.product_relationships (product_id, related_product_id, type, position) values
  ('22222222-2222-2222-2222-222222222201', '22222222-2222-2222-2222-222222222202', 'frequently_bought_together', 0),
  ('22222222-2222-2222-2222-222222222201', '22222222-2222-2222-2222-222222222205', 'cross_sell', 1),
  ('22222222-2222-2222-2222-222222222202', '22222222-2222-2222-2222-222222222201', 'frequently_bought_together', 0),
  ('22222222-2222-2222-2222-222222222205', '22222222-2222-2222-2222-222222222206', 'cross_sell', 0),
  ('22222222-2222-2222-2222-222222222203', '22222222-2222-2222-2222-222222222204', 'cross_sell', 0),
  ('22222222-2222-2222-2222-222222222206', '22222222-2222-2222-2222-222222222205', 'frequently_bought_together', 0);

-- --- approved reviews (drive social proof + rating averages via trigger) -----
insert into public.reviews (product_id, author_name, rating, title, body, is_verified_purchase, status) values
  ('22222222-2222-2222-2222-222222222201', 'Aisyah R.', 5, 'Mixes perfectly', 'No clumps and tastes great. Part of my daily routine now.', true, 'approved'),
  ('22222222-2222-2222-2222-222222222201', 'Daniel T.', 4, 'Solid protein', 'Good value and light on the stomach.', true, 'approved'),
  ('22222222-2222-2222-2222-222222222202', 'Wei Ming', 5, 'Does the job', 'Unflavored and dissolves easily. Noticed better gym sessions.', true, 'approved'),
  ('22222222-2222-2222-2222-222222222203', 'Priya S.', 5, 'Easy daily habit', 'One capsule a day, no aftertaste.', true, 'approved'),
  ('22222222-2222-2222-2222-222222222205', 'Hafiz', 5, 'Sleep improved', 'Gentle and helps me wind down at night.', true, 'approved'),
  ('22222222-2222-2222-2222-222222222206', 'Mei Ling', 4, 'Feeling calmer', 'A few weeks in and I feel more balanced during busy days.', false, 'approved');

-- --- coupons -----------------------------------------------------------------
insert into public.coupons (code, description, discount_type, discount_value, min_order_sen, max_discount_sen, usage_limit_per_user, is_active) values
  ('WELCOME10', '10% off your first order', 'percentage', 10, 0, 5000, 1, true),
  ('FREESHIP', 'Free shipping on any order', 'free_shipping', 0, 0, null, null, true),
  ('SAVE20', 'RM20 off orders over RM150', 'fixed_amount', 2000, 15000, null, null, true);

-- --- email flows (admin-configurable steps) ----------------------------------
insert into public.email_flows (key, name, is_enabled, steps) values
  ('abandoned_cart', 'Abandoned Cart Recovery', true,
   '[{"afterMinutes":60,"templateKey":"abandoned_cart_1h"},
     {"afterMinutes":1440,"templateKey":"abandoned_cart_24h"},
     {"afterMinutes":2880,"templateKey":"abandoned_cart_48h","discountPercent":10}]'::jsonb),
  ('welcome_series', 'Welcome Series', true,
   '[{"afterMinutes":0,"templateKey":"welcome_1"},
     {"afterMinutes":2880,"templateKey":"welcome_2"}]'::jsonb),
  ('post_purchase', 'Post Purchase', true,
   '[{"afterMinutes":60,"templateKey":"post_purchase_thanks"}]'::jsonb),
  ('subscription_reminder', 'Subscription Reminder', true,
   '[{"afterMinutes":4320,"templateKey":"sub_upcoming"}]'::jsonb),
  ('win_back', 'Win-back Campaign', true,
   '[{"afterMinutes":86400,"templateKey":"win_back_1","discountPercent":15}]'::jsonb);

insert into public.email_templates (key, flow, name, subject, preheader, body_html) values
  ('abandoned_cart_1h', 'abandoned_cart', 'Abandoned Cart — 1 hour',
   'You left something behind 👀', 'Your cart is waiting',
   '<p>Hi {{first_name}},</p><p>You left some items in your cart. Complete your order before they sell out.</p><p><a href="{{cart_url}}">Return to cart</a></p>'),
  ('abandoned_cart_24h', 'abandoned_cart', 'Abandoned Cart — 24 hours',
   'Still thinking it over?', 'Your cart is still saved',
   '<p>Hi {{first_name}},</p><p>Your cart is still saved. Here''s what you picked:</p>{{cart_items}}<p><a href="{{cart_url}}">Checkout now</a></p>'),
  ('abandoned_cart_48h', 'abandoned_cart', 'Abandoned Cart — 48 hours (discount)',
   'Here''s 10% off to complete your order', 'A little something to help you decide',
   '<p>Hi {{first_name}},</p><p>Use code <strong>{{discount_code}}</strong> for 10% off your cart.</p><p><a href="{{cart_url}}">Complete order</a></p>'),
  ('welcome_1', 'welcome_series', 'Welcome #1', 'Welcome to Vitalis 🌿', 'Glad you''re here',
   '<p>Welcome, {{first_name}}! Here''s 10% off your first order with code WELCOME10.</p>'),
  ('welcome_2', 'welcome_series', 'Welcome #2', 'Find your routine', 'Our best sellers',
   '<p>Not sure where to start? Here are our most-loved formulas.</p>'),
  ('post_purchase_thanks', 'post_purchase', 'Post Purchase Thanks', 'Thanks for your order!', 'Order confirmed',
   '<p>Thanks {{first_name}}! Your order {{order_number}} is confirmed.</p>'),
  ('sub_upcoming', 'subscription_reminder', 'Subscription Upcoming', 'Your next delivery is on the way soon', 'Manage anytime',
   '<p>Hi {{first_name}}, your subscription renews on {{next_billing_date}}. <a href="{{manage_url}}">Manage</a></p>'),
  ('win_back', 'win_back', 'Win-back', 'We miss you — 15% off', 'Come back for more',
   '<p>It''s been a while, {{first_name}}. Here''s 15% off to restock with code {{discount_code}}.</p>');

-- --- settings ----------------------------------------------------------------
insert into public.settings (key, value, description) values
  ('store', '{"name":"Vitalis","email":"hello@vitalis.example","phone":"+60 3-0000 0000"}'::jsonb, 'Store contact info'),
  ('shipping', '{"freeThresholdSen":20000,"flatFeeSen":1000}'::jsonb, 'Shipping rules'),
  ('features', '{"exitIntentPopup":true,"recentPurchasePopup":true,"countdownTimer":true}'::jsonb, 'CRO feature flags');

