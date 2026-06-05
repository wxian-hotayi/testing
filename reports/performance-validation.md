# Performance Validation — Phase 8

**Date:** 2026-06-05 · **Status: NOT VALIDATED**

## Why
Lighthouse requires a headless-browser audit driver + a running app, and there is
no Lighthouse tooling available to me in this environment (and no interactive
browser to capture scores). I will not invent Performance/SEO/Accessibility
numbers.

| Page | Performance | SEO | Accessibility |
|---|---|---|---|
| Homepage | NOT VALIDATED | NOT VALIDATED | NOT VALIDATED |
| Product page | NOT VALIDATED | NOT VALIDATED | NOT VALIDATED |
| Checkout | NOT VALIDATED | NOT VALIDATED | NOT VALIDATED |

## Known risk (carried forward)
MT-6 made the **entire storefront dynamic** (per-Host tenant resolution), so
homepage/PDP/category are server-rendered per request rather than SSG/ISR. This
is a **real risk to a Performance ≥ 90 target** and should be measured + likely
mitigated (SSG-per-store via middleware path-rewrite, or route/data caching) —
see docs/MULTITENANCY.md (MT-6 deferred items).

## To validate
Against staging: `npx lighthouse <url> --only-categories=performance,seo,accessibility --output=json`
for each page (or Lighthouse CI / PageSpeed Insights), and record the scores
here.
