'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard } from 'lucide-react';
import {
  startStripeOnboardingAction,
  refreshStripeStatusAction,
  type ConnectResult,
} from '../connect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function StripeConnectPanel({
  accountId,
  chargesEnabled,
}: {
  accountId: string | null;
  chargesEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const connected = !!accountId;
  const status: { label: string; variant: 'success' | 'muted' | 'outline' } = chargesEnabled
    ? { label: 'Active — accepting payments', variant: 'success' }
    : connected
      ? { label: 'Onboarding incomplete', variant: 'muted' }
      : { label: 'Not connected', variant: 'outline' };

  function onboard() {
    setError(null);
    startTransition(async () => {
      const res: ConnectResult = await startStripeOnboardingAction();
      if (res.ok && res.url) {
        window.location.href = res.url;
      } else {
        setError(res.error ?? 'Could not start onboarding.');
      }
    });
  }

  function refresh() {
    setError(null);
    startTransition(async () => {
      const res = await refreshStripeStatusAction();
      if (res.ok) router.refresh();
      else setError(res.error ?? 'Could not refresh status.');
    });
  }

  return (
    <div className="max-w-lg space-y-3 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <CreditCard className="size-5 text-primary" aria-hidden />
        <h2 className="text-lg font-semibold">Payments (Stripe Connect)</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Connect a Stripe account to receive payouts directly. The platform
        applies a small commission on each sale; the rest settles to your account.
      </p>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Status:</span>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {!chargesEnabled && (
          <Button size="sm" disabled={pending} onClick={onboard}>
            {pending ? 'Working…' : connected ? 'Continue onboarding' : 'Connect with Stripe'}
          </Button>
        )}
        {connected && (
          <Button variant="outline" size="sm" disabled={pending} onClick={refresh}>
            Refresh status
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
