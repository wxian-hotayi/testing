import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, __resetRateLimitStore } from './limiter';

const RULE = { limit: 3, windowMs: 1000 };

describe('checkRateLimit', () => {
  beforeEach(() => __resetRateLimitStore());

  it('allows up to the limit, then blocks within the window', () => {
    const now = 1_000_000;
    expect(checkRateLimit('ip:a', RULE, now).ok).toBe(true); // 1
    expect(checkRateLimit('ip:a', RULE, now).ok).toBe(true); // 2
    const third = checkRateLimit('ip:a', RULE, now);
    expect(third.ok).toBe(true); // 3 (at limit)
    expect(third.remaining).toBe(0);
    const fourth = checkRateLimit('ip:a', RULE, now);
    expect(fourth.ok).toBe(false); // 4 → blocked
    expect(fourth.retryAfterSec).toBeGreaterThan(0);
  });

  it('resets after the window elapses', () => {
    const now = 2_000_000;
    for (let i = 0; i < 3; i++) checkRateLimit('ip:b', RULE, now);
    expect(checkRateLimit('ip:b', RULE, now).ok).toBe(false);
    // Advance past the window.
    expect(checkRateLimit('ip:b', RULE, now + 1001).ok).toBe(true);
  });

  it('tracks keys independently', () => {
    const now = 3_000_000;
    for (let i = 0; i < 3; i++) checkRateLimit('ip:c', RULE, now);
    expect(checkRateLimit('ip:c', RULE, now).ok).toBe(false);
    // A different key is unaffected.
    expect(checkRateLimit('ip:d', RULE, now).ok).toBe(true);
  });

  it('reports remaining count', () => {
    const now = 4_000_000;
    expect(checkRateLimit('ip:e', RULE, now).remaining).toBe(2);
    expect(checkRateLimit('ip:e', RULE, now).remaining).toBe(1);
    expect(checkRateLimit('ip:e', RULE, now).remaining).toBe(0);
  });
});
