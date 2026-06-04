'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, X } from 'lucide-react';
import { getRecentPurchaseActivity } from '../actions';
import { cn } from '@/lib/utils';

/**
 * Cycles through recent (real, anonymized) purchases as social-proof toasts.
 * Renders nothing when there's no order activity.
 */
export function RecentPurchaseToast() {
  const { data: activity = [] } = useQuery({
    queryKey: ['recent-purchases'],
    queryFn: () => getRecentPurchaseActivity(8),
    staleTime: 5 * 60 * 1000,
  });

  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed || activity.length === 0) return;
    let alive = true;
    const show = () => {
      if (!alive) return;
      setVisible(true);
      setTimeout(() => alive && setVisible(false), 5000);
      setTimeout(() => {
        if (!alive) return;
        setIndex((i) => (i + 1) % activity.length);
      }, 6000);
    };
    const first = setTimeout(show, 8000);
    const id = setInterval(show, 12000);
    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(id);
    };
  }, [activity, dismissed]);

  if (dismissed || activity.length === 0) return null;
  const item = activity[index];
  if (!item) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 z-40 flex max-w-xs items-center gap-3 rounded-lg border bg-card p-3 shadow-lg transition-all duration-300',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
      )}
      role="status"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <ShoppingBag className="size-4" />
      </div>
      <div className="text-sm">
        <p>
          <strong>{item.firstName}</strong>
          {item.city ? ` in ${item.city}` : ''} bought{' '}
          <strong>{item.productName}</strong>
        </p>
        <p className="text-xs text-muted-foreground">
          {item.minutesAgo} min ago · Verified
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="ml-auto text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
