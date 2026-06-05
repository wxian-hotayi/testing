# Database Validation — Phase 2 (corrected MT-11)

**Date:** 2026-06-05 · **Method:** `npm run infra-validate` (read-only) +
column/table fingerprint against the Supabase project in `.env.local`
(`https://<project-ref>.supabase.co`). Migrations were NOT applied by this run.

> **Correction notice:** an earlier MT-10 draft of this report said "All 10
> tables present" — that was a **false positive** caused by an `infra-validate`
> bug (`head:true` HEAD requests drop PostgREST's error body, masking missing
> tables). The bug is fixed (existence now probed via GET). The corrected results
> are below. See reports/schema-remediation.md.

## Results

| Check | Status | Evidence |
|---|---|---|
| Supabase connectivity (service role) | **PASS** | `Reached … with the service-role key (authenticated response).` |
| Tenancy tables exist (`stores`, `store_members`, `store_invitations`, `membership_audit`) | **❌ FAIL** | `MISSING tables: stores, store_members, store_invitations, membership_audit` |
| `store_id` on commerce tables | **❌ FAIL** | `store_id MISSING on: products, categories, orders, order_items, coupons, carts, reviews, subscriptions` |
| Base tables exist (products, orders, coupons, …) | **PASS** | queryable (0001–0010 schema present) |
| Migration ledger 0011–0015 applied | **❌ FAIL (effects absent)** | fingerprint shows all MT-migration effects missing; ledger itself NOT VALIDATED via API |
| Indexes + `unique(stripe_checkout_session_id)` (0015) | **NOT VALIDATED** | needs SQL on `pg_indexes`/`pg_constraint` |
| Foreign keys | **NOT VALIDATED** | needs SQL |

## Captured output (verbatim, ref redacted)
```
✅ PASS  GATE 1 — Supabase Connectivity
❌ FAIL  GATE 2 — Migration State / Tables
        ❌ MISSING tables: stores, store_members, store_invitations, membership_audit
❌ FAIL  GATE 3 — Database Structure (store_id)
        store_id MISSING on: products, categories, orders, order_items, coupons, carts, reviews, subscriptions
```

## Finding (critical)
**None of migrations `0011–0015` are applied** — the environment has only the
base `0001–0010` schema. The entire multi-tenant / RBAC / membership /
idempotency layer is absent. **Status: FAIL.**

Remediation (apply migrations on a clean staging project, then re-verify) is in
**reports/schema-remediation.md**.
