import 'server-only';

import { Resend } from 'resend';
import { getServerEnv } from '@/lib/env';

let cached: Resend | null = null;

/**
 * Lazily-constructed Resend client. Returns null when no API key is configured
 * so callers can no-op gracefully (local-first / preview environments).
 */
export function getResend(): Resend | null {
  const { RESEND_API_KEY } = getServerEnv();
  if (!RESEND_API_KEY) return null;
  if (!cached) cached = new Resend(RESEND_API_KEY);
  return cached;
}
