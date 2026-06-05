import Link from 'next/link';
import { Store as StoreIcon, ExternalLink } from 'lucide-react';
import { listMyStores } from '@/features/stores/queries';
import { STORE_ROLE_LABELS, type StoreMemberRole } from '@/features/members/policy';
import { env } from '@/lib/env';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

export const metadata = { title: 'My stores' };

function storeUrl(slug: string): string {
  try {
    const site = new URL(env.NEXT_PUBLIC_SITE_URL);
    return `${site.protocol}//${slug}.${site.host}`;
  } catch {
    return `https://${slug}.example.com`;
  }
}

export default async function AccountStoresPage() {
  const stores = await listMyStores();
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">My stores</h2>
        <Link href="/account/stores/new" className={buttonVariants({ size: 'sm' })}>
          Create store
        </Link>
      </div>

      {stores.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <StoreIcon className="mx-auto mb-3 size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            You don’t manage any stores yet.
          </p>
          <Link href="/account/stores/new" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            Create your first store →
          </Link>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {stores.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div>
                <div className="font-medium">{s.name}</div>
                <a
                  href={storeUrl(s.slug)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {s.slug} <ExternalLink className="size-3" />
                </a>
              </div>
              <div className="flex items-center gap-2">
                {s.myRole && (
                  <Badge variant="muted">
                    {STORE_ROLE_LABELS[s.myRole as StoreMemberRole] ?? s.myRole}
                  </Badge>
                )}
                <Badge variant={s.status === 'active' ? 'success' : 'muted'}>{s.status}</Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
