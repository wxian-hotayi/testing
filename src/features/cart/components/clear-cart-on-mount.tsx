'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Analytics } from '@/features/analytics/track';

/**
 * After a successful checkout the server cart is marked converted; this resets
 * the client cart cache so the header count and drawer reflect the empty cart,
 * and fires the `purchase` analytics event.
 */
export function ClearCartOnMount({
  purchaseValueSen,
  orderNumber,
}: {
  purchaseValueSen?: number;
  orderNumber?: string;
} = {}) {
  const queryClient = useQueryClient();
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['cart'] });
    if (purchaseValueSen != null) {
      Analytics.purchase({
        value: purchaseValueSen / 100,
        currency: 'MYR',
        transaction_id: orderNumber,
      });
    }
  }, [queryClient, purchaseValueSen, orderNumber]);
  return null;
}
