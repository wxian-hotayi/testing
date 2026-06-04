import { createClient } from '@/lib/supabase/server';
import { getLoyaltyBalance } from '@/features/account/queries';
import { RedeemPanel } from '@/features/loyalty/components/redeem-panel';
import { LOYALTY_POINTS_PER_MINOR_UNIT } from '@/lib/constants';

async function getTransactions() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('loyalty_transactions')
      .select('id, type, points, description, created_at')
      .order('created_at', { ascending: false })
      .limit(30);
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function RewardsPage() {
  const [balance, transactions] = await Promise.all([
    getLoyaltyBalance(),
    getTransactions(),
  ]);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">Rewards</h2>

      <RedeemPanel balance={balance} />

      <div>
        <h3 className="mb-2 text-sm font-semibold">How it works</h3>
        <p className="text-sm text-muted-foreground">
          Earn {Math.round(LOYALTY_POINTS_PER_MINOR_UNIT * 100)} point for every
          RM 1 you spend. Redeem points for discount codes any time.
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Points history</h3>
        {transactions.length === 0 ? (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">
            No points activity yet.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <p className="font-medium capitalize">{t.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.description ?? ''} ·{' '}
                    {new Date(t.created_at).toLocaleDateString('en-MY')}
                  </p>
                </div>
                <span className={t.points >= 0 ? 'font-semibold text-success' : 'font-semibold text-muted-foreground'}>
                  {t.points >= 0 ? '+' : ''}
                  {t.points}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
