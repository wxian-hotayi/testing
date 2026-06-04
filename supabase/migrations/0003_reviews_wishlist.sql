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
