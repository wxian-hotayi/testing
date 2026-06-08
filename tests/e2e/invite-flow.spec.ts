import { test, expect } from '@playwright/test';
import { TENANCY, roleCreds, INVITE, storeOrigin, loginAt, pathOf } from './helpers';

/**
 * Full invite → accept loop (MT-4) against a real environment. Requires:
 *   E2E_ROOT_DOMAIN, E2E_STORE_A_SLUG,
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD     — owner/admin of store A,
 *   E2E_INVITEE_EMAIL / E2E_INVITEE_PASSWORD — a SECOND existing account that is
 *                                              NOT yet a member of store A.
 *
 * One-shot per environment: once the invitee is an active member, re-inviting
 * errors. Remove the member (or use a fresh invitee) to re-run.
 */
test.describe('invite → accept (MT-4)', () => {
  test.beforeEach(() => {
    test.skip(
      !TENANCY.rootDomain ||
        !TENANCY.storeA ||
        !roleCreds('admin') ||
        !INVITE.inviteeEmail ||
        !INVITE.inviteePassword,
      'Set E2E_ROOT_DOMAIN + E2E_STORE_A_SLUG + E2E_ADMIN_* + E2E_INVITEE_*.',
    );
  });

  test('admin invites a user who then accepts and gains access', async ({ browser }) => {
    const admin = roleCreds('admin')!;
    const origin = storeOrigin(TENANCY.storeA);
    const inviteeEmail = INVITE.inviteeEmail!;

    const inviterCtx = await browser.newContext();
    const inviteeCtx = await browser.newContext();
    try {
      // 1) Admin sends the invite.
      const inviter = await inviterCtx.newPage();
      await loginAt(inviter, origin, admin.email, admin.password);
      await inviter.goto(`${origin}/admin/members`);
      expect(pathOf(inviter), 'admin reaches members page').toBe('/admin/members');

      await inviter.getByLabel('Invite by email').fill(inviteeEmail);
      // Scope to the invite form's role select — the members table also renders a
      // "Filter by role" select and a per-member "Role for <email>" select.
      await inviter.getByLabel('Role', { exact: true }).selectOption('support');
      await inviter.getByRole('button', { name: /send invite/i }).click();
      // The success banner is unique; the email also appears in the members table
      // and the success text, so assert on the banner specifically.
      await expect(inviter.getByText(/invitation sent to/i)).toBeVisible({ timeout: 15_000 });

      // 2) Invitee logs in and accepts.
      const invitee = await inviteeCtx.newPage();
      await loginAt(invitee, origin, inviteeEmail, INVITE.inviteePassword!);
      await invitee.goto(`${origin}/account/invitations`);
      await expect(invitee.getByRole('button', { name: /^accept$/i }).first()).toBeVisible({
        timeout: 15_000,
      });
      await invitee.getByRole('button', { name: /^accept$/i }).first().click();
      // On success the action refreshes the page; the accepted invite drops out
      // of the list and the success banner is unmounted (transient). The durable
      // post-state is the empty list — assert that, then prove the access gain.
      await expect(invitee.getByText(/no pending invitations/i)).toBeVisible({ timeout: 15_000 });

      // 3) Invitee is now a store-A operator → reaches /admin (was redirected before).
      await invitee.goto(`${origin}/admin`);
      expect(pathOf(invitee), 'new member reaches /admin').toBe('/admin');
    } finally {
      await inviterCtx.close();
      await inviteeCtx.close();
    }
  });
});
