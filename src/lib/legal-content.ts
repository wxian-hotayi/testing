import { SITE } from './constants';

export type LegalDoc = {
  slug: string;
  title: string;
  updated: string;
  intro: string;
  sections: { heading: string; body: string[] }[];
};

/**
 * Policy templates. These are sensible, supplement-compliant starting points
 * written for the Malaysian market (NPRA/KKM, Consumer Protection Act 1999,
 * PDPA 2010). REVIEW WITH QUALIFIED LEGAL COUNSEL before going live.
 */
export const LEGAL_DOCS: Record<string, LegalDoc> = {
  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy',
    updated: '2026-06-04',
    intro: `${SITE.name} ("we", "us") respects your privacy and complies with Malaysia's Personal Data Protection Act 2010 (PDPA). This policy explains what data we collect and how we use it.`,
    sections: [
      {
        heading: 'Information we collect',
        body: [
          'Account data: name, email, phone, and password (stored hashed).',
          'Order data: shipping/billing address, items purchased, and order history.',
          'Payment data: processed securely by Stripe — we never store full card numbers.',
          'Usage data: pages viewed and actions taken, via cookies and analytics tools.',
        ],
      },
      {
        heading: 'How we use your information',
        body: [
          'To process orders, subscriptions, and deliveries.',
          'To provide customer support and account management.',
          'To send transactional emails and, with your consent, marketing emails.',
          'To improve our products, site, and advertising.',
        ],
      },
      {
        heading: 'Sharing',
        body: [
          'We share data with processors strictly to operate the service: Stripe (payments), Resend (email), Supabase (database/auth), and analytics providers.',
          'We do not sell your personal data.',
        ],
      },
      {
        heading: 'Your rights',
        body: [
          'You may access, correct, or request deletion of your personal data, and withdraw marketing consent at any time, by contacting us or using your account settings.',
        ],
      },
    ],
  },
  terms: {
    slug: 'terms',
    title: 'Terms & Conditions',
    updated: '2026-06-04',
    intro: `These terms govern your use of ${SITE.name} and your purchases. By using the site you agree to them.`,
    sections: [
      {
        heading: 'Orders & pricing',
        body: [
          'All prices are in Malaysian Ringgit (RM) and include applicable taxes unless stated.',
          'We may correct pricing errors and cancel affected orders with a full refund.',
        ],
      },
      {
        heading: 'Subscriptions',
        body: [
          'Subscriptions renew automatically at the selected interval until cancelled.',
          'You may pause, skip, or cancel anytime from your account before the next billing date. Cancellation stops future charges.',
        ],
      },
      {
        heading: 'Use of products',
        body: [
          'Our products are food/dietary supplements, not medicines. They are not intended to diagnose, treat, cure, or prevent any disease.',
          'Consult a healthcare professional before use if you are pregnant, nursing, taking medication, or have a medical condition.',
        ],
      },
      {
        heading: 'Limitation of liability',
        body: [
          'To the extent permitted by Malaysian law, our liability is limited to the amount you paid for the relevant order.',
        ],
      },
    ],
  },
  refund: {
    slug: 'refund',
    title: 'Refund Policy',
    updated: '2026-06-04',
    intro: 'We want you to be satisfied with your purchase.',
    sections: [
      {
        heading: '30-day satisfaction',
        body: [
          'If you are not satisfied, contact us within 30 days of delivery for a refund or exchange.',
          'Items should be returned with at least half the product remaining, where applicable.',
        ],
      },
      {
        heading: 'How refunds are issued',
        body: [
          'Approved refunds are returned to your original payment method via Stripe, typically within 5–10 business days.',
          'Shipping fees are non-refundable unless the return is due to our error.',
        ],
      },
      {
        heading: 'Damaged or incorrect items',
        body: [
          'If your order arrives damaged or incorrect, contact us within 7 days with photos and we will make it right at no cost to you.',
        ],
      },
    ],
  },
  shipping: {
    slug: 'shipping',
    title: 'Shipping Policy',
    updated: '2026-06-04',
    intro: 'We ship across Malaysia.',
    sections: [
      {
        heading: 'Rates & timing',
        body: [
          'Free shipping on orders over RM 200. A flat RM 10 fee applies below that.',
          'Orders are typically dispatched within 1–2 business days; delivery usually takes 2–5 business days depending on location.',
        ],
      },
      {
        heading: 'Tracking',
        body: [
          'You will receive a tracking number by email once your order ships, also visible in your account under Orders.',
        ],
      },
    ],
  },
  cookies: {
    slug: 'cookies',
    title: 'Cookie Policy',
    updated: '2026-06-04',
    intro: 'We use cookies and similar technologies to operate the site and understand usage.',
    sections: [
      {
        heading: 'Types of cookies',
        body: [
          'Essential: required for cart, checkout, and login to function.',
          'Analytics: help us understand site usage (PostHog, Google Analytics).',
          'Marketing: measure ad performance (Meta Pixel).',
        ],
      },
      {
        heading: 'Managing cookies',
        body: [
          'You can control cookies through your browser settings. Disabling essential cookies may break parts of the site.',
        ],
      },
    ],
  },
};

export const LEGAL_SLUGS = Object.keys(LEGAL_DOCS);
