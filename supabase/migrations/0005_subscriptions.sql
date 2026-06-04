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
