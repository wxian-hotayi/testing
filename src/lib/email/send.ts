import 'server-only';

import { getResend } from './resend';
import { getServerEnv } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import type { EmailFlowKey } from '@/types/database.types';

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  flow?: EmailFlowKey;
  templateKey?: string;
  userId?: string | null;
  relatedCartId?: string | null;
  relatedOrderId?: string | null;
};

/**
 * Send a transactional/marketing email via Resend and record it in email_logs.
 * Never throws — failures are logged so callers (webhooks, cron) stay resilient.
 * No-ops (status 'skipped') when RESEND_API_KEY is absent.
 */
export async function sendEmail(
  opts: SendEmailOptions,
): Promise<{ ok: boolean; status: string }> {
  const { EMAIL_FROM, EMAIL_REPLY_TO } = getServerEnv();
  const from = EMAIL_FROM ?? 'Vitalis <onboarding@resend.dev>';
  const resend = getResend();

  let status = 'sent';
  let error: string | null = null;
  let providerId: string | null = null;

  try {
    if (!resend) {
      status = 'skipped';
      error = 'RESEND_API_KEY not configured';
    } else {
      const res = await resend.emails.send({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        ...(EMAIL_REPLY_TO ? { replyTo: EMAIL_REPLY_TO } : {}),
      });
      if (res.error) {
        status = 'failed';
        error = res.error.message;
      } else {
        providerId = res.data?.id ?? null;
      }
    }
  } catch (err) {
    status = 'failed';
    error = err instanceof Error ? err.message : 'unknown error';
  }

  try {
    const admin = createAdminClient();
    await admin.from('email_logs').insert({
      to_email: opts.to,
      user_id: opts.userId ?? null,
      template_key: opts.templateKey ?? null,
      flow: opts.flow ?? null,
      subject: opts.subject,
      related_cart_id: opts.relatedCartId ?? null,
      related_order_id: opts.relatedOrderId ?? null,
      provider_message_id: providerId,
      status,
      error,
    });
  } catch (logErr) {
    console.warn('[email] failed to write email_logs:', logErr);
  }

  return { ok: status === 'sent', status };
}
