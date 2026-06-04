import Link from 'next/link';
import { getMySubscriptions } from '@/features/account/queries';
import { SubscriptionManager } from '@/features/account/components/subscription-manager';

export default async function SubscriptionsPage() {
  const subscriptions = await getMySubscriptions();

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold">Your subscriptions</h2>
      {subscriptions.length === 0 ? (
        <p className="rounded-lg border p-6 text-sm text-muted-foreground">
          You have no subscriptions.{' '}
          <Link href="/subscribe" className="text-primary hover:underline">
            Subscribe &amp; save 15%
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((sub) => (
            <SubscriptionManager key={sub.id} sub={sub} />
          ))}
        </div>
      )}
    </div>
  );
}
