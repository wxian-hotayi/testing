import { Check, Minus } from 'lucide-react';
import { getCurrentActor } from '@/lib/rbac/actor';
import {
  ROLE_KEYS,
  PERMISSIONS,
  ROLE_META,
  roleHasPermission,
} from '@/lib/rbac/permissions';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

/**
 * Read-only view of the RBAC permission matrix (roles × permissions). The
 * current actor's role column is highlighted. This mirrors the single source of
 * truth in src/lib/rbac/permissions.ts that the backend enforces.
 */
export default async function AdminAccessPage() {
  const actor = await getCurrentActor();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Roles &amp; permissions</h1>
        {actor && (
          <Badge variant="muted">
            Your role: {ROLE_META[actor.roleKey].label}
          </Badge>
        )}
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        The permission matrix is enforced everywhere: in middleware, in the admin
        navigation, and in every server action. Marketing, Warehouse, and
        Customer Support are parallel departmental roles — not a single rank
        ladder — so each has its own set.
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-secondary/40 text-left">
              <th className="p-3 font-medium">Permission</th>
              {ROLE_KEYS.map((role) => (
                <th
                  key={role}
                  className={cn(
                    'p-3 text-center font-medium',
                    actor?.roleKey === role && 'bg-primary/10 text-primary',
                  )}
                  title={ROLE_META[role].description}
                >
                  {ROLE_META[role].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((permission) => (
              <tr key={permission} className="border-b last:border-0">
                <td className="p-3 font-mono text-xs">{permission}</td>
                {ROLE_KEYS.map((role) => {
                  const has = roleHasPermission(role, permission);
                  return (
                    <td
                      key={role}
                      className={cn(
                        'p-3 text-center',
                        actor?.roleKey === role && 'bg-primary/5',
                      )}
                    >
                      {has ? (
                        <Check
                          className="mx-auto size-4 text-primary"
                          aria-label="allowed"
                        />
                      ) : (
                        <Minus
                          className="mx-auto size-4 text-muted-foreground/40"
                          aria-label="denied"
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ROLE_KEYS.map((role) => (
          <div key={role} className="rounded-lg border p-3">
            <div className="font-medium">{ROLE_META[role].label}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {ROLE_META[role].description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
