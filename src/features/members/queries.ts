import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentStoreId } from '@/lib/tenant/context';
import type { Tables, Enums } from '@/types/database.types';

export type MemberView = Tables<'store_members'> & {
  email: string | null;
  full_name: string | null;
};

export type MemberFilters = {
  search?: string;
  role?: Enums<'store_member_role'> | 'all';
  status?: Enums<'store_member_status'> | 'all';
};

/**
 * List a store's members joined with their profile (email/name). Reads use the
 * service-role client; callers MUST gate on `members.manage` first (the admin
 * page and API route do). Composed (not embedded) to stay type-safe.
 */
export async function listMembers(
  storeId: string,
  filters: MemberFilters = {},
): Promise<MemberView[]> {
  const admin = createAdminClient();
  let query = admin
    .from('store_members')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: true });

  if (filters.role && filters.role !== 'all') query = query.eq('role', filters.role);
  if (filters.status === 'all') {
    // include removed
  } else if (filters.status) {
    query = query.eq('status', filters.status);
  } else {
    query = query.neq('status', 'removed'); // hide removed by default
  }

  const { data: members } = await query;
  if (!members || members.length === 0) return [];

  const userIds = [...new Set(members.map((m) => m.user_id))];
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, full_name')
    .in('id', userIds);
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  const rows: MemberView[] = members.map((m) => ({
    ...m,
    email: byId.get(m.user_id)?.email ?? null,
    full_name: byId.get(m.user_id)?.full_name ?? null,
  }));

  const search = filters.search?.trim().toLowerCase();
  if (!search) return rows;
  return rows.filter(
    (r) =>
      r.email?.toLowerCase().includes(search) ||
      r.full_name?.toLowerCase().includes(search),
  );
}

export type InvitationFilters = {
  search?: string;
  status?: Enums<'store_invitation_status'> | 'all';
};

export async function listInvitations(
  storeId: string,
  filters: InvitationFilters = {},
): Promise<Tables<'store_invitations'>[]> {
  const admin = createAdminClient();
  let query = admin
    .from('store_invitations')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  const { data } = await query;
  let rows = data ?? [];
  const search = filters.search?.trim().toLowerCase();
  if (search) rows = rows.filter((r) => r.email.toLowerCase().includes(search));
  return rows;
}

export async function listMembershipAudit(
  storeId: string,
  limit = 25,
): Promise<Tables<'membership_audit'>[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('membership_audit')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export type PendingInvitationView = Tables<'store_invitations'> & {
  storeName: string | null;
};

/**
 * Pending invitations addressed to the CURRENT user's email, across all stores.
 * Powers the accept-invite surface in the account area.
 */
export async function listMyPendingInvitations(): Promise<PendingInvitationView[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return [];

  const admin = createAdminClient();
  const { data: invites } = await admin
    .from('store_invitations')
    .select('*')
    .eq('email', user.email)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  if (!invites || invites.length === 0) return [];

  const storeIds = [...new Set(invites.map((i) => i.store_id))];
  const { data: stores } = await admin
    .from('stores')
    .select('id, name')
    .in('id', storeIds);
  const nameById = new Map((stores ?? []).map((s) => [s.id, s.name]));

  return invites.map((i) => ({ ...i, storeName: nameById.get(i.store_id) ?? null }));
}

/** Resolve the current store id for the admin members area, or throw. */
export async function requireCurrentStoreId(): Promise<string> {
  const storeId = await getCurrentStoreId();
  if (!storeId) throw new Error('No store resolved for this request.');
  return storeId;
}
