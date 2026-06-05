'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePermission } from '@/lib/rbac/actor';
import { sendEmail } from '@/lib/email/send';
import { env } from '@/lib/env';
import { logMembershipAudit } from './audit';
import {
  isValidEmail,
  isAssignableRole,
  validateRoleChange,
  validateStatusChange,
  policyErrorMessage,
  isInvitationAcceptable,
  type MemberLike,
  type MemberStatus,
  type StoreMemberRole,
} from './policy';

export type MemberActionResult = { ok: boolean; error?: string; message?: string };

type Admin = ReturnType<typeof createAdminClient>;

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

async function loadMembers(admin: Admin, storeId: string): Promise<MemberLike[]> {
  const { data } = await admin
    .from('store_members')
    .select('id, user_id, role, status')
    .eq('store_id', storeId);
  return (data ?? []) as MemberLike[];
}

function renderInviteEmail(args: {
  storeName: string;
  role: string;
  acceptUrl: string;
}): string {
  return `
  <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
    <h1 style="font-size:20px;margin:0 0 12px">You've been invited to ${args.storeName}</h1>
    <p style="color:#444;line-height:1.5">
      You've been invited to join <strong>${args.storeName}</strong> as
      <strong>${args.role}</strong>. Sign in with this email address and accept
      the invitation to get started.
    </p>
    <p style="margin:24px 0">
      <a href="${args.acceptUrl}"
         style="background:#16a34a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">
        Accept invitation
      </a>
    </p>
    <p style="color:#888;font-size:13px">This invitation expires in 14 days.</p>
  </div>`;
}

async function sendInviteEmail(
  admin: Admin,
  storeId: string,
  email: string,
  role: string,
  token: string,
): Promise<void> {
  const { data: store } = await admin
    .from('stores')
    .select('name')
    .eq('id', storeId)
    .maybeSingle();
  const storeName = store?.name ?? 'the store';
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  const acceptUrl = `${base}/account/invitations?token=${token}`;
  await sendEmail({
    to: email,
    subject: `You're invited to manage ${storeName} on Vitalis`,
    html: renderInviteEmail({ storeName, role, acceptUrl }),
    templateKey: 'store_invitation',
  });
}

// --- Invite ------------------------------------------------------------------
export async function inviteMemberAction(
  _prev: MemberActionResult | null,
  fd: FormData,
): Promise<MemberActionResult> {
  try {
    const { admin, actor } = await requirePermission('members.manage');
    const storeId = actor.storeId;
    if (!storeId) return { ok: false, error: 'No store resolved for this request.' };

    const email = (fd.get('email')?.toString() ?? '').trim().toLowerCase();
    const role = fd.get('role')?.toString() ?? '';
    if (!isValidEmail(email)) return { ok: false, error: 'Enter a valid email address.' };
    if (!isAssignableRole(role)) return { ok: false, error: 'Choose a valid role.' };

    // Already an active member?
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (profile) {
      const { data: existing } = await admin
        .from('store_members')
        .select('status')
        .eq('store_id', storeId)
        .eq('user_id', profile.id)
        .maybeSingle();
      if (existing?.status === 'active') {
        return { ok: false, error: 'That person is already an active member.' };
      }
    }

    // Outstanding pending invite?
    const { data: pending } = await admin
      .from('store_invitations')
      .select('id')
      .eq('store_id', storeId)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();
    if (pending) {
      return { ok: false, error: 'A pending invitation already exists — resend it instead.' };
    }

    const { data: invite, error } = await admin
      .from('store_invitations')
      .insert({
        store_id: storeId,
        email,
        role: role as StoreMemberRole,
        invited_by: actor.userId,
      })
      .select('id, token')
      .single();
    if (error || !invite) throw error ?? new Error('Could not create invitation.');

    await sendInviteEmail(admin, storeId, email, role, invite.token);
    await logMembershipAudit(admin, {
      storeId,
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'invited',
      targetEmail: email,
      newValue: { role },
    });
    revalidatePath('/admin/members');
    return { ok: true, message: `Invitation sent to ${email}.` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

export async function resendInvitationAction(invitationId: string): Promise<MemberActionResult> {
  try {
    const { admin, actor } = await requirePermission('members.manage');
    const storeId = actor.storeId;
    if (!storeId) return { ok: false, error: 'No store resolved.' };

    const { data: inv } = await admin
      .from('store_invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('store_id', storeId)
      .maybeSingle();
    if (!inv) return { ok: false, error: 'Invitation not found.' };
    if (inv.status !== 'pending') return { ok: false, error: 'Only pending invitations can be resent.' };

    await admin
      .from('store_invitations')
      .update({ expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString() })
      .eq('id', invitationId);
    await sendInviteEmail(admin, storeId, inv.email, inv.role, inv.token);
    await logMembershipAudit(admin, {
      storeId,
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'invitation_resent',
      targetEmail: inv.email,
    });
    revalidatePath('/admin/members');
    return { ok: true, message: `Invitation resent to ${inv.email}.` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

export async function cancelInvitationAction(invitationId: string): Promise<MemberActionResult> {
  try {
    const { admin, actor } = await requirePermission('members.manage');
    const storeId = actor.storeId;
    if (!storeId) return { ok: false, error: 'No store resolved.' };

    const { data: inv } = await admin
      .from('store_invitations')
      .select('email, status')
      .eq('id', invitationId)
      .eq('store_id', storeId)
      .maybeSingle();
    if (!inv) return { ok: false, error: 'Invitation not found.' };

    await admin
      .from('store_invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId);
    await logMembershipAudit(admin, {
      storeId,
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'invitation_cancelled',
      targetEmail: inv.email,
    });
    revalidatePath('/admin/members');
    return { ok: true, message: 'Invitation cancelled.' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

// --- Role / status -----------------------------------------------------------
export async function changeMemberRoleAction(
  memberId: string,
  role: string,
): Promise<MemberActionResult> {
  try {
    const { admin, actor } = await requirePermission('members.manage');
    const storeId = actor.storeId;
    if (!storeId) return { ok: false, error: 'No store resolved.' };

    const members = await loadMembers(admin, storeId);
    const err = validateRoleChange(members, memberId, role);
    if (err) return { ok: false, error: policyErrorMessage(err) };
    const target = members.find((m) => m.id === memberId)!;

    await admin
      .from('store_members')
      .update({ role: role as StoreMemberRole })
      .eq('id', memberId)
      .eq('store_id', storeId);
    await logMembershipAudit(admin, {
      storeId,
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'role_changed',
      targetUserId: target.user_id,
      oldValue: { role: target.role },
      newValue: { role },
    });
    revalidatePath('/admin/members');
    return { ok: true, message: 'Role updated.' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

export async function setMemberStatusAction(
  memberId: string,
  status: MemberStatus,
): Promise<MemberActionResult> {
  try {
    const { admin, actor } = await requirePermission('members.manage');
    const storeId = actor.storeId;
    if (!storeId) return { ok: false, error: 'No store resolved.' };

    const members = await loadMembers(admin, storeId);
    const err = validateStatusChange(members, memberId, status);
    if (err) return { ok: false, error: policyErrorMessage(err) };
    const target = members.find((m) => m.id === memberId)!;

    await admin
      .from('store_members')
      .update({ status })
      .eq('id', memberId)
      .eq('store_id', storeId);
    await logMembershipAudit(admin, {
      storeId,
      actorId: actor.userId,
      actorEmail: actor.email,
      action: status === 'removed' ? 'member_removed' : 'status_changed',
      targetUserId: target.user_id,
      oldValue: { status: target.status },
      newValue: { status },
    });
    revalidatePath('/admin/members');
    return { ok: true, message: 'Member updated.' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

export async function bulkSetMemberStatusAction(
  memberIds: string[],
  status: MemberStatus,
): Promise<MemberActionResult> {
  try {
    const { admin, actor } = await requirePermission('members.manage');
    const storeId = actor.storeId;
    if (!storeId) return { ok: false, error: 'No store resolved.' };

    let members = await loadMembers(admin, storeId);
    let applied = 0;
    let skipped = 0;
    for (const id of memberIds) {
      // Re-validate each time so sole-owner protection sees prior changes.
      if (validateStatusChange(members, id, status)) {
        skipped += 1;
        continue;
      }
      const target = members.find((m) => m.id === id);
      if (!target) {
        skipped += 1;
        continue;
      }
      await admin
        .from('store_members')
        .update({ status })
        .eq('id', id)
        .eq('store_id', storeId);
      await logMembershipAudit(admin, {
        storeId,
        actorId: actor.userId,
        actorEmail: actor.email,
        action: status === 'removed' ? 'member_removed' : 'status_changed',
        targetUserId: target.user_id,
        oldValue: { status: target.status },
        newValue: { status },
      });
      members = members.map((m) => (m.id === id ? { ...m, status } : m));
      applied += 1;
    }
    revalidatePath('/admin/members');
    return {
      ok: true,
      message: `Updated ${applied} member${applied === 1 ? '' : 's'}${
        skipped ? ` · skipped ${skipped} (sole owner protected)` : ''
      }.`,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

export async function transferOwnershipAction(
  targetMemberId: string,
): Promise<MemberActionResult> {
  try {
    const { admin, actor } = await requirePermission('members.manage');
    const storeId = actor.storeId;
    if (!storeId) return { ok: false, error: 'No store resolved.' };

    const members = await loadMembers(admin, storeId);
    const target = members.find((m) => m.id === targetMemberId);
    if (!target) return { ok: false, error: 'Member not found.' };
    if (target.status !== 'active') return { ok: false, error: 'Target must be an active member.' };

    const callerIsOwner = members.some(
      (m) => m.user_id === actor.userId && m.role === 'owner' && m.status === 'active',
    );
    if (!actor.isPlatformAdmin && !callerIsOwner) {
      return { ok: false, error: 'Only the current owner can transfer ownership.' };
    }

    const currentOwners = members.filter((m) => m.role === 'owner' && m.status === 'active');
    for (const owner of currentOwners) {
      if (owner.id === target.id) continue;
      await admin.from('store_members').update({ role: 'admin' }).eq('id', owner.id);
    }
    await admin.from('store_members').update({ role: 'owner' }).eq('id', target.id);

    await logMembershipAudit(admin, {
      storeId,
      actorId: actor.userId,
      actorEmail: actor.email,
      action: 'ownership_transferred',
      targetUserId: target.user_id,
      oldValue: { owners: currentOwners.map((o) => o.user_id) },
      newValue: { owner: target.user_id },
    });
    revalidatePath('/admin/members');
    return { ok: true, message: 'Ownership transferred.' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

// --- Accept / decline (invitee-side; not members.manage) ---------------------
export async function acceptInvitationAction(token: string): Promise<MemberActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Please sign in to accept this invitation.' };

    const admin = createAdminClient();
    const { data: inv } = await admin
      .from('store_invitations')
      .select('*')
      .eq('token', token)
      .maybeSingle();
    if (!inv) return { ok: false, error: 'Invitation not found.' };
    if (!isInvitationAcceptable(inv, Date.now())) {
      return { ok: false, error: 'This invitation is expired or no longer valid.' };
    }
    if ((user.email ?? '').toLowerCase() !== inv.email.toLowerCase()) {
      return { ok: false, error: 'This invitation was sent to a different email address.' };
    }

    const { error: upErr } = await admin
      .from('store_members')
      .upsert(
        {
          store_id: inv.store_id,
          user_id: user.id,
          role: inv.role,
          status: 'active',
          invited_by: inv.invited_by,
        },
        { onConflict: 'store_id,user_id' },
      );
    if (upErr) throw upErr;

    await admin
      .from('store_invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_by: user.id })
      .eq('id', inv.id);
    await logMembershipAudit(admin, {
      storeId: inv.store_id,
      actorId: user.id,
      actorEmail: user.email ?? null,
      action: 'invitation_accepted',
      targetUserId: user.id,
      targetEmail: inv.email,
      newValue: { role: inv.role },
    });
    revalidatePath('/account/invitations');
    return { ok: true, message: 'Invitation accepted — you now have access.' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

export async function declineInvitationAction(token: string): Promise<MemberActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Please sign in first.' };

    const admin = createAdminClient();
    const { data: inv } = await admin
      .from('store_invitations')
      .select('id, email, store_id, status')
      .eq('token', token)
      .maybeSingle();
    if (!inv || inv.status !== 'pending') return { ok: false, error: 'Invitation not found.' };
    if ((user.email ?? '').toLowerCase() !== inv.email.toLowerCase()) {
      return { ok: false, error: 'This invitation was sent to a different email address.' };
    }
    await admin.from('store_invitations').update({ status: 'revoked' }).eq('id', inv.id);
    await logMembershipAudit(admin, {
      storeId: inv.store_id,
      actorId: user.id,
      actorEmail: user.email ?? null,
      action: 'invitation_declined',
      targetEmail: inv.email,
    });
    revalidatePath('/account/invitations');
    return { ok: true, message: 'Invitation declined.' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}
