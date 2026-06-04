import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/features/account/queries';
import { ReferralLink } from '@/features/referrals/components/referral-link';
import { Badge } from '@/components/ui/badge';
import { env } from '@/lib/env';
import { REFERRAL_REWARD_SEN } from '@/lib/constants';
import { formatMoney } from '@/lib/money';

async function getMyReferrals() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('referrals')
      .select('id, referee_email, status, reward_points, created_at')
      .order('created_at', { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function ReferralsPage() {
  const [profile, referrals] = await Promise.all([getProfile(), getMyReferrals()]);
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  const link = profile?.referral_code
    ? `${base}/?ref=${profile.referral_code}`
    : `${base}/`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Refer a friend</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Share your link. When a friend makes their first purchase, you both earn
          rewards worth {formatMoney(REFERRAL_REWARD_SEN)}.
        </p>
      </div>

      <ReferralLink url={link} />

      <div>
        <h3 className="mb-2 text-sm font-semibold">Your referrals</h3>
        {referrals.length === 0 ? (
          <p className="rounded-lg border p-4 text-sm text-muted-foreground">
            No referrals yet — share your link to get started.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {referrals.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 p-3">
                <span>{r.referee_email ?? 'Pending friend'}</span>
                <div className="flex items-center gap-3">
                  {r.reward_points > 0 && (
                    <span className="text-success">+{r.reward_points} pts</span>
                  )}
                  <Badge variant={r.status === 'rewarded' ? 'success' : 'muted'}>
                    {r.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
