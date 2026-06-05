'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, UserX, UserCheck, Trash2 } from 'lucide-react';
import {
  changeMemberRoleAction,
  setMemberStatusAction,
  bulkSetMemberStatusAction,
  transferOwnershipAction,
  type MemberActionResult,
} from '../actions';
import {
  ASSIGNABLE_ROLES,
  STORE_ROLE_LABELS,
  MEMBER_STATUS_LABELS,
  type MemberStatus,
} from '../policy';
import type { MemberView } from '../queries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const STATUS_VARIANT: Record<MemberStatus, 'success' | 'muted' | 'destructive'> = {
  active: 'success',
  suspended: 'muted',
  removed: 'destructive',
};

export function MembersTable({
  members,
  canTransfer,
}: {
  members: MemberView[];
  /** Whether the current actor may transfer ownership (owner / platform admin). */
  canTransfer: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<MemberActionResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (roleFilter !== 'all' && m.role !== roleFilter) return false;
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (q && !(m.email?.toLowerCase().includes(q) || m.full_name?.toLowerCase().includes(q)))
        return false;
      return true;
    });
  }, [members, search, roleFilter, statusFilter]);

  function run(fn: () => Promise<MemberActionResult>) {
    startTransition(async () => {
      const res = await fn();
      setFeedback(res);
      if (res.ok) {
        setSelected(new Set());
        router.refresh();
      }
    });
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allVisibleSelected = filtered.length > 0 && filtered.every((m) => selected.has(m.id));

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email…"
          className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Search members"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          aria-label="Filter by role"
        >
          <option value="all">All roles</option>
          <option value="owner">Owner</option>
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {STORE_ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="removed">Removed</option>
        </select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-secondary/40 p-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => run(() => bulkSetMemberStatusAction([...selected], 'suspended'))}
          >
            Suspend
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => run(() => bulkSetMemberStatusAction([...selected], 'active'))}
          >
            Reactivate
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() => run(() => bulkSetMemberStatusAction([...selected], 'removed'))}
          >
            Remove
          </Button>
        </div>
      )}

      {feedback && (
        <p
          aria-live="polite"
          className={`text-sm ${feedback.error ? 'text-destructive' : 'text-success'}`}
        >
          {feedback.error ?? feedback.message}
        </p>
      )}

      {/* Table (horizontal scroll on mobile) */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b bg-secondary/40 text-left">
            <tr>
              <th className="p-3">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allVisibleSelected}
                  onChange={(e) =>
                    setSelected(e.target.checked ? new Set(filtered.map((m) => m.id)) : new Set())
                  }
                />
              </th>
              <th className="p-3">Member</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No members match these filters.
                </td>
              </tr>
            )}
            {filtered.map((m) => {
              const isOwner = m.role === 'owner';
              const isRemoved = m.status === 'removed';
              return (
                <tr key={m.id} className="border-b last:border-0 align-middle">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${m.email ?? m.user_id}`}
                      checked={selected.has(m.id)}
                      onChange={() => toggle(m.id)}
                    />
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{m.full_name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">{m.email ?? m.user_id}</div>
                  </td>
                  <td className="p-3">
                    {isOwner ? (
                      <Badge variant="accent" className="gap-1">
                        <Crown className="size-3" /> Owner
                      </Badge>
                    ) : (
                      <select
                        value={m.role}
                        disabled={pending || isRemoved}
                        onChange={(e) => run(() => changeMemberRoleAction(m.id, e.target.value))}
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        aria-label={`Role for ${m.email ?? m.user_id}`}
                      >
                        {/* legacy 'staff' shown only if currently set */}
                        {m.role === 'staff' && <option value="staff">Staff (legacy)</option>}
                        {ASSIGNABLE_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {STORE_ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="p-3">
                    <Badge variant={STATUS_VARIANT[m.status]}>
                      {MEMBER_STATUS_LABELS[m.status]}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      {m.status === 'active' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Suspend"
                          disabled={pending}
                          onClick={() => run(() => setMemberStatusAction(m.id, 'suspended'))}
                        >
                          <UserX className="size-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Reactivate"
                          disabled={pending}
                          onClick={() => run(() => setMemberStatusAction(m.id, 'active'))}
                        >
                          <UserCheck className="size-4" />
                        </Button>
                      )}
                      {canTransfer && !isOwner && m.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Transfer ownership"
                          disabled={pending}
                          onClick={() => {
                            if (window.confirm('Transfer store ownership to this member? You will become an Admin.'))
                              run(() => transferOwnershipAction(m.id));
                          }}
                        >
                          <Crown className="size-4" />
                        </Button>
                      )}
                      {!isRemoved && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Remove"
                          disabled={pending}
                          onClick={() => {
                            if (window.confirm('Remove this member from the store?'))
                              run(() => setMemberStatusAction(m.id, 'removed'));
                          }}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
