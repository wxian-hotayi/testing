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
