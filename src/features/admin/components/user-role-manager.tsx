'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setUserRoleAction } from '../actions';
import { USER_ROLES } from '@/lib/constants';
import type { Tables, UserRole } from '@/types/database.types';

export function UserRoleManager({
  users,
  canManage = true,
}: {
  users: Tables<'profiles'>[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-secondary/40 text-left">
          <tr><th className="p-3">Email</th><th className="p-3">Name</th><th className="p-3">Joined</th><th className="p-3">Role</th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b last:border-0">
              <td className="p-3">{u.email}</td>
              <td className="p-3">{u.full_name ?? '—'}</td>
              <td className="p-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString('en-MY')}</td>
              <td className="p-3">
                <select
                  defaultValue={u.role}
                  disabled={pending || !canManage}
                  onChange={(e) =>
                    startTransition(async () => {
                      await setUserRoleAction(u.id, e.target.value as UserRole);
                      router.refresh();
                    })
                  }
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm capitalize"
                >
                  {USER_ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
