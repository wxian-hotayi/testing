/**
 * Edge-safe fixed-window rate limiter.
 *
 * Dependency-free and runtime-agnostic (no Node APIs) so it runs in Next.js
 * middleware (Edge runtime). Pure logic with an injectable clock for testing.
 *
 * ⚠️ Backed by an in-process Map — counts are **per server instance** and reset
 * on cold start. That throttles abuse from a single instance but is NOT a
 * globally-consistent limit across a serverless fleet. For production-grade
 * distributed limiting, swap the store for a shared backend (Upstash Redis /
 * Vercel KV) behind the same `checkRateLimit` shape. Tracked in
 * docs/GO_LIVE_CHECKLIST.md.
 */

export type RateRule = { limit: number; windowMs: number };

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
  retryAfterSec: number;
};

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();
const MAX_KEYS = 10_000; // prune ceiling to bound memory on an instance

/** Remove expired windows (and hard-cap total keys) to bound memory. */
function prune(now: number): void {
  if (store.size < MAX_KEYS) {
    return;
  }
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}

/**
 * Record a hit for `key` under `rule` and report whether it's allowed.
 * `now` is injectable for deterministic tests.
 */
export function checkRateLimit(key: string, rule: RateRule, now: number = Date.now()): RateLimitResult {
  prune(now);
  let entry = store.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + rule.windowMs };
    store.set(key, entry);
  }
  entry.count += 1;

  const remaining = Math.max(0, rule.limit - entry.count);
  const resetMs = Math.max(0, entry.resetAt - now);
  return {
    ok: entry.count <= rule.limit,
    limit: rule.limit,
    remaining,
    resetMs,
    retryAfterSec: Math.ceil(resetMs / 1000),
  };
}

/** Test-only: clear all windows. */
export function __resetRateLimitStore(): void {
  store.clear();
}
