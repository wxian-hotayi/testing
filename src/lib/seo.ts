import type { Metadata } from 'next';
import { env } from '@/lib/env';
import { SITE } from '@/lib/constants';

/**
 * Build a consistent Metadata object for a page. Centralizes canonical URLs,
 * Open Graph, and Twitter cards so every route is SEO- and share-ready.
 */
export function buildMetadata(opts: {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  type?: 'website' | 'article' | 'product';
}): Metadata {
  const {
    title,
    description = SITE.defaultDescription,
    path = '/',
    image = '/og-default.png',
    noIndex = false,
    type = 'website',
  } = opts;

  const url = new URL(path, env.NEXT_PUBLIC_SITE_URL).toString();
  const fullTitle = title ? `${title} | ${SITE.name}` : `${SITE.name} — ${SITE.tagline}`;

  return {
    title: fullTitle,
    description,
    alternates: { canonical: url },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE.name,
      type: type === 'product' ? 'website' : type,
      images: [{ url: image, width: 1200, height: 630, alt: fullTitle }],
      locale: 'en_MY',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
    },
  };
}

/** Render a JSON-LD <script> payload. Use inside a Server Component. */
export function jsonLd<T extends Record<string, unknown>>(data: T): string {
  return JSON.stringify(data);
}
