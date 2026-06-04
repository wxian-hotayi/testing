'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send';
import { renderWelcomeEmail } from '@/lib/email/templates';
import { env } from '@/lib/env';

export type AuthState = { error: string } | null;

const credentials = z.object({
  email: z.string().email('Enter a valid email.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

const baseUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');

function safeNext(value: FormDataEntryValue | null): string {
  const next = value?.toString() ?? '';
  // Only allow internal redirects.
  return next.startsWith('/') && !next.startsWith('//') ? next : '/account';
}

export async function signInWithPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentials.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };

  redirect(safeNext(formData.get('next')));
}

export async function signUpWithPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentials.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }
  const fullName = formData.get('full_name')?.toString() || undefined;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${baseUrl}/auth/callback`,
    },
  });
  if (error) return { error: error.message };

  // Welcome email (best-effort; never blocks signup).
  const { subject, html } = renderWelcomeEmail(fullName?.split(' ')[0] ?? '');
  await sendEmail({
    to: parsed.data.email,
    subject,
    html,
    flow: 'welcome_series',
    templateKey: 'welcome_1',
  });

  // With email confirmations disabled (see supabase/config.toml) the user is
  // signed in immediately; otherwise they'll confirm via email.
  redirect(safeNext(formData.get('next')));
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient();
  const next = safeNext(formData.get('next'));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) {
    redirect('/login?error=oauth');
  }
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
