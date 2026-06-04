import { test, expect } from '@playwright/test';

/**
 * Smoke tests — verify core pages render and navigate. These pass WITHOUT
 * seeded data (pages show empty states), so they're safe to run anywhere.
 */
test.describe('storefront smoke', () => {
  test('homepage renders hero + trust strip + footer disclaimer', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/free shipping over rm\s?200/i)).toBeVisible();
    // Supplement compliance disclaimer in the footer.
    await expect(page.getByText(/not intended to diagnose, treat, cure/i)).toBeVisible();
  });

  test('primary navigation works', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Shop', exact: true }).first().click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByRole('heading', { name: /all products/i })).toBeVisible();
  });

  test('key pages load', async ({ page }) => {
    for (const path of ['/subscribe', '/faq', '/about', '/contact', '/legal/privacy']) {
      const res = await page.goto(path);
      expect(res?.status(), `GET ${path}`).toBeLessThan(400);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });

  test('login page renders auth form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  test('cart starts empty', async ({ page }) => {
    await page.goto('/cart');
    await expect(
      page.getByRole('heading', { name: /your cart is empty/i }),
    ).toBeVisible();
  });
});
