import type { Metadata } from 'next';
import Link from 'next/link';
import { Leaf } from 'lucide-react';
import { AuthForm } from '@/features/auth/components/auth-form';
import { buildMetadata } from '@/lib/seo';
import { SITE } from '@/lib/constants';

export const metadata: Metadata = buildMetadata({
  title: 'Sign in',
  path: '/login',
  noIndex: true,
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const safeNext = next && next.startsWith('/') ? next : '/account';

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-secondary/30 p-6">
      <Link href="/" className="mb-8 flex items-center gap-2 font-display text-xl font-bold">
        <Leaf className="size-7 text-primary" aria-hidden />
        {SITE.name}
      </Link>
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-sm">
        <AuthForm next={safeNext} initialError={error ? 'Authentication failed.' : undefined} />
      </div>
    </main>
  );
}
