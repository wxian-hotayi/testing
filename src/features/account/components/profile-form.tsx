'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { updateProfileAction, type ActionResult } from '../actions';
import { Button } from '@/components/ui/button';
import type { Profile } from '@/types/database.types';

function Save() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save changes'}</Button>;
}

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(
    updateProfileAction,
    null,
  );

  return (
    <form action={action} className="max-w-md space-y-4">
      <div>
        <label htmlFor="full_name" className="mb-1 block text-sm font-medium">Full name</label>
        <input
          id="full_name"
          name="full_name"
          defaultValue={profile?.full_name ?? ''}
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
        <input
          id="email"
          value={profile?.email ?? ''}
          disabled
          className="h-11 w-full rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground"
        />
      </div>
      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium">Phone</label>
        <input
          id="phone"
          name="phone"
          defaultValue={profile?.phone ?? ''}
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="marketing_opt_in"
          defaultChecked={profile?.marketing_opt_in ?? false}
          className="size-4 accent-[hsl(var(--primary))]"
        />
        Email me offers and product news
      </label>
      {state && (
        <p className={state.ok ? 'text-sm text-success' : 'text-sm text-destructive'}>
          {state.ok ? 'Profile updated.' : state.error}
        </p>
      )}
      <Save />
    </form>
  );
}
