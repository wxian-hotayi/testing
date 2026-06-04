'use server';

import {
  addItem,
  updateLine,
  removeLine,
  clearCart,
  applyCoupon,
  removeCoupon,
  getCartView,
  type AddItemInput,
} from './cart-service';
import type { CartActionResult, CartView } from './types';

function message(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong.';
}

async function safeView(): Promise<CartView> {
  return getCartView();
}

export async function getCartAction(): Promise<CartView> {
  return getCartView();
}

export async function addToCartAction(
  input: AddItemInput,
): Promise<CartActionResult> {
  try {
    const cart = await addItem(input);
    return { ok: true, cart };
  } catch (err) {
    console.warn('[cart] addToCart failed:', err);
    return { ok: false, error: message(err), cart: await safeView() };
  }
}

export async function updateLineAction(
  itemId: string,
  quantity: number,
): Promise<CartActionResult> {
  try {
    const cart = await updateLine(itemId, quantity);
    return { ok: true, cart };
  } catch (err) {
    return { ok: false, error: message(err), cart: await safeView() };
  }
}

export async function removeLineAction(itemId: string): Promise<CartActionResult> {
  try {
    const cart = await removeLine(itemId);
    return { ok: true, cart };
  } catch (err) {
    return { ok: false, error: message(err), cart: await safeView() };
  }
}

export async function clearCartAction(): Promise<CartActionResult> {
  try {
    const cart = await clearCart();
    return { ok: true, cart };
  } catch (err) {
    return { ok: false, error: message(err), cart: await safeView() };
  }
}

export async function applyCouponAction(code: string): Promise<CartActionResult> {
  try {
    const cart = await applyCoupon(code.trim());
    return { ok: true, cart };
  } catch (err) {
    return { ok: false, error: message(err), cart: await safeView() };
  }
}

export async function removeCouponAction(): Promise<CartActionResult> {
  try {
    const cart = await removeCoupon();
    return { ok: true, cart };
  } catch (err) {
    return { ok: false, error: message(err), cart: await safeView() };
  }
}
