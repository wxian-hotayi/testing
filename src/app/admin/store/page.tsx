import { redirect } from 'next/navigation';
import { getCurrentActor, actorCan } from '@/lib/rbac/actor';
import { getCurrentStore } from '@/lib/tenant/context';
import { StoreSettingsForm } from '@/features/stores/components/store-settings-form';
import { StripeConnectPanel } from '@/features/stores/components/stripe-connect-panel';

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
        <div className="space-y-8">
          <StoreSettingsForm store={store} />
          <StripeConnectPanel
            accountId={store.stripe_account_id}
            chargesEnabled={store.stripe_charges_enabled}
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No store resolved for this request.</p>
      )}
    </div>
  );
}
