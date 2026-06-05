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
  await loginAt(page, '', email, password);
}

// --- Multi-store / per-role config (isolation, RBAC, invite-flow specs) ------
export const TENANCY = {
  rootDomain: process.env.E2E_ROOT_DOMAIN, // e.g. "localhost:3000"
  storeA: process.env.E2E_STORE_A_SLUG,
  storeB: process.env.E2E_STORE_B_SLUG,
};

export type RoleName = 'admin' | 'manager' | 'marketing' | 'warehouse' | 'support';

/** Per-role test credentials, e.g. E2E_MARKETING_EMAIL / E2E_MARKETING_PASSWORD. */
export function roleCreds(role: RoleName): { email: string; password: string } | null {
  const email = process.env[`E2E_${role.toUpperCase()}_EMAIL`];
  const password = process.env[`E2E_${role.toUpperCase()}_PASSWORD`];
  return email && password ? { email, password } : null;
}

export const INVITE = {
  inviteeEmail: process.env.E2E_INVITEE_EMAIL,
  inviteePassword: process.env.E2E_INVITEE_PASSWORD,
};

/**
 * Absolute origin for a store subdomain on the configured root domain, or '' to
 * fall back to the Playwright baseURL. NOTE: when targeting a subdomain you MUST
 * use absolute URLs for every navigation — Playwright resolves relative paths
 * against baseURL, not the current page's origin.
 */
export function storeOrigin(slug?: string): string {
  if (slug && TENANCY.rootDomain) return `http://${slug}.${TENANCY.rootDomain}`;
  return '';
}

/** Sign in at a specific origin (for subdomain-scoped sessions). */
export async function loginAt(
  page: Page,
  origin: string,
  email: string,
  password: string,
): Promise<void> {
  await page.goto(`${origin}/login`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
}

export function pathOf(page: Page): string {
  return new URL(page.url()).pathname;
}
