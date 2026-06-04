import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/send';
import { renderAbandonedCartEmail } from '@/lib/email/templates';
import { env } from '@/lib/env';

type FlowStep = {
  afterMinutes: number;
  templateKey?: string;
  discountPercent?: number;
};

/**
 * Abandoned-cart recovery sweep (invoked by the cron route). For each active
 * cart with items, an email, and no activity for the configured interval, sends
 * the NEXT due step from the admin-configurable `abandoned_cart` flow and
 * advances `recovery_emails_sent`. Idempotent per step — safe to run hourly.
 */
export async function runAbandonedCartRecovery(): Promise<{
  scanned: number;
  emailed: number;
}> {
  const admin = createAdminClient();
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');

  // Load the flow config (fallback to a sensible default).
  const { data: flow } = await admin
    .from('email_flows')
    .select('is_enabled, steps')
    .eq('key', 'abandoned_cart')
    .maybeSingle();
  if (flow && !flow.is_enabled) return { scanned: 0, emailed: 0 };

  const steps = (Array.isArray(flow?.steps) ? flow!.steps : []) as FlowStep[];
  const orderedSteps = [...steps].sort((a, b) => a.afterMinutes - b.afterMinutes);
  if (orderedSteps.length === 0) return { scanned: 0, emailed: 0 };

  const cutoff = new Date(Date.now() - 60 * 1000).toISOString(); // ≥1 min idle
  const { data: carts } = await admin
    .from('carts')
    .select('id, user_id, email, session_token, recovery_emails_sent, updated_at')
    .in('status', ['active', 'abandoned'])
    .lt('updated_at', cutoff)
    .order('updated_at', { ascending: true })
    .limit(200);

  if (!carts || carts.length === 0) return { scanned: 0, emailed: 0 };

  let emailed = 0;
  for (const cart of carts) {
    // Must have items.
    const { count } = await admin
      .from('cart_items')
      .select('id', { count: 'exact', head: true })
      .eq('cart_id', cart.id);
    if (!count || count === 0) continue;

    // Resolve a recipient email.
    let email = cart.email ?? null;
    if (!email && cart.user_id) {
      const { data: profile } = await admin
        .from('profiles')
        .select('email, full_name')
        .eq('id', cart.user_id)
        .maybeSingle();
      email = profile?.email ?? null;
    }
    if (!email) continue;

    const stepIndex = cart.recovery_emails_sent;
    const step = orderedSteps[stepIndex];
    if (!step) continue; // all steps already sent

    const minutesIdle = (Date.now() - new Date(cart.updated_at).getTime()) / 60000;
    if (minutesIdle < step.afterMinutes) continue; // not due yet

    // Build a recovery link that restores anonymous carts via session token.
    const cartUrl = cart.session_token
      ? `${base}/api/cart/recover?token=${cart.session_token}`
      : `${base}/cart`;

    const { subject, html } = renderAbandonedCartEmail({
      firstName: '',
      cartUrl,
      discountCode: step.discountPercent ? 'WELCOME10' : undefined,
      discountPercent: step.discountPercent,
    });

    const res = await sendEmail({
      to: email,
      subject,
      html,
      flow: 'abandoned_cart',
      templateKey: step.templateKey,
      userId: cart.user_id,
      relatedCartId: cart.id,
    });
    if (res.status === 'failed') continue;

    await admin
      .from('carts')
      .update({
        status: 'abandoned',
        abandoned_at: cart.updated_at,
        recovery_emails_sent: stepIndex + 1,
        last_recovery_email_at: new Date().toISOString(),
      })
      .eq('id', cart.id);
    emailed += 1;
  }

  return { scanned: carts.length, emailed };
}
