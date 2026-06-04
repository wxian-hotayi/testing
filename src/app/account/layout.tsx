import Link from 'next/link';
import { Leaf, LogOut } from 'lucide-react';
import { AccountNav } from '@/features/account/components/account-nav';
import { getProfile } from '@/features/account/queries';
import { signOut } from '@/features/auth/actions';
import { ReferralLinker } from '@/features/referrals/components/referral-linker';
import { SITE } from '@/lib/constants';

/**
 * Account chrome. Access is already gated by middleware (`/account/*` requires
 * a session), so this can assume an authenticated user.
 */
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  return (
    <div className="flex min-h-dvh flex-col">
      <ReferralLinker />
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <Leaf className="size-6 text-primary" aria-hidden />
            {SITE.name}
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/products" className="text-sm text-muted-foreground hover:text-foreground">
              Back to store
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-destructive"
              >
                <LogOut className="size-4" /> Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="container flex-1 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            Hi{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-sm text-muted-foreground">{profile?.email}</p>
        </div>
        <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
          <aside>
            <AccountNav />
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
