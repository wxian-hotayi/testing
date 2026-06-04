'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import type { AdminResult } from '../actions';

/** Generic confirm + delete. The server action is passed as a prop. */
export function DeleteButton({
  action,
  id,
  confirmText = 'Delete this item? This cannot be undone.',
}: {
  action: (id: string) => Promise<AdminResult>;
  id: string;
  confirmText?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(confirmText)) return;
        startTransition(async () => {
          const res = await action(id);
          if (res.ok) router.refresh();
          else alert(res.error ?? 'Failed.');
        });
      }}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive disabled:opacity-50"
    >
      <Trash2 className="size-4" /> Delete
    </button>
  );
}
