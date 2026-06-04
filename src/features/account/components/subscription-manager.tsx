'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  pauseSubscriptionAction,
  resumeSubscriptionAction,
  skipNextAction,
  cancelSubscriptionAction,
} from '../actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/money';
import type { SubscriptionWithItems } from '../queries';

export function SubscriptionManager({ sub }: { sub: SubscriptionWithItems }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });

  const cancelled = sub.status === 'cancelled';
  const paused = sub.status === 'paused';

  return (
    <div className="rounded-lg border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold capitalize">{sub.interval} subscription</h3>
            <Badge
              variant={
                cancelled ? 'destructive' : paused ? 'muted' : 'success'
              }
            >
              {sub.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatMoney(sub.recurring_total_sen)} / {sub.interval === 'quarterly' ? '3 months' : 'month'}
            {sub.next_billing_date && !cancelled && (
              <> · Next: {new Date(sub.next_billing_date).toLocaleDateString('en-MY')}</>
            )}
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
        {sub.items.map((item) => (
          <li key={item.id}>
            {item.quantity} × {item.productName}
          </li>
        ))}
      </ul>

      {sub.skip_next && !cancelled && (
        <p className="mt-2 text-sm font-medium text-accent-foreground">
          Next delivery will be skipped.
        </p>
      )}

      {!cancelled && (
        <div className="mt-4 flex flex-wrap gap-2">
          {paused ? (
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => resumeSubscriptionAction(sub.id))}>
              Resume
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => pauseSubscriptionAction(sub.id))}>
              Pause
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => skipNextAction(sub.id, !sub.skip_next))}
          >
            {sub.skip_next ? 'Un-skip next' : 'Skip next order'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm('Cancel this subscription? You can resubscribe anytime.')) {
                run(() => cancelSubscriptionAction(sub.id));
              }
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
