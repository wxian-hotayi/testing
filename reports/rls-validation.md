# RLS Validation — Phase 3

**Date:** 2026-06-05 · **Method:** `infra-validate` Gate 4 — real anon vs
service-role row-count probes against the live project.

## Results

> **Correction (MT-11):** an earlier draft reported `store_members` as "no rows"
> — actually the **table is MISSING** (migrations not applied). Masked by the
> same `head:true` validator bug, now fixed. Corrected results below.

| Client | Check | Status | Evidence |
|---|---|---|---|
| service-role | reaches DB / reads base data | **PASS** | authenticated PostgREST response |
| anonymous | cannot read `orders` | **NOT VALIDATED** | `orders: no rows exist (service=0)` — inconclusive without data |
| anonymous | cannot read `store_members` | **❌ FAIL (cannot test)** | `store_members: table MISSING — apply migrations` |
| authenticated | cannot access another tenant | **NOT VALIDATED** | requires authed sessions (see tenant-isolation report) |

## Captured output (verbatim, corrected validator)

```
❌ FAIL  GATE 4 — RLS Validation
        ⚠ orders: no rows exist (service=0) — cannot prove RLS without seeded data.
        ❌ store_members: table MISSING — RLS cannot be tested (apply migrations).
```

## Method note (no fabrication)

The probe compares what an **anon** client sees vs a **service-role** client. RLS
is proven only when service-role sees rows AND anon sees zero. Here the target
has **no rows** in `orders`/`store_members`, so anon-sees-zero is *inconclusive*
(it could be RLS, or simply no data) — reported honestly as **WARNING / NOT
VALIDATED**, not PASS.

## To validate properly
Seed ≥1 order and ≥1 store_member in staging, then re-run: a true PASS requires
`service > 0 AND anon = 0`. The RLS *policies* themselves exist in the migrations
(static-verified by the GO-LIVE gate, Gate 1), but their **runtime enforcement on
real rows is NOT YET PROVEN**.
