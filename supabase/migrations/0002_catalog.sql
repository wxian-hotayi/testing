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
