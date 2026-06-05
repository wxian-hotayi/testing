import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentStore } from '@/lib/tenant/context';
import { DEFAULT_STORE_SLUG } from '@/lib/tenant/resolve';
import {
  resolveRoleKey,
  permissionsForRole,
  type Permission,
  type RoleKey,
} from './permissions';
import type { Enums } from '@/types/database.types';

/**
 * The authenticated actor and their resolved permissions for the CURRENT store.
 * Plain/serializable so it can be passed from Server Components to Client
 * Components (the frontend gates UI off `permissions`).
 */
export type Actor = {
  userId: string;
  email: string | null;
  isPlatformAdmin: boolean;
  storeId: string | null;
  storeRole: Enums<'store_member_role'> | null;
  roleKey: RoleKey;
  permissions: Permission[];
};

/** Resolve the current actor, or null if not authenticated. */
export async function getCurrentActor(): Promise<Actor | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_platform_admin, email')
    .eq('id', user.id)
    .maybeSingle();

  const isPlatformAdmin = profile?.is_platform_admin ?? false;

  // Membership in the current store (per the resolved tenant) determines the
  // departmental role. RLS lets a user read their own store_members rows.
  const store = await getCurrentStore();
  const storeId = store?.id ?? null;
  // The legacy global-role fallback only applies in the default/single-store
  // context — never on a specific tenant store (prevents cross-tenant admin).
  const isDefaultStore = !store || store.slug === DEFAULT_STORE_SLUG;
  let storeRole: Enums<'store_member_role'> | null = null;
  if (storeId) {
    const { data: member } = await supabase
      .from('store_members')
      .select('role')
      .eq('store_id', storeId)
      .eq('user_id', user.id)
      .maybeSingle();
    storeRole = member?.role ?? null;
  }

  const roleKey = resolveRoleKey({
    isPlatformAdmin,
    storeRole,
    profileRole: profile?.role ?? null,
    isDefaultStore,
  });

  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? null,
    isPlatformAdmin,
    storeId,
    storeRole,
    roleKey,
    permissions: permissionsForRole(roleKey),
  };
}

/** Does the actor hold a permission? (null-safe.) */
export function actorCan(actor: Actor | null, permission: Permission): boolean {
  return !!actor && actor.permissions.includes(permission);
}

/**
 * Gate a privileged server action. Throws if the caller is unauthenticated or
 * lacks `permission`. Returns the RLS-bypassing service-role client together
 * with the actor — this app-layer check IS the security boundary for admin
 * mutations, because those mutations use the service-role client.
 */
export async function requirePermission(
  permission: Permission,
): Promise<{ admin: ReturnType<typeof createAdminClient>; actor: Actor }> {
  const actor = await getCurrentActor();
  if (!actor) throw new Error('Not authenticated.');
  if (!actor.permissions.includes(permission)) {
    throw new Error(`Forbidden: requires "${permission}".`);
  }
  return { admin: createAdminClient(), actor };
}
