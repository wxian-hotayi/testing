import { test, expect } from '@playwright/test';
import { E2E, login } from './helpers';

/**
 * Authenticated flows (MT-3 store provisioning, MT-4 member management).
 * Self-skip unless E2E_EMAIL / E2E_PASSWORD point at a real Supabase account.
 * The member-invite test additionally needs that account to be a store
 * admin/owner (members.manage) and skips itself otherwise.
 */
test.describe('authenticated flows', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!E2E.hasCreds, 'Set E2E_EMAIL / E2E_PASSWORD to run authed flows.');
    await login(page, E2E.email!, E2E.password!);
  });

  test('login lands in the account area', async ({ page }) => {
    await page.goto('/account');
    await expect(page).toHaveURL(/\/account/);
    // Account nav is present once authenticated.
    await expect(page.getByRole('link', { name: /orders/i }).first()).toBeVisible();
  });

  test('MT-3: create a store and see it listed', async ({ page }) => {
    const stamp = Date.now();
    await page.goto('/account/stores/new');

    await page.getByLabel('Store name').fill(`E2E Store ${stamp}`);
    await page.getByLabel('Store address').fill(`e2e-${stamp}`);

    // Submit is disabled until the slug availability check passes.
    const submit = page.getByRole('button', { name: /create store/i });
    await expect(submit).toBeEnabled({ timeout: 10_000 });
    await submit.click();

    await expect(page).toHaveURL(/\/account\/stores$/, { timeout: 15_000 });
    await expect(page.getByText(`E2E Store ${stamp}`)).toBeVisible();
  });

  test('MT-4: invite a member (requires members.manage)', async ({ page }) => {
    await page.goto('/admin/members');
    // Non-operators / non-admins are redirected away — skip rather than fail.
    test.skip(
      !/\/admin\/members$/.test(new URL(page.url()).pathname),
      'E2E account lacks members.manage for the resolved store.',
    );

    const email = `invitee-${Date.now()}@example.com`;
    await page.getByLabel('Invite by email').fill(email);
    await page.getByLabel('Role').selectOption('support');
    await page.getByRole('button', { name: /send invite/i }).click();

    // The pending invitation should appear in the invitations table.
    await expect(page.getByText(email)).toBeVisible({ timeout: 15_000 });
  });
});
