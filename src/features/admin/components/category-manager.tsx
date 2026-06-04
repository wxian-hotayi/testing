'use client';

import { useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Plus } from 'lucide-react';
import { upsertCategoryAction, deleteCategoryAction, type AdminResult } from '../actions';
import { DeleteButton } from './delete-button';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Tables } from '@/types/database.types';

type Category = Tables<'categories'>;

function Save() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button>;
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [editing, setEditing] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [state, action] = useActionState<AdminResult | null, FormData>(upsertCategoryAction, null);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {categories.map((c) => (
          <div key={c.id} className="rounded-lg border p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{c.name}</span>
              <Badge variant={c.is_active ? 'success' : 'muted'}>{c.is_active ? 'Active' : 'Hidden'}</Badge>
            </div>
            <p className="text-muted-foreground">/{c.slug}</p>
            <div className="mt-2 flex gap-4">
              <button onClick={() => { setEditing(c); setShowForm(true); }} className="text-primary hover:underline">Edit</button>
              <DeleteButton action={deleteCategoryAction} id={c.id} />
            </div>
          </div>
        ))}
      </div>

      {!showForm ? (
        <Button variant="outline" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="size-4" /> Add category
        </Button>
      ) : (
        <form action={action} className="grid max-w-md gap-3 rounded-lg border p-4">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <Input name="name" label="Name" defaultValue={editing?.name} required />
          <Input name="slug" label="Slug" defaultValue={editing?.slug} required />
          <Input name="description" label="Description" defaultValue={editing?.description ?? ''} />
          <Input name="position" label="Position" type="number" defaultValue={editing?.position ?? 0} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_active" defaultChecked={editing?.is_active ?? true} className="size-4 accent-[hsl(var(--primary))]" />
            Active
          </label>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="flex gap-2">
            <Save />
            <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );
}

function Input({ label, name, ...props }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium">{label}</label>
      <input id={name} name={name} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" {...props} />
    </div>
  );
}
