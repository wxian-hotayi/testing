'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateStoreSettingsAction, type StoreActionResult } from '../actions';
import { Button } from '@/components/ui/button';
import type { Tables } from '@/types/database.types';

export function StoreSettingsForm({ store }: { store: Tables<'stores'> }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<StoreActionResult | null, FormData>(
    (_prev, fd) => updateStoreSettingsAction(_prev, fd),
    null,
  );

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="max-w-lg space-y-4">
      <div>
        <label htmlFor="s-name" className="mb-1 block text-sm font-medium">
          Store name
        </label>
        <input
          id="s-name"
          name="name"
          required
          defaultValue={store.name}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium">Store address</span>
        <p className="text-sm text-muted-foreground">
          <code>{store.slug}</code> — the subdomain is fixed after creation.
        </p>
      </div>

      <div className="flex gap-4">
        <div>
          <label htmlFor="s-currency" className="mb-1 block text-sm font-medium">
            Currency
          </label>
          <select
            id="s-currency"
            name="currency"
            defaultValue={store.currency}
            className="h-10 w-28 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="MYR">MYR</option>
            <option value="SGD">SGD</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label htmlFor="s-color" className="mb-1 block text-sm font-medium">
            Brand colour
          </label>
          <input
            id="s-color"
            name="primary_color"
            defaultValue={store.primary_color ?? ''}
            placeholder="#16a34a"
            className="h-10 w-32 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="s-logo" className="mb-1 block text-sm font-medium">
          Logo URL
        </label>
        <input
          id="s-logo"
          name="logo_url"
          defaultValue={store.logo_url ?? ''}
          placeholder="https://…"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save settings'}
      </Button>
      {state && (
        <p className={`text-sm ${state.error ? 'text-destructive' : 'text-success'}`}>
          {state.error ?? state.message}
        </p>
      )}
    </form>
  );
}
