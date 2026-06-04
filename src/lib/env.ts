import { z } from 'zod';

/**
 * Validates environment variables at module load so misconfiguration fails
 * fast and loudly instead of producing confusing runtime errors deep in the
 * app. Split into client (NEXT_PUBLIC_*) and server schemas because server
 * secrets must never be bundled into the browser build.
 */

const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  NEXT_PUBLIC_GA4_MEASUREMENT_ID: z.string().optional(),
  NEXT_PUBLIC_META_PIXEL_ID: z.string().optional(),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),
  EMAIL_REPLY_TO: z.string().email().optional(),
  CRON_SECRET: z.string().min(1).optional(),
});

// Reference NEXT_PUBLIC_* vars explicitly — Next.js inlines them at build time
// only when statically referenced, so destructuring process.env won't work.
const clientEnv = clientSchema.safeParse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  NEXT_PUBLIC_GA4_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID,
  NEXT_PUBLIC_META_PIXEL_ID: process.env.NEXT_PUBLIC_META_PIXEL_ID,
});

if (!clientEnv.success) {
  console.error(
    '❌ Invalid public environment variables:',
    clientEnv.error.flatten().fieldErrors,
  );
  throw new Error('Invalid public environment variables. See .env.example.');
}

export const env = clientEnv.data;

/**
 * Server-only env. Importing this from a client component will throw at build
 * time thanks to `server-only`. Call `getServerEnv()` inside server code.
 */
let serverEnvCache: z.infer<typeof serverSchema> | null = null;

export function getServerEnv(): z.infer<typeof serverSchema> {
  if (serverEnvCache) return serverEnvCache;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(
      '❌ Invalid server environment variables:',
      parsed.error.flatten().fieldErrors,
    );
    throw new Error('Invalid server environment variables. See .env.example.');
  }
  serverEnvCache = parsed.data;
  return serverEnvCache;
}
