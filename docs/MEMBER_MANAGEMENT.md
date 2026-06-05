# Store Member Management (MT-4)

> Status 2026-06-05 — implemented, uncommitted. Lets store admins manage
> memberships and assign all RBAC roles without DB access. Builds on
> [RBAC.md](./RBAC.md) and [MULTITENANCY.md](./MULTITENANCY.md).

## Surfaces

| Surface | Path | Who |
|---|---|---|
| Members admin | `/admin/members` | `members.manage` (Admin / Super Admin) |
| Accept invitations | `/account/invitations` | the invited user |
| Members JSON API | `GET /api/admin/members` | `members.manage` |

## Data model ([0014_membership.sql](../supabase/migrations/0014_membership.sql))

- **`store_members`** — gains `status` (`active`/`suspended`/`removed`),
  `invited_by`, `updated_at`.
- **`store_invitations`** — `email`, `role`, `status`
  (`pending`/`accepted`/`revoked`/`expired`), unique `token`, `expires_at`
  (14 days), `invited_by`, accept fields. Partial-unique on `(store_id, email)`
  while `pending`.
- **`membership_audit`** — append-only trail: actor, action, target, old/new
  value (jsonb), IP, timestamp.
- **Fix**: `store_role_rank()` now ranks the departmental roles added in 0013
  (they were `0`, which silently locked marketing/warehouse/support out of
  `is_store_member()`).
- RLS: invitations + audit are admin-scoped; mutations run via the service-role
  client behind `requirePermission`.

## Server actions ([actions.ts](../src/features/members/actions.ts))

All admin actions are gated by `requirePermission('members.manage')` and audited.

| Action | Notes |
|---|---|
| `inviteMemberAction` | Validates email + assignable role; blocks duplicate active members / pending invites; emails an accept link (best-effort). |
| `resendInvitationAction` / `cancelInvitationAction` | Pending invites only; cancel → `revoked`. |
| `changeMemberRoleAction` | Cannot assign `owner` (use transfer); blocks demoting the sole owner. |
| `setMemberStatusAction` / `bulkSetMemberStatusAction` | Suspend / reactivate / remove; bulk re-checks sole-owner protection per item. |
| `transferOwnershipAction` | Owner (or platform admin) only; promotes target to `owner`, demotes prior owner(s) to `admin`. |
| `acceptInvitationAction` / `declineInvitationAction` | Invitee-side (auth + email match), not `members.manage`. |

## Membership statuses

`Invited` (a pending `store_invitations` row) → `Active` (accepted →
`store_members.status='active'`) → `Suspended` (access paused) / `Removed`
(soft-removed; row kept for audit). Reactivating a removed/suspended member sets
`active`.

## Invariant: never orphan a store

`wouldOrphanStore()` ([policy.ts](../src/features/members/policy.ts)) blocks any
role/status change that would drop the store's last active owner — demotion,
suspension, removal, and bulk operations alike. Ownership moves only via
`transferOwnershipAction`. This is the "prevent self-demotion of the sole
administrator" rule.

## Enforcement layers

1. **Backend** — every action re-checks `members.manage` and the sole-owner
   invariant server-side (the authoritative boundary; actions use the
   service-role client).
2. **Frontend** — `/admin/members` nav item + page gate on `members.manage`;
   the Users role-editor disables for actors lacking `customers.manage`.
3. **Audit** — every membership/role/invitation change writes `membership_audit`
   (actor, old/new value, IP); shown under "Recent activity".

## Tests ([policy.test.ts](../src/features/members/policy.test.ts))

Email/role validation, sole-owner protection (demote/suspend/remove, multi-owner
exemption, non-owner pass-through), `validateRoleChange` / `validateStatusChange`
error codes, and invitation acceptability.

## Deferred

- **Per-permission RLS** for the new tables is admin-level, not permission-level
  (the service-role actions enforce the fine detail).
- 0014 is **not runtime-validated** — apply to a live Supabase, then
  `npm run db:types`.
