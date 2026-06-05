import { test, expect } from '@playwright/test';
import { TENANCY, roleCreds, storeOrigin, loginAt, pathOf } from './helpers';

/**
 * Store-isolation coverage against a real environment. Requires two live stores
 * and a store-A admin account (member of A only):
 *   E2E_ROOT_DOMAIN, E2E_STORE_A_SLUG, E2E_STORE_B_SLUG,
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (admin of store A, NOT a member of B,
 *   and NOT a global profiles.role='admin' — see the legacy-fallback caveat in
 *   docs/TESTING.md).
 *
 * Proves a store-A operator cannot view or act on store B's admin surface.
 */
test.describe('store isolation (A cannot reach B)', () => {
  test.beforeEach(() => {
    test.skip(
      !TENANCY.rootDomain || !TENANCY.storeA || !TENANCY.storeB || !roleCreds('admin'),
      'Set E2E_ROOT_DOMAIN + E2E_STORE_A_SLUG + E2E_STORE_B_SLUG + E2E_ADMIN_*.',
    );
  });

  test('store-A admin operates A but is blocked from B admin', async ({ page }) => {
    const admin = roleCreds('admin')!;
    const aOrigin = storeOrigin(TENANCY.storeA);
    const bOrigin = storeOrigin(TENANCY.storeB);

    await loginAt(page, aOrigin, admin.email, admin.password);

    // Can operate store A.
    await page.goto(`${aOrigin}/admin/products`);
    expect(pathOf(page), 'A admin reaches A products').toBe('/admin/products');

    // Blocked from store B's admin (not a member of B → layout redirects away).
    await page.goto(`${bOrigin}/admin/products`);
    expect(pathOf(page), 'A admin must be redirected out of B admin').not.toBe('/admin/products');
  });

  test('store-A admin cannot read store B members via the API', async ({ page }) => {
    const admin = roleCreds('admin')!;
    await loginAt(page, storeOrigin(TENANCY.storeA), admin.email, admin.password);

    // The API resolves the store from the request Host. Called against B's
    // origin, an A-only admin must be rejected (not a member of B).
    const res = await page.request.get(`${storeOrigin(TENANCY.storeB)}/api/admin/members`);
    expect([401, 403], `status was ${res.status()}`).toContain(res.status());
  });
});
