-- =============================================================================
-- 0015_idempotency.sql — Order idempotency hardening (MT-7 validation finding)
--
-- A Stripe Checkout Session maps to AT MOST one order. The webhook guards with a
-- read-then-insert (finalizeOrderFromSession), but without a DB constraint two
-- racing duplicate deliveries could both pass the check and create two orders.
-- This unique index makes the second insert fail; the webhook retry then finds
-- the existing order and returns created:false. Partial (NULL session ids — e.g.
-- manually created orders — are exempt and may repeat).
-- =============================================================================

create unique index if not exists orders_stripe_session_unique
  on public.orders(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
