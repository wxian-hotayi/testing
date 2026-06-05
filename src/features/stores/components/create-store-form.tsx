'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createStoreAction, type StoreActionResult } from '../actions';
import { slugify, validateSlug, slugErrorMessage } from '../policy';
import { Button } from '@/components/ui/button';

type Availability = { available: boolean; reason?: string } | null;

function availabilityMessage(slug: string, a: Availability, checking: boolean): {
  text: string;
  ok: boolean;
} | null {
  if (!slug) return null;
  if (checking) return { text: 'Checking availability…', ok: false };
  if (!a) return null;
  if (a.available) return { text: 'Available', ok: true };
  if (a.reason === 'taken') return { text: 'That address is taken.', ok: false };
  if (a.reason && a.reason !== 'empty') {
    return { text: slugErrorMessage(a.reason as Exclude<ReturnType<typeof validateSlug>, null>), ok: false };
  }
  return { text: 'Unavailable.', ok: false };
}

export function CreateStoreForm({ rootDomain }: { rootDomain: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<StoreActionResult | null, FormData>(
    (_prev, fd) => createStoreAction(_prev, fd),
    null,
  );

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [avail, setAvail] = useState<Availability>(null);
  const [checking, setChecking] = useState(false);

  // Suggest the slug from the name until the user edits the slug directly.
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  // Debounced availability check.
  useEffect(() => {
    const s = slugify(slug);
    setAvail(null);
    if (!s) return;
    const localErr = validateSlug(s);
    if (localErr) {
      setAvail({ available: false, reason: localErr });
      return;
    }
    setChecking(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stores/slug-available?slug=${encodeURIComponent(s)}`);
        const data = await res.json();
        setAvail({ available: !!data.available, reason: data.reason });
      } catch {
        setAvail(null);
      } finally {
        setChecking(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [slug]);

  useEffect(() => {
    if (state?.ok) router.push('/account/stores');
  }, [state, router]);

  const msg = availabilityMessage(slugify(slug), avail, checking);
  const canSubmit = !pending && !checking && avail?.available !== false && slugify(slug).length > 0;

  return (
    <form action={action} className="max-w-lg space-y-4">
      <div>
        <label htmlFor="store-name" className="mb-1 block text-sm font-medium">
          Store name
        </label>
        <input
          id="store-name"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Supplements"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>

      <div>
        <label htmlFor="store-slug" className="mb-1 block text-sm font-medium">
          Store address
        </label>
        <div className="flex items-center gap-1">
          <input
            id="store-slug"
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="acme"
            className="h-10 w-40 rounded-md border border-input bg-background px-3 text-sm"
          />
          <span className="text-sm text-muted-foreground">.{rootDomain}</span>
        </div>
        {msg && (
          <p className={`mt-1 text-xs ${msg.ok ? 'text-success' : 'text-destructive'}`}>
            {msg.text}
          </p>
        )}
      </div>

      <div className="flex gap-4">
        <div>
          <label htmlFor="store-currency" className="mb-1 block text-sm font-medium">
            Currency
          </label>
          <select
            id="store-currency"
            name="currency"
            defaultValue="MYR"
            className="h-10 w-28 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="MYR">MYR</option>
            <option value="SGD">SGD</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label htmlFor="store-color" className="mb-1 block text-sm font-medium">
            Brand colour
          </label>
          <input
            id="store-color"
            name="primary_color"
            placeholder="#16a34a"
            className="h-10 w-32 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
      </div>

      <Button type="submit" disabled={!canSubmit}>
        {pending ? 'Creating…' : 'Create store'}
      </Button>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
