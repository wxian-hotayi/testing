# Schema Remediation — Phase 1 (MT-11)

**Date:** 2026-06-05 · **Target:** Supabase `https://<project-ref>.supabase.co`
(from `.env.local`) · **Method:** read-only column/table fingerprint +
`npm run infra-validate` (after fixing a validator bug, below).

## Root cause

**None of the multi-tenant migrations `0011–0015` are applied** to this
environment — it carries only the base schema (`0001–0010`). This is broader than
"0012 missing": the entire tenancy/RBAC/payments-idempotency layer is absent.

### Evidence (real probes, project ref redacted)
Column/table fingerprint (`select … limit 1`, GET — surfaces real errors):

```
0011  TABLE MISSING     stores
0011  COLUMN MISSING    profiles.is_platform_admin
0012  COLUMN MISSING    products.store_id / orders.store_id / coupons.store_id
0014  TABLE MISSING     store_members / store_invitations / membership_audit
```

Corrected `infra-validate`:
```
✅ PASS  GATE 1 Supabase Connectivity   (reached + authenticated)
❌ FAIL  GATE 2 Migration State/Tables   MISSING: stores, store_members, store_invitations, membership_audit
❌ FAIL  GATE 3 Database Structure       store_id MISSING on products, categories, orders, order_items, coupons, carts, reviews, subscriptions
❌ FAIL  GATE 4 RLS                      store_members table MISSING — cannot test
```

> **Why MT-10 first said "All 10 tables present" (correction):** that was a
> **false positive** — `infra-validate` Gate 2 used a `head:true` (HEAD) request,
> which returns no body, so PostgREST's "table not found" error was lost. Fixed:
> existence is now probed with a real `GET` (commit in this change). The MT-10
> database/RLS reports have been corrected accordingly.
>
> The exact migration **ledger** still can't be read via PostgREST (it lives in
> `supabase_migrations.schema_migrations`) → **NOT VALIDATED via API**; the
> column/table fingerprint is nonetheless definitive that the effects are absent.

## Affected (everything the MT migrations add)
- **0011** — `stores`, `store_members`, `profiles.is_platform_admin`, tenancy RLS helpers — **absent**.
- **0012** — `store_id` on 20 commerce tables, per-store unique keys, store-scoped RLS, loyalty PK — **absent**.
- **0013** — departmental `store_member_role` enum values — **absent**.
- **0014** — `store_invitations`, `membership_audit`, member lifecycle — **absent**.
- **0015** — `unique(orders.stripe_checkout_session_id)` idempotency index — **absent**.

## Remediation plan

**Preferred — clean staging (recommended):**
```bash
# Against a fresh staging project (see .env.staging.example):
supabase link --project-ref <staging-ref>
supabase db push            # applies 0001–0015 in order
npm run db:types            # regenerate types from the live schema
npm run infra-validate -- --target=staging   # Gates 1–3 should now PASS
psql "$SUPABASE_DB_URL" -f reports/verify-schema.sql   # (optional) index/constraint proof
```

**In-place forward-migration (existing dev project):**
```bash
supabase db push            # applies the pending 0011–0015
```
The MT migrations are written **idempotently** (`add column if not exists`,
`create … if not exists`, `add value if not exists`), so applying them is safe
even if partially present.

**Verification SQL** (run in the SQL editor / psql — closes the API-blind spots):
```sql
-- tables
select table_name from information_schema.tables
 where table_schema='public'
   and table_name in ('stores','store_members','store_invitations','membership_audit');
-- store_id columns
select table_name from information_schema.columns
 where table_schema='public' and column_name='store_id'
 order by table_name;
-- idempotency unique index (0015)
select indexname from pg_indexes
 where tablename='orders' and indexdef ilike '%unique%stripe_checkout_session_id%';
```

## Rollback plan
Migrations are additive. Preferred rollback = **restore from backup** (clean).
Manual (non-prod only):
```sql
drop table if exists public.membership_audit, public.store_invitations,
                     public.store_members, public.stores cascade;
alter table public.products drop column if exists store_id;  -- repeat per commerce table
drop index if exists orders_stripe_session_unique;
-- NOTE: Postgres enum values added in 0013 cannot be dropped — leave them, or
-- restore from backup for a fully clean revert.
```
Never run manual rollback against production without a verified backup.

## Status
**Schema = FAIL (no MT migrations applied).** Remediation is prepared but **NOT
applied by me** — applying schema to an environment I did not provision is the
team's action. Re-validate after `db push` on staging.
