'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Gift, Copy } from 'lucide-react';
import { redeemPointsAction } from '../actions';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/money';
import { LOYALTY_POINT_REDEMPTION_VALUE_SEN } from '@/lib/constants';

const TIERS = [100, 200, 500];

export function RedeemPanel({ balance }: { balance: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ code: string; valueSen: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function redeem(points: number) {
    setError(null);
    startTransition(async () => {
      const res = await redeemPointsAction(points);
      if (res.ok) {
        setResult({ code: res.code, valueSen: res.valueSen });
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center gap-2">
        <Gift className="size-5 text-primary" aria-hidden />
        <h2 className="text-lg font-bold">Redeem your points</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        You have <strong>{balance.toLocaleString()}</strong> points. Each point is
        worth {formatMoney(LOYALTY_POINT_REDEMPTION_VALUE_SEN)}.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        {TIERS.map((points) => (
          <Button
            key={points}
            variant="outline"
            disabled={pending || balance < points}
            onClick={() => redeem(points)}
          >
            {points} pts → {formatMoney(points * LOYALTY_POINT_REDEMPTION_VALUE_SEN)}
          </Button>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      {result && (
        <div className="mt-4 rounded-lg border border-dashed border-primary bg-primary/5 p-4">
          <p className="text-sm">
            🎉 Your <strong>{formatMoney(result.valueSen)}</strong> reward code:
          </p>
          <button
            onClick={() => navigator.clipboard?.writeText(result.code)}
            className="mt-2 flex items-center gap-2 text-lg font-bold tracking-widest text-primary"
          >
            {result.code} <Copy className="size-4" />
          </button>
          <p className="mt-1 text-xs text-muted-foreground">Apply it at checkout.</p>
        </div>
      )}
    </div>
  );
}
