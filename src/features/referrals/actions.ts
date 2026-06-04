'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const REF_COOKIE = 'vitalis_ref';

/**
 * Links the current user to their referrer if a referral code is present (set
 * as a cookie by middleware when someone lands via ?ref=CODE) and they aren't
 * already attributed. Idempotent — safe to call on every account page load.
 */
export async function attachReferralIfPending(): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const cookieStore = await cookies();
    const code = cookieStore.get(REF_COOKIE)?.value;
    if (!code) return;

    const admin = createAdminClient();
    const { data: me } = await admin
      .from('profiles')
      .select('referred_by')
      .eq('id', user.id)
      .maybeSingle();
    if (!me || me.referred_by) return; // already attributed

    const { data: referrer } = await admin
      .from('profiles')
      .select('id')
      .eq('referral_code', code)
      .maybeSingle();
    if (!referrer || referrer.id === user.id) return;

    await admin
      .from('profiles')
      .update({ referred_by: referrer.id })
      .eq('id', user.id);

    // Create the pending referral if one doesn't exist yet.
    const { data: existing } = await admin
      .from('referrals')
      .select('id')
      .eq('referee_id', user.id)
      .maybeSingle();
    if (!existing) {
      await admin.from('referrals').insert({
        referrer_id: referrer.id,
        referee_id: user.id,
        code,
        status: 'pending',
      });
    }
  } catch (err) {
    console.warn('[referrals] attach failed:', err);
  }
}
