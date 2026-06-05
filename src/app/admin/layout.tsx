import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Leaf, LogOut, ExternalLink } from 'lucide-react';
import { AdminNav } from '@/features/admin/components/admin-nav';
import { getCurrentActor } from '@/lib/rbac/actor';
import { ROLE_META, isOperator } from '@/lib/rbac/permissions';
import { signOut } from '@/features/auth/actions';
import { Badge } from '@/components/ui/badge';

/**
 * Admin chrome. Middleware gates `/admin/*` to operators; this resolves the
 * caller's full RBAC actor and passes their permissions to the nav so menu
 * items are hidden when not permitted (defense-in-depth — each server action
 * re-checks its own permission).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await getCurrentActor();
  if (!actor || !isOperator(actor.roleKey)) {
    redirect('/');
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2 font-display text-lg font-bold">
              <Leaf className="size-6 text-primary" aria-hidden />
              Vitalis Admin
            </Link>
            <Badge variant="muted">{ROLE_META[actor.roleKey].label}</Badge>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ExternalLink className="size-4" /> View store
            </Link>
            <form action={signOut}>
              <button type="submit" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-destructive">
                <LogOut className="size-4" /> Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="container flex-1 py-8">
        <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
          <aside>
            <AdminNav permissions={actor.permissions} />
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
