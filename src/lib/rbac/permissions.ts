/**
 * Role-Based Access Control — the canonical permission matrix.
 *
 * Pure, dependency-free, and safe to import from both client and server
 * (no I/O, no `server-only`). The matrix is the single source of truth; backend
 * enforcement lives in `actor.ts` (server actions / middleware) and the frontend
 * gates UI off the same data.
 *
 * Role model maps the 7 product roles onto the existing tenancy primitives:
 *   • super_admin → `profiles.is_platform_admin` (the SaaS operator; spans all stores)
 *   • admin … support → per-store operator roles (`store_members.role`)
 *   • customer → a shopper (no `store_members` row)
 *
 * Marketing / Warehouse / Support are PARALLEL departmental roles with disjoint
 * permission sets — not a single rank ladder — which is why access is modelled
 * as an explicit permission matrix rather than a numeric rank.
 */
import type { Enums, UserRole } from '@/types/database.types';

type StoreMemberRole = Enums<'store_member_role'>;

// --- Permissions (resource.action) -------------------------------------------
export const PERMISSIONS = [
  'dashboard.view',
  'products.read',
  'products.write',
  'products.delete',
  'categories.write',
  'inventory.adjust',
  'orders.read',
  'orders.update',
  'orders.refund',
  'coupons.write',
  'marketing.send',
  'reviews.moderate',
  'customers.read',
  'customers.manage',
  'analytics.view',
  'audit.read',
  'settings.manage',
  'store.manage',
  'members.manage',
  'platform.manage', // cross-store / tenant operations — super_admin only
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL_PERMISSIONS: Permission[] = [...PERMISSIONS];

// --- Roles -------------------------------------------------------------------
export const ROLE_KEYS = [
  'super_admin',
  'admin',
  'manager',
  'marketing',
  'warehouse',
  'support',
  'customer',
] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_META: Record<RoleKey, { label: string; description: string }> = {
  super_admin: { label: 'Super Admin', description: 'Platform operator — full control across every store.' },
  admin: { label: 'Admin', description: 'Full control of a single store.' },
  manager: { label: 'Manager', description: 'Day-to-day operations: catalog, inventory, orders, coupons.' },
  marketing: { label: 'Marketing', description: 'Growth: coupons, campaigns, reviews, analytics.' },
  warehouse: { label: 'Warehouse', description: 'Fulfilment: inventory and order processing.' },
  support: { label: 'Customer Support', description: 'Customer care: orders, refunds, customer lookup.' },
  customer: { label: 'Customer', description: 'Shopper — no admin access.' },
};

// --- The matrix --------------------------------------------------------------
export const ROLE_PERMISSIONS: Record<RoleKey, Permission[]> = {
  // Platform operator: everything, everywhere.
  super_admin: ALL_PERMISSIONS,
  // Store admin: everything within their store (no cross-store platform ops).
  admin: ALL_PERMISSIONS.filter((p) => p !== 'platform.manage'),
  // Operations manager: catalog + inventory + orders + coupons + insight.
  manager: [
    'dashboard.view',
    'products.read',
    'products.write',
    'products.delete',
    'categories.write',
    'inventory.adjust',
    'orders.read',
    'orders.update',
    'orders.refund',
    'coupons.write',
    'reviews.moderate',
    'analytics.view',
    'audit.read',
  ],
  // Marketing: growth levers, no operations/fulfilment.
  marketing: [
    'dashboard.view',
    'products.read',
    'coupons.write',
    'marketing.send',
    'reviews.moderate',
    'analytics.view',
  ],
  // Warehouse: stock + fulfilment, no marketing/finance.
  warehouse: [
    'dashboard.view',
    'products.read',
    'inventory.adjust',
    'orders.read',
    'orders.update',
  ],
  // Support: customer-facing order help + refunds, no catalog editing.
  support: [
    'dashboard.view',
    'products.read',
    'orders.read',
    'orders.update',
    'orders.refund',
    'customers.read',
    'reviews.moderate',
  ],
  // Shopper.
  customer: [],
};

export function permissionsForRole(role: RoleKey): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function roleHasPermission(role: RoleKey, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}

/** A role with at least one admin permission can reach the admin area. */
export function isOperator(role: RoleKey): boolean {
  return role !== 'customer';
}

/** Map a `store_members.role` enum value to a product RoleKey. */
function mapStoreRole(role: StoreMemberRole): RoleKey {
  switch (role) {
    case 'owner':
    case 'admin':
      return 'admin';
    case 'manager':
      return 'manager';
    case 'marketing':
      return 'marketing';
    case 'warehouse':
      return 'warehouse';
    case 'support':
      return 'support';
    case 'staff':
    default:
      return 'manager'; // legacy generic store role
  }
}

/**
 * Resolve the effective RoleKey for a user in the current store.
 *
 * Precedence: platform admin → store membership → legacy global `profiles.role`.
 *
 * The legacy global-role fallback (`profiles.role` of admin/staff) ONLY applies
 * in the default / single-store context (`isDefaultStore`). On a specific tenant
 * store, a global role must NOT leak access — otherwise any user with the legacy
 * `profiles.role='admin'` would be admin of EVERY store. `isDefaultStore` is also
 * true when no store is resolved (pre-tenancy), preserving the original
 * single-store app's behaviour.
 */
export function resolveRoleKey(args: {
  isPlatformAdmin: boolean;
  storeRole: StoreMemberRole | null;
  profileRole: UserRole | null;
  isDefaultStore: boolean;
}): RoleKey {
  if (args.isPlatformAdmin) return 'super_admin';
  if (args.storeRole) return mapStoreRole(args.storeRole);
  if (args.isDefaultStore) {
    if (args.profileRole === 'admin') return 'admin';
    if (args.profileRole === 'staff') return 'manager';
  }
  return 'customer';
}
