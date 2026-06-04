import { listUsers } from '@/features/admin/queries';
import { UserRoleManager } from '@/features/admin/components/user-role-manager';

export default async function AdminUsersPage() {
  const users = await listUsers();
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Users</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Only admins can change roles. Staff can view but not modify.
      </p>
      <UserRoleManager users={users} />
    </div>
  );
}
