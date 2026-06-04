'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCartAction,
  addToCartAction,
  updateLineAction,
  removeLineAction,
  clearCartAction,
  applyCouponAction,
  removeCouponAction,
} from './actions';
import { EMPTY_CART, type CartView } from './types';
import type { AddItemInput } from './cart-service';
import { Analytics } from '@/features/analytics/track';

type CartContextValue = {
  cart: CartView;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  isMutating: boolean;
  lastError: string | null;
  add: (input: AddItemInput) => Promise<void>;
  updateLine: (itemId: string, quantity: number) => Promise<void>;
  removeLine: (itemId: string) => Promise<void>;
  clear: () => Promise<void>;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  children,
  initialCart,
}: {
  children: ReactNode;
  initialCart: CartView;
}) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: getCartAction,
    initialData: initialCart,
    staleTime: 30 * 1000,
  });

  const setCart = useCallback(
    (next: CartView) => queryClient.setQueryData(['cart'], next),
    [queryClient],
  );

  const mutation = useMutation({
    mutationFn: async (fn: () => Promise<{ ok: boolean; error?: string; cart: CartView }>) =>
      fn(),
    onSuccess: (res) => {
      setCart(res.cart);
      setLastError(res.ok ? null : (res.error ?? 'Something went wrong.'));
    },
    onError: () => setLastError('Network error. Please try again.'),
  });

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const add = useCallback(
    async (input: AddItemInput) => {
      const res = await mutation.mutateAsync(() => addToCartAction(input));
      if (res.ok) {
        setIsOpen(true);
        Analytics.addToCart({ product_id: input.productId, bundle_id: input.bundleId ?? null });
      }
    },
    [mutation],
  );

  const updateLine = useCallback(
    async (itemId: string, quantity: number) => {
      await mutation.mutateAsync(() => updateLineAction(itemId, quantity));
    },
    [mutation],
  );

  const removeLine = useCallback(
    async (itemId: string) => {
      await mutation.mutateAsync(() => removeLineAction(itemId));
    },
    [mutation],
  );

  const clear = useCallback(async () => {
    await mutation.mutateAsync(() => clearCartAction());
  }, [mutation]);

  const applyCoupon = useCallback(
    async (code: string) => {
      const res = await mutation.mutateAsync(() => applyCouponAction(code));
      return res.ok;
    },
    [mutation],
  );

  const removeCoupon = useCallback(async () => {
    await mutation.mutateAsync(() => removeCouponAction());
  }, [mutation]);

  return (
    <CartContext.Provider
      value={{
        cart: cart ?? EMPTY_CART,
        isOpen,
        openCart,
        closeCart,
        isMutating: mutation.isPending,
        lastError,
        add,
        updateLine,
        removeLine,
        clear,
        applyCoupon,
        removeCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within <CartProvider>');
  return ctx;
}
