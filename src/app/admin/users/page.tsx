import { listUsers } from '@/features/admin/queries';
import { UserRoleManager } from '@/features/admin/components/user-role-manager';
import { getCurrentActor, actorCan } from '@/lib/rbac/actor';

export default async function AdminUsersPage() {
  const [users, actor] = await Promise.all([listUsers(), getCurrentActor()]);
  const canManage = actorCan(actor, 'customers.manage');
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Users</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {canManage
          ? 'Change a user’s global role. (Per-store departmental roles are managed in store membership — MT-4.)'
          : 'You can view users but not change roles (requires the customers.manage permission).'}
      </p>
      <UserRoleManager users={users} canManage={canManage} />
    </div>
  );
}
