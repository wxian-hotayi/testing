import { redirect } from 'next/navigation';
import { getCurrentActor, actorCan } from '@/lib/rbac/actor';
import { getCurrentStore } from '@/lib/tenant/context';
import { StoreSettingsForm } from '@/features/stores/components/store-settings-form';

export const metadata = { title: 'Store settings' };

export default async function AdminStorePage() {
  const actor = await getCurrentActor();
  if (!actorCan(actor, 'store.manage')) redirect('/admin');

  const store = await getCurrentStore();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Store settings</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Branding and configuration for this store.
      </p>
      {store ? (
        <StoreSettingsForm store={store} />
      ) : (
        <p className="text-sm text-muted-foreground">No store resolved for this request.</p>
      )}
    </div>
  );
}
