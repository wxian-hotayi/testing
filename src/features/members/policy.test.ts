import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isAssignableRole,
  ASSIGNABLE_ROLES,
  activeOwners,
  wouldOrphanStore,
  validateRoleChange,
  validateStatusChange,
  isInvitationAcceptable,
  type MemberLike,
} from './policy';

const members: MemberLike[] = [
  { id: 'm1', user_id: 'u1', role: 'owner', status: 'active' },
  { id: 'm2', user_id: 'u2', role: 'admin', status: 'active' },
  { id: 'm3', user_id: 'u3', role: 'marketing', status: 'active' },
  { id: 'm4', user_id: 'u4', role: 'support', status: 'suspended' },
];

describe('email + role validation', () => {
  it('validates emails', () => {
    expect(isValidEmail('a@b.com')).toBe(true);
    expect(isValidEmail('  user@store.io ')).toBe(true);
    expect(isValidEmail('nope')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
  });

  it('owner and staff are not assignable; departmental roles are', () => {
    expect(isAssignableRole('owner')).toBe(false);
    expect(isAssignableRole('staff')).toBe(false);
    expect(isAssignableRole('warehouse')).toBe(true);
    expect(ASSIGNABLE_ROLES).not.toContain('owner');
  });
});

describe('sole-owner protection', () => {
  it('counts active owners', () => {
    expect(activeOwners(members)).toHaveLength(1);
  });

  it('blocks demoting / suspending / removing the sole owner', () => {
    expect(wouldOrphanStore(members, 'm1', { role: 'admin' })).toBe(true);
    expect(wouldOrphanStore(members, 'm1', { status: 'suspended' })).toBe(true);
    expect(wouldOrphanStore(members, 'm1', { status: 'removed' })).toBe(true);
  });

  it('allows the change when another active owner exists', () => {
    const two = [...members, { id: 'm5', user_id: 'u5', role: 'owner', status: 'active' } as MemberLike];
    expect(wouldOrphanStore(two, 'm1', { role: 'admin' })).toBe(false);
  });

  it('non-owners are unaffected', () => {
    expect(wouldOrphanStore(members, 'm2', { status: 'removed' })).toBe(false);
    expect(wouldOrphanStore(members, 'm3', { role: 'support' })).toBe(false);
  });
});

describe('validateRoleChange', () => {
  it('rejects assigning owner (use transfer)', () => {
    expect(validateRoleChange(members, 'm2', 'owner')).toBe('cannot_assign_owner');
  });
  it('rejects unknown roles', () => {
    expect(validateRoleChange(members, 'm2', 'wizard')).toBe('invalid_role');
  });
  it('rejects demoting the sole owner', () => {
    expect(validateRoleChange(members, 'm1', 'manager')).toBe('sole_owner');
  });
  it('allows a normal departmental change', () => {
    expect(validateRoleChange(members, 'm3', 'warehouse')).toBeNull();
  });
  it('rejects an unknown member', () => {
    expect(validateRoleChange(members, 'nope', 'admin')).toBe('member_not_found');
  });
});

describe('validateStatusChange', () => {
  it('blocks removing the sole owner but allows suspending others', () => {
    expect(validateStatusChange(members, 'm1', 'removed')).toBe('sole_owner');
    expect(validateStatusChange(members, 'm2', 'suspended')).toBeNull();
  });
});

describe('isInvitationAcceptable', () => {
  const now = 1_000_000_000_000;
  it('accepts a pending, unexpired invite', () => {
    expect(isInvitationAcceptable({ status: 'pending', expires_at: new Date(now + 1000).toISOString() }, now)).toBe(true);
  });
  it('rejects expired or non-pending invites', () => {
    expect(isInvitationAcceptable({ status: 'pending', expires_at: new Date(now - 1000).toISOString() }, now)).toBe(false);
    expect(isInvitationAcceptable({ status: 'revoked', expires_at: new Date(now + 1000).toISOString() }, now)).toBe(false);
  });
});
