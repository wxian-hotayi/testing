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
