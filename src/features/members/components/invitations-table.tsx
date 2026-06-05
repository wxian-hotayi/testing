'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Send, X } from 'lucide-react';
import {
  resendInvitationAction,
  cancelInvitationAction,
  type MemberActionResult,
} from '../actions';
import {
  STORE_ROLE_LABELS,
  INVITATION_STATUS_LABELS,
  type StoreMemberRole,
  type InvitationStatus,
} from '../policy';
import type { Tables } from '@/types/database.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const STATUS_VARIANT: Record<InvitationStatus, 'default' | 'success' | 'muted' | 'destructive'> = {
  pending: 'default',
  accepted: 'success',
  revoked: 'muted',
  expired: 'destructive',
};

export function InvitationsTable({ invitations }: { invitations: Tables<'store_invitations'>[] }) {
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
    return <p className="text-sm text-muted-foreground">No invitations yet.</p>;
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
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b bg-secondary/40 text-left">
            <tr>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Expires</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((inv) => (
              <tr key={inv.id} className="border-b last:border-0">
                <td className="p-3">{inv.email}</td>
                <td className="p-3">{STORE_ROLE_LABELS[inv.role as StoreMemberRole]}</td>
                <td className="p-3">
                  <Badge variant={STATUS_VARIANT[inv.status]}>
                    {INVITATION_STATUS_LABELS[inv.status]}
                  </Badge>
                </td>
                <td className="p-3 text-muted-foreground">
                  {new Date(inv.expires_at).toLocaleDateString('en-MY')}
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    {inv.status === 'pending' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Resend"
                          disabled={pending}
                          onClick={() => run(() => resendInvitationAction(inv.id))}
                        >
                          <Send className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Cancel"
                          disabled={pending}
                          onClick={() => run(() => cancelInvitationAction(inv.id))}
                        >
                          <X className="size-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
