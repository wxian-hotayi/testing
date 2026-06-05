import { redirect } from 'next/navigation';
import { getCurrentActor, actorCan } from '@/lib/rbac/actor';
import {
  listMembers,
  listInvitations,
  listMembershipAudit,
  requireCurrentStoreId,
} from '@/features/members/queries';
import { InviteForm } from '@/features/members/components/invite-form';
import { MembersTable } from '@/features/members/components/members-table';
import { InvitationsTable } from '@/features/members/components/invitations-table';

export const metadata = { title: 'Members' };

export default async function AdminMembersPage() {
  const actor = await getCurrentActor();
  if (!actorCan(actor, 'members.manage')) redirect('/admin');

  const storeId = await requireCurrentStoreId();
  const [members, invitations, audit] = await Promise.all([
    listMembers(storeId, { status: 'all' }),
    listInvitations(storeId, {}),
    listMembershipAudit(storeId, 15),
  ]);

  const canTransfer = actor!.isPlatformAdmin || actor!.storeRole === 'owner';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 text-2xl font-bold">Members</h1>
        <p className="text-sm text-muted-foreground">
          Invite teammates and assign roles. A store always keeps at least one
          active owner — transfer ownership before stepping down.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Invite a teammate</h2>
        <InviteForm />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Team ({members.filter((m) => m.status !== 'removed').length})</h2>
        <MembersTable members={members} canTransfer={canTransfer} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Invitations</h2>
        <InvitationsTable invitations={invitations} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent activity</h2>
        {audit.length === 0 ? (
          <p className="text-sm text-muted-foreground">No membership activity yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {audit.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <span>
                  <span className="font-medium">{a.actor_email ?? 'system'}</span>{' '}
                  <span className="text-muted-foreground">{a.action.replace(/_/g, ' ')}</span>{' '}
                  {(a.target_email || a.target_user_id) && (
                    <span className="font-medium">{a.target_email ?? a.target_user_id}</span>
                  )}
                </span>
                <time className="text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleString('en-MY')}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
