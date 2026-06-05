import { listMyPendingInvitations } from '@/features/members/queries';
import { AcceptInvitations } from '@/features/members/components/accept-invitations';

export const metadata = { title: 'Invitations' };

export default async function AccountInvitationsPage() {
  const invitations = await listMyPendingInvitations();
  return (
    <div>
      <h2 className="mb-1 text-lg font-bold">Team invitations</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Invitations to help manage a store. Accept to gain access with the
        assigned role.
      </p>
      <AcceptInvitations invitations={invitations} />
    </div>
  );
}
