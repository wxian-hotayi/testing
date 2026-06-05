import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { rateLimitRequest } from '@/lib/rate-limit/middleware';

export async function middleware(request: NextRequest) {
  // Per-IP rate limiting on sensitive paths (auth + API), before auth refresh.
  const limited = rateLimitRequest(request);
  if (limited) return limited;
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image optimization
     * files, so we only run the (relatively expensive) auth refresh on real
     * page/route navigations.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)',
  ],
};
