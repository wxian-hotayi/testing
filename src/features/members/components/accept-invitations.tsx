'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  acceptInvitationAction,
  declineInvitationAction,
  type MemberActionResult,
} from '../actions';
import { STORE_ROLE_LABELS, type StoreMemberRole } from '../policy';
import type { PendingInvitationView } from '../queries';
import { Button } from '@/components/ui/button';

export function AcceptInvitations({ invitations }: { invitations: PendingInvitationView[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<MemberActionResult | null>(null);

  function run(fn: () => Promise<MemberActionResult>) {
    startTransition(async () => {
      const res = await fn();
      setFeedback(res);
      if (res.ok) router.refresh();
    });
  }

  if (invitations.length === 0) {
    return <p className="text-sm text-muted-foreground">You have no pending invitations.</p>;
  }

  return (
    <div className="space-y-3">
      {feedback && (
        <p
          aria-live="polite"
          className={`text-sm ${feedback.error ? 'text-destructive' : 'text-success'}`}
        >
          {feedback.error ?? feedback.message}
        </p>
      )}
      {invitations.map((inv) => (
        <div
          key={inv.id}
          className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="font-medium">{inv.storeName ?? 'A store'}</div>
            <div className="text-sm text-muted-foreground">
              Invited as {STORE_ROLE_LABELS[inv.role as StoreMemberRole]} · expires{' '}
              {new Date(inv.expires_at).toLocaleDateString('en-MY')}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={pending}
              onClick={() => run(() => acceptInvitationAction(inv.token))}
            >
              Accept
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => run(() => declineInvitationAction(inv.token))}
            >
              Decline
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
