import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';
import {
  resolveTenantFromHost,
  rootDomainFromSiteUrl,
  STORE_SLUG_HEADER,
  STORE_HOST_HEADER,
} from '@/lib/tenant/resolve';
import type { Database } from '@/types/database.types';

// See server.ts — explicit annotation works around union-type inference loss.
type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Refreshes the Supabase auth session on every request and enforces access to
 * gated route groups. Returns a response with refreshed auth cookies.
 *
 * Route protection:
 *   /account/*  → any authenticated user
 *   /admin/*    → users with role 'admin' or 'staff'
 */
export async function updateSession(request: NextRequest) {
  // --- Tenant resolution from Host -------------------------------------------
  // Strip any inbound store headers (anti-spoofing) and set them from the
  // trusted Host so Server Components can resolve the current store.
  const tenant = resolveTenantFromHost(
    request.headers.get('host'),
    rootDomainFromSiteUrl(env.NEXT_PUBLIC_SITE_URL),
  );
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(STORE_SLUG_HEADER);
  requestHeaders.delete(STORE_HOST_HEADER);
  if (tenant.kind === 'subdomain') {
    requestHeaders.set(STORE_SLUG_HEADER, tenant.slug);
  } else if (tenant.kind === 'custom') {
    requestHeaders.set(STORE_HOST_HEADER, tenant.host);
  }
  const nextOptions = { request: { headers: requestHeaders } };

  let response = NextResponse.next(nextOptions);

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next(nextOptions);
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() revalidates the token with Supabase Auth — do not
  // trust getSession() alone for authorization in middleware.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAccount = pathname.startsWith('/account');
  const isAdmin = pathname.startsWith('/admin');

  if ((isAccount || isAdmin) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Capture referral code (?ref=CODE) into a cookie for later attribution.
  const ref = request.nextUrl.searchParams.get('ref');
  if (ref) {
    response.cookies.set('vitalis_ref', ref, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  if (isAdmin && user) {
    // Coarse gate: allow any operator into /admin. Fine-grained permission
    // checks happen in the admin layout, nav, and each server action
    // (see src/lib/rbac). An operator is a platform admin, a legacy
    // staff/admin profile, or a member of any store.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_platform_admin')
      .eq('id', user.id)
      .single();

    let allowed =
      profile?.is_platform_admin === true ||
      profile?.role === 'admin' ||
      profile?.role === 'staff';

    if (!allowed) {
      const { data: membership } = await supabase
        .from('store_members')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      allowed = !!membership;
    }

    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return response;
}
