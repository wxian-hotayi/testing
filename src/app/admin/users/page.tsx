import { redirect } from 'next/navigation';
import { listUsers } from '@/features/admin/queries';
import { UserRoleManager } from '@/features/admin/components/user-role-manager';
import { getCurrentActor, actorCan } from '@/lib/rbac/actor';

export default async function AdminUsersPage() {
  // Platform-level: lists ALL profiles and edits the global role. Restricted to
  // the platform operator — store teams are managed at /admin/members.
  const actor = await getCurrentActor();
  if (!actorCan(actor, 'platform.manage')) redirect('/admin');

  const users = await listUsers();
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Platform users</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Global accounts and their platform role. To manage a store’s team and
        departmental roles, use that store’s <strong>Members</strong> page.
      </p>
      <UserRoleManager users={users} canManage />
    </div>
  );
}
