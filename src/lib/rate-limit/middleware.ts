import { NextResponse, type NextRequest } from 'next/server';
import { checkRateLimit, type RateRule } from './limiter';

/**
 * Per-IP rate limiting for sensitive paths, applied in middleware before the
 * (more expensive) auth refresh. Returns a 429 response when over the limit, or
 * null to continue. Normal page navigations are NOT limited.
 */

// Tunable defaults. Auth is tighter (brute-force resistance); APIs are generous
// enough for legitimate clients.
const AUTH: RateRule = { limit: 15, windowMs: 60_000 };
const API: RateRule = { limit: 60, windowMs: 60_000 };

function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/** Pick the rule + bucket for a path, or null if the path isn't limited. */
function ruleFor(pathname: string): { rule: RateRule; bucket: string } | null {
  // Never throttle Stripe webhooks — dropping a delivery would lose legitimate
  // retries (Stripe verifies signatures itself).
  if (pathname.startsWith('/api/webhooks/')) return null;
  if (pathname.startsWith('/api/')) return { rule: API, bucket: 'api' };
  if (pathname === '/login' || pathname.startsWith('/auth')) return { rule: AUTH, bucket: 'auth' };
  return null;
}

export function rateLimitRequest(req: NextRequest): NextResponse | null {
  const match = ruleFor(req.nextUrl.pathname);
  if (!match) return null;

  const key = `${clientIp(req)}:${match.bucket}`;
  const result = checkRateLimit(key, match.rule);
  if (result.ok) return null;

  return new NextResponse('Too many requests. Please slow down.', {
    status: 429,
    headers: {
      'Retry-After': String(result.retryAfterSec),
      'X-RateLimit-Limit': String(result.limit),
      'X-RateLimit-Remaining': String(result.remaining),
      'Cache-Control': 'no-store',
    },
  });
}
