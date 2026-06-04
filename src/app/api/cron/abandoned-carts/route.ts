import { NextResponse, type NextRequest } from 'next/server';
import { getServerEnv } from '@/lib/env';
import { runAbandonedCartRecovery } from '@/features/marketing/abandoned-cart';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Abandoned-cart recovery cron. Authorize with the CRON_SECRET, either via
 * `Authorization: Bearer <secret>` (Vercel Cron) or `?secret=<secret>`.
 * Scheduled in vercel.json.
 */
export async function GET(request: NextRequest) {
  const { CRON_SECRET } = getServerEnv();
  if (!CRON_SECRET) {
    return new NextResponse('CRON_SECRET not configured.', { status: 500 });
  }
  const header = request.headers.get('authorization');
  const querySecret = request.nextUrl.searchParams.get('secret');
  const authorized =
    header === `Bearer ${CRON_SECRET}` || querySecret === CRON_SECRET;
  if (!authorized) return new NextResponse('Unauthorized.', { status: 401 });

  const result = await runAbandonedCartRecovery();
  return NextResponse.json({ ok: true, ...result });
}
