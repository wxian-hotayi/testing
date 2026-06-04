import { test, expect } from '@playwright/test';

/**
 * Purchase-path E2E: browse → PDP → add to cart → drawer → checkout redirect.
 * Requires a Supabase project with seeded catalog data. If no products are
 * present, the test skips itself (so it's safe to run before data exists).
 *
 * It stops at the Stripe redirect — driving Stripe's hosted page belongs in a
 * dedicated payment test using Stripe test cards.
 */
test('browse → add to cart → reach checkout', async ({ page }) => {
  await page.goto('/products');

  const firstProduct = page.locator('a[href^="/products/"]').first();
  const hasProducts = await firstProduct.count();
  test.skip(hasProducts === 0, 'No seeded catalog data — connect Supabase + seed.');

  // Open the first product.
  await firstProduct.click();
  await expect(page).toHaveURL(/\/products\/.+/);

  // Add to cart (bundle selector primary CTA).
  await page.getByRole('button', { name: /add to cart/i }).click();

  // The cart drawer should open and show the free-shipping bar.
  await expect(page.getByText(/free shipping/i)).toBeVisible();

  // Proceed to checkout.
  await page.getByRole('link', { name: /checkout/i }).first().click();
  await expect(page).toHaveURL(/\/checkout/);
  await expect(page.getByRole('button', { name: /pay/i })).toBeVisible();
});
