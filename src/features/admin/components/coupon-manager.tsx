'use client';

import { useState, useTransition, useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { Plus } from 'lucide-react';
import { upsertCouponAction, toggleCouponAction, type AdminResult } from '../actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatMoney, toMajor } from '@/lib/money';
import type { Tables } from '@/types/database.types';

type Coupon = Tables<'coupons'>;

function Save() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save coupon'}</Button>;
}

function describe(c: Coupon): string {
  if (c.discount_type === 'percentage') return `${c.discount_value}% off`;
  if (c.discount_type === 'fixed_amount') return `${formatMoney(c.discount_value)} off`;
  return 'Free shipping';
}

export function CouponManager({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [state, action] = useActionState<AdminResult | null, FormData>(upsertCouponAction, null);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-secondary/40 text-left">
            <tr><th className="p-3">Code</th><th className="p-3">Discount</th><th className="p-3">Min order</th><th className="p-3">Status</th><th className="p-3" /></tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No coupons yet.</td></tr>
            ) : coupons.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="p-3 font-mono font-semibold">{c.code}</td>
                <td className="p-3">{describe(c)}</td>
                <td className="p-3">{c.min_order_sen ? formatMoney(c.min_order_sen) : '—'}</td>
                <td className="p-3"><Badge variant={c.is_active ? 'success' : 'muted'}>{c.is_active ? 'Active' : 'Off'}</Badge></td>
                <td className="p-3">
                  <div className="flex justify-end gap-4">
                    <button onClick={() => { setEditing(c); setShowForm(true); }} className="text-primary hover:underline">Edit</button>
                    <button
                      disabled={pending}
                      onClick={() => startTransition(async () => { await toggleCouponAction(c.id, !c.is_active); router.refresh(); })}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {c.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!showForm ? (
        <Button variant="outline" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="size-4" /> Add coupon
        </Button>
      ) : (
        <form action={action} className="grid max-w-md gap-3 rounded-lg border p-4">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <Input name="code" label="Code" defaultValue={editing?.code} required />
          <div>
            <label htmlFor="discount_type" className="mb-1 block text-sm font-medium">Type</label>
            <select id="discount_type" name="discount_type" defaultValue={editing?.discount_type ?? 'percentage'} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="percentage">Percentage</option>
              <option value="fixed_amount">Fixed amount (RM)</option>
              <option value="free_shipping">Free shipping</option>
            </select>
          </div>
          <Input name="discount_value" label="Value (% or RM)" type="number" step="0.01" defaultValue={editing ? (editing.discount_type === 'fixed_amount' ? toMajor(editing.discount_value) : editing.discount_value) : ''} />
          <Input name="min_order" label="Min order (RM)" type="number" step="0.01" defaultValue={editing ? toMajor(editing.min_order_sen) : ''} />
          <Input name="usage_limit_per_user" label="Uses per customer (blank = unlimited)" type="number" defaultValue={editing?.usage_limit_per_user ?? ''} />
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
