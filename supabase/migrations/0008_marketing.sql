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
