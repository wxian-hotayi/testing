'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderAction, refundOrderAction } from '../actions';
import { Button } from '@/components/ui/button';
import type { OrderStatus, PaymentStatus } from '@/types/database.types';

const STATUSES: OrderStatus[] = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

export function OrderActions({
  id,
  status,
  trackingNumber,
  paymentStatus,
}: {
  id: string;
  status: OrderStatus;
  trackingNumber: string | null;
  paymentStatus: PaymentStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tracking, setTracking] = useState(trackingNumber ?? '');
  const [msg, setMsg] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) =>
    startTransition(async () => {
      const res = await fn();
      setMsg(res.ok ? okMsg : (res.error ?? 'Failed.'));
      if (res.ok) router.refresh();
    });

  return (
    <div className="space-y-4 rounded-lg border bg-card p-5">
      <h2 className="font-semibold">Manage order</h2>

      <div>
        <label htmlFor="status" className="mb-1 block text-sm font-medium">Status</label>
        <select
          id="status"
          defaultValue={status}
          disabled={pending}
          onChange={(e) => run(() => updateOrderAction(id, { status: e.target.value as OrderStatus }), 'Status updated.')}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="tracking" className="mb-1 block text-sm font-medium">Tracking number</label>
        <div className="flex gap-2">
          <input
            id="tracking"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(() => updateOrderAction(id, { tracking_number: tracking }), 'Tracking saved.')}
          >
            Save
          </Button>
        </div>
      </div>

      {paymentStatus === 'paid' && (
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive"
          disabled={pending}
          onClick={() => {
            if (confirm('Refund this order via Stripe?')) {
              run(() => refundOrderAction(id), 'Order refunded.');
            }
          }}
        >
          Refund order
        </Button>
      )}

      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
    </div>
  );
}
