'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { upsertProductAction, type AdminResult } from '../actions';
import { Button } from '@/components/ui/button';
import { toMajor } from '@/lib/money';
import type { Tables } from '@/types/database.types';

function Save() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save product'}</Button>;
}

export function ProductForm({
  product,
  categories,
}: {
  product?: Tables<'products'>;
  categories: Pick<Tables<'categories'>, 'id' | 'name'>[];
}) {
  const [state, action] = useActionState<AdminResult | null, FormData>(
    upsertProductAction,
    null,
  );
  const benefits = Array.isArray(product?.benefits)
    ? (product!.benefits as string[]).join('\n')
    : '';

  return (
    <form action={action} className="max-w-2xl space-y-4">
      {product && <input type="hidden" name="id" value={product.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Name" defaultValue={product?.name} required />
        <Field name="slug" label="Slug" defaultValue={product?.slug} required />
        <Field name="sku" label="SKU" defaultValue={product?.sku ?? ''} />
        <div>
          <Label htmlFor="category_id">Category</Label>
          <select
            id="category_id"
            name="category_id"
            defaultValue={product?.category_id ?? ''}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <Field name="price" label="Price (RM)" type="number" step="0.01" defaultValue={product ? toMajor(product.price_sen) : ''} required />
        <Field name="compare_at_price" label="Compare-at price (RM)" type="number" step="0.01" defaultValue={product?.compare_at_price_sen ? toMajor(product.compare_at_price_sen) : ''} />
        <Field name="stock_quantity" label="Stock quantity" type="number" defaultValue={product?.stock_quantity ?? 0} />
        <Field name="low_stock_threshold" label="Low-stock threshold" type="number" defaultValue={product?.low_stock_threshold ?? 10} />
      </div>
      <Field name="subtitle" label="Subtitle" defaultValue={product?.subtitle ?? ''} />
      <TextArea name="description" label="Description" defaultValue={product?.description ?? ''} />
      <TextArea name="ingredients" label="Ingredients" defaultValue={product?.ingredients ?? ''} />
      <TextArea name="usage_instructions" label="Usage instructions" defaultValue={product?.usage_instructions ?? ''} />
      <TextArea name="benefits" label="Benefits (one per line)" defaultValue={benefits} />

      <div className="flex flex-wrap gap-4">
        <Check name="is_active" label="Active" defaultChecked={product?.is_active ?? true} />
        <Check name="is_featured" label="Featured" defaultChecked={product?.is_featured ?? false} />
        <Check name="is_best_seller" label="Best seller" defaultChecked={product?.is_best_seller ?? false} />
        <Check name="is_subscribable" label="Subscribable" defaultChecked={product?.is_subscribable ?? true} />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex gap-2">
        <Save />
        <Link href="/admin/products" className="inline-flex items-center px-4 text-sm text-muted-foreground hover:text-foreground">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium">{children}</label>;
}
function Field({ label, name, ...props }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <input id={name} name={name} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" {...props} />
    </div>
  );
}
function TextArea({ label, name, ...props }: { label: string; name: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <textarea id={name} name={name} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...props} />
    </div>
  );
}
function Check({ label, name, ...props }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} className="size-4 accent-[hsl(var(--primary))]" {...props} />
      {label}
    </label>
  );
}
