import { test, expect, type Page } from '@playwright/test';
import { TENANCY, roleCreds, storeOrigin, loginAt, pathOf, type RoleName } from './helpers';

/**
 * RBAC coverage against a real environment. Requires E2E_ROOT_DOMAIN +
 * E2E_STORE_A_SLUG and per-role accounts that are members of store A with the
 * matching role (E2E_<ROLE>_EMAIL/PASSWORD). Each role self-skips if its creds
 * aren't provided. See docs/TESTING.md §"Multi-store E2E setup".
 *
 * Asserts the *visible* RBAC surface: which admin-nav items each role sees, and
 * that permission-gated pages redirect. (Action-level enforcement is covered by
 * the permission-matrix unit tests + requirePermission in server actions.)
 */

// Expected admin-nav items per role (labels). Derived from the permission matrix.
const NAV: Record<RoleName, { visible: string[]; hidden: string[] }> = {
  admin: { visible: ['Orders', 'Coupons', 'Members', 'Store'], hidden: ['Users'] },
  manager: { visible: ['Orders', 'Coupons', 'Categories'], hidden: ['Members', 'Store', 'Users'] },
  marketing: { visible: ['Coupons', 'Reviews'], hidden: ['Orders', 'Members', 'Store', 'Users'] },
  warehouse: { visible: ['Orders', 'Products'], hidden: ['Coupons', 'Members', 'Store', 'Users'] },
  support: { visible: ['Orders', 'Reviews'], hidden: ['Coupons', 'Members', 'Store', 'Users'] },
};

// Pages that require a permission most departmental roles lack.
const GATED = ['/admin/members', '/admin/store', '/admin/users'];

async function adminNavLinks(page: Page) {
  return page.getByRole('navigation', { name: 'Admin' });
}

for (const role of Object.keys(NAV) as RoleName[]) {
  test.describe(`RBAC: ${role}`, () => {
    test(`nav + gated pages for ${role}`, async ({ page }) => {
      test.skip(!TENANCY.rootDomain || !TENANCY.storeA, 'Set E2E_ROOT_DOMAIN + E2E_STORE_A_SLUG.');
      const creds = roleCreds(role);
      test.skip(!creds, `Set E2E_${role.toUpperCase()}_EMAIL/PASSWORD (member of store A).`);

      const origin = storeOrigin(TENANCY.storeA);
      await loginAt(page, origin, creds!.email, creds!.password);

      // Operators reach /admin; the nav reflects their permissions.
      await page.goto(`${origin}/admin`);
      expect(pathOf(page), 'should reach /admin').toBe('/admin');
      const nav = await adminNavLinks(page);

      for (const label of NAV[role].visible) {
        await expect(
          nav.getByRole('link', { name: label, exact: true }),
          `${role} should see "${label}"`,
        ).toBeVisible();
      }
      for (const label of NAV[role].hidden) {
        await expect(
          nav.getByRole('link', { name: label, exact: true }),
          `${role} should NOT see "${label}"`,
        ).toHaveCount(0);
      }

      // Permission-gated pages redirect away when the role lacks the permission.
      for (const path of GATED) {
        if (role === 'admin' && (path === '/admin/members' || path === '/admin/store')) continue;
        await page.goto(`${origin}${path}`);
        expect(pathOf(page), `${role} should be redirected from ${path}`).not.toBe(path);
      }
    });
  });
}
