import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CreateStoreForm } from '@/features/stores/components/create-store-form';
import { rootDomainFromSiteUrl } from '@/lib/tenant/resolve';
import { env } from '@/lib/env';

export const metadata = { title: 'Create a store' };

export default function NewStorePage() {
  const rootDomain = rootDomainFromSiteUrl(env.NEXT_PUBLIC_SITE_URL);
  return (
    <div>
      <Link
        href="/account/stores"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to my stores
      </Link>
      <h2 className="mb-1 text-lg font-bold">Create a store</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        You’ll become the owner and can invite teammates afterwards. Your store
        will live at <code>your-slug.{rootDomain}</code>.
      </p>
      <CreateStoreForm rootDomain={rootDomain} />
    </div>
  );
}
