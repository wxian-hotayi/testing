/**
 * Pure store-provisioning policy — slug format, reserved names, and store-name
 * validation. No I/O (uniqueness is checked in queries.ts). Kept here so the
 * rules are unit-tested independently and shared by the create form, the
 * availability API, and the create action.
 *
 * A slug becomes the store's subdomain (`<slug>.app.com`), so it must be a valid
 * DNS label and must match the leftmost-label rule in
 * `resolveTenantFromHost` (src/lib/tenant/resolve.ts).
 */

/** Names that must never become a store subdomain (collide with the platform). */
export const RESERVED_SLUGS = new Set<string>([
  'www', 'app', 'api', 'admin', 'account', 'accounts', 'login', 'logout',
  'signup', 'register', 'auth', 'checkout', 'cart', 'store', 'stores',
  'dashboard', 'static', 'assets', 'cdn', 'media', 'img', 'images', 'mail',
  'email', 'smtp', 'ftp', 'ns', 'dns', 'blog', 'help', 'support', 'status',
  'docs', 'about', 'contact', 'legal', 'privacy', 'terms', 'pricing',
  'vitalis', 'default', 'test', 'staging', 'dev',
]);

export const SLUG_MIN = 3;
export const SLUG_MAX = 63;

// DNS label: lowercase alphanumeric, internal hyphens allowed, no leading/
// trailing hyphen.
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/** Normalise arbitrary text into a candidate slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX);
}

export type SlugError =
  | 'too_short'
  | 'too_long'
  | 'invalid_chars'
  | 'reserved'
  | null;

export function validateSlug(slug: string): SlugError {
  if (slug.length < SLUG_MIN) return 'too_short';
  if (slug.length > SLUG_MAX) return 'too_long';
  if (!SLUG_RE.test(slug)) return 'invalid_chars';
  if (RESERVED_SLUGS.has(slug)) return 'reserved';
  return null;
}

export function slugErrorMessage(error: Exclude<SlugError, null>): string {
  switch (error) {
    case 'too_short':
      return `Use at least ${SLUG_MIN} characters.`;
    case 'too_long':
      return `Use at most ${SLUG_MAX} characters.`;
    case 'invalid_chars':
      return 'Use lowercase letters, numbers and hyphens only (no leading/trailing hyphen).';
    case 'reserved':
      return 'That name is reserved. Please choose another.';
  }
}

export const STORE_NAME_MIN = 2;
export const STORE_NAME_MAX = 80;

export function isValidStoreName(name: string): boolean {
  const n = name.trim();
  return n.length >= STORE_NAME_MIN && n.length <= STORE_NAME_MAX;
}

/** Optional hex colour (#rgb / #rrggbb), used for store branding. */
export function isValidHexColor(value: string): boolean {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}
