# Role-Based Access Control (RBAC)

> Status 2026-06-05 — implemented, uncommitted. Source of truth:
> [src/lib/rbac/permissions.ts](../src/lib/rbac/permissions.ts).

## Roles

Seven product roles, mapped onto the existing tenancy primitives:

| Role | Backed by | Scope |
|---|---|---|
| **Super Admin** | `profiles.is_platform_admin = true` | All stores (platform operator) |
| **Admin** | `store_members.role` ∈ {owner, admin} | One store, full control |
| **Manager** | `store_members.role = manager` | One store, operations |
| **Marketing** | `store_members.role = marketing` | One store, growth |
| **Warehouse** | `store_members.role = warehouse` | One store, fulfilment |
| **Customer Support** | `store_members.role = support` | One store, customer care |
| **Customer** | no `store_members` row | Shopper, no admin access |

Marketing / Warehouse / Support are **parallel departmental roles with disjoint
permission sets** — deliberately *not* a single rank ladder.

`resolveRoleKey()` precedence: platform admin → store membership → legacy global
`profiles.role` (so existing `admin`/`staff` accounts keep working on the default
store until `store_members` are populated in MT-4).

## Permission matrix

20 permissions (`resource.action`). The canonical matrix lives in
[permissions.ts](../src/lib/rbac/permissions.ts) and is viewable in-app at
**/admin/access**. Highlights of the disjointness:

- **Marketing**: `marketing.send`, `coupons.write` — but *not* `inventory.adjust`.
- **Warehouse**: `inventory.adjust`, `orders.update` — but *not* `marketing.send` or `orders.refund`.
- **Support**: `orders.refund`, `customers.read` — but *not* `products.write`.
- **Super Admin** alone holds `platform.manage` (cross-store/tenant ops).

## Enforcement (three layers)

1. **Middleware** ([supabase/middleware.ts](../src/lib/supabase/middleware.ts)) —
   coarse gate: only operators (platform admin / legacy staff / any store member)
   may reach `/admin/*`.
2. **Server actions** ([admin/actions.ts](../src/features/admin/actions.ts)) —
   the real boundary. Every mutation calls `requirePermission('<perm>')`
   ([rbac/actor.ts](../src/lib/rbac/actor.ts)) before using the RLS-bypassing
   service-role client. e.g. refund → `orders.refund`, role change →
   `customers.manage`.
3. **Frontend** — the admin nav hides items the actor can't use, the layout
   redirects non-operators, and `/admin/access` renders the live matrix. UI
   gating is convenience; the server-action checks are authoritative.

## DB

[0013_rbac_roles.sql](../supabase/migrations/0013_rbac_roles.sql) adds
`manager`/`marketing`/`warehouse`/`support` to the `store_member_role` enum
(additive). The matrix itself is application-level, not in SQL.

## Tests

[permissions.test.ts](../src/lib/rbac/permissions.test.ts) — 9 tests covering
matrix invariants, departmental disjointness, and `resolveRoleKey` precedence.

## Deferred to MT-4 (member management)

- **UI to assign the departmental roles** to users (insert/edit `store_members`
  rows, invite flow). Today `/admin/users` still edits the legacy global
  `profiles.role`; the 7 departmental roles are assignable only via the DB until
  MT-4 builds the store-members admin.
- Per-permission RLS policies (RLS currently gates writes at store-membership
  level; fine-grained permission enforcement is app-layer).
