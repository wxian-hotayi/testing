'use client';

import { Suspense, useEffect, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { env } from '@/lib/env';

let initialized = false;

function initPostHog() {
  if (initialized || !env.NEXT_PUBLIC_POSTHOG_KEY || typeof window === 'undefined')
    return;
  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    capture_pageview: false, // we capture manually on route change
    person_profiles: 'identified_only',
  });
  window.posthog = posthog;
  initialized = true;
}

/** Captures a $pageview on every client navigation across all three providers.
 * Wrapped in Suspense because useSearchParams opts the subtree into CSR. */
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url =
      pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    window.posthog?.capture('$pageview', { $current_url: url });
    window.gtag?.('event', 'page_view', { page_path: url });
    window.fbq?.('track', 'PageView');
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
    </>
  );
}
