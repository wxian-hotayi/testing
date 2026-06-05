import { type Page } from '@playwright/test';

/**
 * E2E configuration via env. Auth/tenant-dependent specs self-skip unless the
 * relevant vars are set, so the suite is safe to run before a live environment
 * exists (mirrors the purchase-path spec's "skip without data" approach).
 *
 *   E2E_EMAIL / E2E_PASSWORD  — a real Supabase test account (for authed flows).
 *                               For the member-invite spec it must be a store
 *                               admin/owner (members.manage).
 *   E2E_ROOT_DOMAIN           — platform root host incl. port, e.g. "localhost:3000"
 *                               (for subdomain routing). Requires live tenancy.
 *   E2E_STORE_SLUG            — an existing active store slug (optional).
 */
export const E2E = {
  email: process.env.E2E_EMAIL,
  password: process.env.E2E_PASSWORD,
  rootDomain: process.env.E2E_ROOT_DOMAIN,
  storeSlug: process.env.E2E_STORE_SLUG,
  hasCreds: !!(process.env.E2E_EMAIL && process.env.E2E_PASSWORD),
};

/** Sign in via the UI (email + password) and wait until we leave /login. */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
}
