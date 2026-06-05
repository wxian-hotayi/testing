/**
 * Pure membership policy — no I/O, fully unit-testable. The server actions in
 * `actions.ts` enforce these rules before mutating; keeping the logic here means
 * the invariants (sole-owner protection, assignable roles, valid transitions)
 * are tested independently of the database.
 */
import type { Enums } from '@/types/database.types';

export type StoreMemberRole = Enums<'store_member_role'>;
export type MemberStatus = Enums<'store_member_status'>;
export type InvitationStatus = Enums<'store_invitation_status'>;

/**
 * Roles assignable via invite / role-change. `owner` is intentionally excluded
 * — ownership moves only through `transferOwnership`. `staff` is the legacy
 * generic role and is not offered in the UI.
 */
export const ASSIGNABLE_ROLES = [
  'admin',
  'manager',
  'marketing',
  'warehouse',
  'support',
] as const satisfies readonly StoreMemberRole[];

export function isAssignableRole(role: string): role is StoreMemberRole {
  return (ASSIGNABLE_ROLES as readonly string[]).includes(role);
}

/** Display labels for every store_member_role (incl. owner/legacy staff). */
export const STORE_ROLE_LABELS: Record<StoreMemberRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  marketing: 'Marketing',
  warehouse: 'Warehouse',
  support: 'Customer Support',
  staff: 'Staff (legacy)',
};

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  removed: 'Removed',
};

export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  revoked: 'Cancelled',
  expired: 'Expired',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export type MemberLike = {
  id: string;
  user_id: string;
  role: StoreMemberRole;
  status: MemberStatus;
};

/** Members who are active owners of the store. */
export function activeOwners(members: MemberLike[]): MemberLike[] {
  return members.filter((m) => m.role === 'owner' && m.status === 'active');
}

/**
 * Would applying `next` to `memberId` leave the store with zero active owners?
 * True only when the target is currently the *sole* active owner and the change
 * would drop their ownership (demotion, suspension, or removal). This is the
 * "prevent self-demotion of the sole administrator" guard.
 */
export function wouldOrphanStore(
  members: MemberLike[],
  memberId: string,
  next: { role?: StoreMemberRole; status?: MemberStatus },
): boolean {
  const target = members.find((m) => m.id === memberId);
  if (!target) return false;
  const isActiveOwner = target.role === 'owner' && target.status === 'active';
  if (!isActiveOwner) return false;
  if (activeOwners(members).length > 1) return false; // another owner remains
  const stillOwner =
    (next.role ?? target.role) === 'owner' &&
    (next.status ?? target.status) === 'active';
  return !stillOwner;
}

export type PolicyError =
  | 'invalid_role'
  | 'cannot_assign_owner'
  | 'sole_owner'
  | 'member_not_found'
  | null;

/** Validate a role change. Returns an error code or null when allowed. */
export function validateRoleChange(
  members: MemberLike[],
  memberId: string,
  nextRole: string,
): PolicyError {
  const target = members.find((m) => m.id === memberId);
  if (!target) return 'member_not_found';
  if (nextRole === 'owner') return 'cannot_assign_owner';
  if (!isAssignableRole(nextRole)) return 'invalid_role';
  if (wouldOrphanStore(members, memberId, { role: nextRole })) return 'sole_owner';
  return null;
}

/** Validate a status change (suspend / reactivate / remove). */
export function validateStatusChange(
  members: MemberLike[],
  memberId: string,
  nextStatus: MemberStatus,
): PolicyError {
  const target = members.find((m) => m.id === memberId);
  if (!target) return 'member_not_found';
  if (wouldOrphanStore(members, memberId, { status: nextStatus })) return 'sole_owner';
  return null;
}

/** Is an invitation acceptable right now? */
export function isInvitationAcceptable(
  invitation: { status: InvitationStatus; expires_at: string },
  nowMs: number,
): boolean {
  return (
    invitation.status === 'pending' &&
    new Date(invitation.expires_at).getTime() > nowMs
  );
}

/** Human-readable message for a policy error (UI + thrown errors). */
export function policyErrorMessage(error: Exclude<PolicyError, null>): string {
  switch (error) {
    case 'invalid_role':
      return 'That role cannot be assigned.';
    case 'cannot_assign_owner':
      return 'Use “Transfer ownership” to make someone the owner.';
    case 'sole_owner':
      return 'A store must keep at least one active owner. Transfer ownership first.';
    case 'member_not_found':
      return 'Member not found.';
  }
}
