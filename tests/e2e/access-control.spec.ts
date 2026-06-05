import { test, expect } from '@playwright/test';

/**
 * Access-control E2E — runs WITHOUT seeded data or auth (only the app server).
 * Proves the security boundaries hold for unauthenticated callers: gated route
 * groups redirect to login, and the privileged API routes reject the request.
 */
test.describe('access control (unauthenticated)', () => {
  test('/account redirects to /login', async ({ page }) => {
    await page.goto('/account');
    await expect(page).toHaveURL(/\/login/);
  });

  test('/admin redirects to /login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('/admin/members redirects to /login', async ({ page }) => {
    await page.goto('/admin/members');
    await expect(page).toHaveURL(/\/login/);
  });

  test('GET /api/admin/members is forbidden without auth', async ({ request }) => {
    const res = await request.get('/api/admin/members');
    expect([401, 403]).toContain(res.status());
  });

  test('GET /api/stores/slug-available requires auth', async ({ request }) => {
    const res = await request.get('/api/stores/slug-available?slug=acme');
    expect(res.status()).toBe(401);
  });

  test('cron endpoint rejects calls without the secret', async ({ request }) => {
    const res = await request.get('/api/cron/abandoned-carts');
    // 401 (secret configured, wrong/absent) or 500 (secret not configured) —
    // either way it never runs unauthenticated.
    expect([401, 500]).toContain(res.status());
  });
});
