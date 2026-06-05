/**
 * Pure tenant resolution: map an incoming Host header to a tenant.
 * No I/O — trivially testable. The actual store lookup happens in
 * `context.ts` using the result of this function.
 *
 *   acme.myapp.com   → { kind: 'subdomain', slug: 'acme' }
 *   shop.acme.com    → { kind: 'custom', host: 'shop.acme.com' }  (not under root)
 *   myapp.com / www  → { kind: 'default' }  (the platform root / marketing site)
 *   localhost        → { kind: 'default' }
 *   acme.localhost   → { kind: 'subdomain', slug: 'acme' }
 */
/** Request headers the middleware sets (trusted; stripped from inbound to
 * prevent tenant spoofing) and the server context reads. */
export const STORE_SLUG_HEADER = 'x-store-slug';
export const STORE_HOST_HEADER = 'x-store-host';
export const DEFAULT_STORE_SLUG = 'default';

export type Tenant =
  | { kind: 'default' }
  | { kind: 'subdomain'; slug: string }
  | { kind: 'custom'; host: string };

export function resolveTenantFromHost(
  rawHost: string | null | undefined,
  rootDomain: string,
): Tenant {
  if (!rawHost) return { kind: 'default' };
  const host = rawHost.split(':')[0]!.toLowerCase().trim();
  const root = rootDomain.split(':')[0]!.toLowerCase().trim();

  if (!host || host === root || host === `www.${root}`) return { kind: 'default' };
  if (host === 'localhost' || host === '127.0.0.1') return { kind: 'default' };

  if (host.endsWith(`.${root}`)) {
    const sub = host.slice(0, host.length - root.length - 1);
    const label = sub.split('.')[0]!; // leftmost label is the store slug
    if (!label || label === 'www') return { kind: 'default' };
    return { kind: 'subdomain', slug: label };
  }

  // Host isn't under the platform root → treat as a merchant custom domain.
  return { kind: 'custom', host };
}

/** Derive the platform root domain from the public site URL. */
export function rootDomainFromSiteUrl(siteUrl: string): string {
  try {
    return new URL(siteUrl).hostname;
  } catch {
    return 'localhost';
  }
}
