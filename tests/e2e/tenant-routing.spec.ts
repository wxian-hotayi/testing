import { test, expect } from '@playwright/test';
import { E2E } from './helpers';

/**
 * Subdomain tenant routing (MT-6). Requires a live tenancy schema + a configured
 * root domain, so each test self-skips unless E2E_ROOT_DOMAIN is set. Locally,
 * set E2E_ROOT_DOMAIN=localhost:3000 (Chrome resolves *.localhost).
 */
test.describe('subdomain tenant routing (MT-6)', () => {
  test('an unknown store subdomain returns 404', async ({ page }) => {
    test.skip(!E2E.rootDomain, 'Set E2E_ROOT_DOMAIN (+ live tenancy) to run.');
    const host = `unknown-${Date.now()}.${E2E.rootDomain}`;
    const res = await page.goto(`http://${host}/`);
    expect(res?.status(), `GET http://${host}/`).toBe(404);
  });

  test('a known store subdomain renders the storefront', async ({ page }) => {
    test.skip(!E2E.rootDomain || !E2E.storeSlug, 'Set E2E_ROOT_DOMAIN + E2E_STORE_SLUG to run.');
    const res = await page.goto(`http://${E2E.storeSlug}.${E2E.rootDomain}/`);
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
