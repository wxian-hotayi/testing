import { describe, it, expect } from 'vitest';
import {
  PERMISSIONS,
  ROLE_KEYS,
  ROLE_PERMISSIONS,
  permissionsForRole,
  roleHasPermission,
  resolveRoleKey,
  isOperator,
} from './permissions';

describe('permission matrix', () => {
  it('defines a permission set for every role', () => {
    for (const role of ROLE_KEYS) {
      expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
    }
  });

  it('only references known permissions', () => {
    const known = new Set<string>(PERMISSIONS);
    for (const role of ROLE_KEYS) {
      for (const p of ROLE_PERMISSIONS[role]) expect(known.has(p)).toBe(true);
    }
  });

  it('super_admin has every permission; admin has all but platform.manage', () => {
    expect(permissionsForRole('super_admin')).toEqual([...PERMISSIONS]);
    expect(roleHasPermission('super_admin', 'platform.manage')).toBe(true);
    expect(roleHasPermission('admin', 'platform.manage')).toBe(false);
    expect(roleHasPermission('admin', 'members.manage')).toBe(true);
  });

  it('customer is not an operator and has no permissions', () => {
    expect(permissionsForRole('customer')).toEqual([]);
    expect(isOperator('customer')).toBe(false);
    expect(isOperator('support')).toBe(true);
  });

  it('departmental roles are disjoint where it matters', () => {
    // Marketing can run campaigns but not touch stock.
    expect(roleHasPermission('marketing', 'marketing.send')).toBe(true);
    expect(roleHasPermission('marketing', 'inventory.adjust')).toBe(false);
    // Warehouse can adjust stock but not run marketing or refund.
    expect(roleHasPermission('warehouse', 'inventory.adjust')).toBe(true);
    expect(roleHasPermission('warehouse', 'marketing.send')).toBe(false);
    expect(roleHasPermission('warehouse', 'orders.refund')).toBe(false);
    // Support can refund + read customers but not edit the catalog.
    expect(roleHasPermission('support', 'orders.refund')).toBe(true);
    expect(roleHasPermission('support', 'customers.read')).toBe(true);
    expect(roleHasPermission('support', 'products.write')).toBe(false);
  });
});

describe('resolveRoleKey', () => {
  it('platform admin → super_admin (regardless of other roles)', () => {
    expect(
      resolveRoleKey({ isPlatformAdmin: true, storeRole: 'support', profileRole: 'customer' }),
    ).toBe('super_admin');
  });

  it('store membership wins over legacy profile role', () => {
    expect(
      resolveRoleKey({ isPlatformAdmin: false, storeRole: 'marketing', profileRole: 'customer' }),
    ).toBe('marketing');
    expect(
      resolveRoleKey({ isPlatformAdmin: false, storeRole: 'owner', profileRole: 'customer' }),
    ).toBe('admin');
  });

  it('legacy fallback: global admin/staff map to admin/manager for the default store', () => {
    expect(
      resolveRoleKey({ isPlatformAdmin: false, storeRole: null, profileRole: 'admin' }),
    ).toBe('admin');
    expect(
      resolveRoleKey({ isPlatformAdmin: false, storeRole: null, profileRole: 'staff' }),
    ).toBe('manager');
  });

  it('shoppers resolve to customer', () => {
    expect(
      resolveRoleKey({ isPlatformAdmin: false, storeRole: null, profileRole: 'customer' }),
    ).toBe('customer');
  });
});
