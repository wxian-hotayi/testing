'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send';
import { renderWelcomeEmail } from '@/lib/email/templates';

const schema = z.object({
  email: z.string().email(),
  source: z.string().optional(),
});

export type NewsletterState = { ok: boolean; message: string } | null;

/**
 * Newsletter opt-in. Idempotent: a duplicate email is treated as success so we
 * never leak whether an address is already subscribed. Designed for
 * `useActionState`.
 */
export async function subscribeNewsletter(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    source: formData.get('source') ?? 'footer',
  });
  if (!parsed.success) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from('newsletter_subscribers').insert({
      email: parsed.data.email,
      source: parsed.data.source,
    });
    // 23505 = unique_violation → already subscribed; treat as success.
    if (error && error.code !== '23505') {
      console.warn('[newsletter] insert failed:', error);
      return { ok: false, message: 'Something went wrong. Please try again.' };
    }
    // Send the welcome email only for genuinely new subscribers.
    if (!error) {
      const { subject, html } = renderWelcomeEmail('');
      await sendEmail({
        to: parsed.data.email,
        subject,
        html,
        flow: 'welcome_series',
        templateKey: 'welcome_1',
      });
    }
    return { ok: true, message: "You're in! Watch your inbox for 10% off." };
  } catch (err) {
    console.warn('[newsletter] unexpected error:', err);
    return { ok: false, message: 'Something went wrong. Please try again.' };
  }
}
