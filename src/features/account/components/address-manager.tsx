'use client';

import { useEffect, useState, useActionState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { saveAddressAction, deleteAddressAction, type ActionResult } from '../actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Tables } from '@/types/database.types';

type Address = Tables<'addresses'>;

function SaveBtn() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save address'}</Button>;
}

export function AddressManager({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Address | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [state, action] = useActionState<ActionResult | null, FormData>(
    saveAddressAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      setShowForm(false);
      setEditing(null);
      router.refresh();
    }
  }, [state, router]);

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }
  function openEdit(a: Address) {
    setEditing(a);
    setShowForm(true);
  }
  function remove(id: string) {
    if (!confirm('Delete this address?')) return;
    startTransition(async () => {
      await deleteAddressAction(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {addresses.map((a) => (
          <div key={a.id} className="rounded-lg border p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{a.recipient_name}</span>
              {a.is_default && <Badge>Default</Badge>}
            </div>
            <p className="mt-1 text-muted-foreground">
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ''}
              <br />
              {a.postal_code} {a.city}, {a.state}, {a.country}
            </p>
            <div className="mt-3 flex gap-3">
              <button onClick={() => openEdit(a)} className="flex items-center gap-1 text-primary hover:underline">
                <Pencil className="size-3.5" /> Edit
              </button>
              <button onClick={() => remove(a.id)} disabled={pending} className="flex items-center gap-1 text-muted-foreground hover:text-destructive">
                <Trash2 className="size-3.5" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {!showForm ? (
        <Button variant="outline" onClick={openAdd}>
          <Plus className="size-4" /> Add address
        </Button>
      ) : (
        <form action={action} className="grid max-w-lg gap-3 rounded-lg border p-4">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <Input name="recipient_name" label="Recipient name" defaultValue={editing?.recipient_name} required />
          <Input name="phone" label="Phone" defaultValue={editing?.phone ?? ''} />
          <Input name="line1" label="Address line 1" defaultValue={editing?.line1} required />
          <Input name="line2" label="Address line 2" defaultValue={editing?.line2 ?? ''} />
          <div className="grid grid-cols-2 gap-3">
            <Input name="city" label="City" defaultValue={editing?.city} required />
            <Input name="state" label="State" defaultValue={editing?.state} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input name="postal_code" label="Postal code" defaultValue={editing?.postal_code} required />
            <Input name="country" label="Country" defaultValue={editing?.country ?? 'MY'} required />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_default" defaultChecked={editing?.is_default} className="size-4 accent-[hsl(var(--primary))]" />
            Set as default
          </label>
          {state && !state.ok && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="flex gap-2">
            <SaveBtn />
            <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setEditing(null); }}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function Input({
  label,
  name,
  ...props
}: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium">{label}</label>
      <input
        id={name}
        name={name}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        {...props}
      />
    </div>
  );
}
