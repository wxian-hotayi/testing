'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { inviteMemberAction, type MemberActionResult } from '../actions';
import { ASSIGNABLE_ROLES, STORE_ROLE_LABELS } from '../policy';
import { Button } from '@/components/ui/button';

export function InviteForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<MemberActionResult | null, FormData>(
    (_prev, fd) => inviteMemberAction(_prev, fd),
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <label htmlFor="invite-email" className="mb-1 block text-sm font-medium">
          Invite by email
        </label>
        <input
          id="invite-email"
          name="email"
          type="email"
          required
          placeholder="teammate@email.com"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>
      <div>
        <label htmlFor="invite-role" className="mb-1 block text-sm font-medium">
          Role
        </label>
        <select
          id="invite-role"
          name="role"
          defaultValue="support"
          className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm sm:w-44"
        >
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {STORE_ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Sending…' : 'Send invite'}
      </Button>
      <p
        aria-live="polite"
        className={`text-sm sm:self-center ${
          state?.error ? 'text-destructive' : 'text-success'
        }`}
      >
        {state?.error ?? (state?.ok ? state.message : '')}
      </p>
    </form>
  );
}
