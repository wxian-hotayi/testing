-- =============================================================================
-- 0013_rbac_roles.sql — Departmental store roles (RBAC)
--
-- Extends store_member_role with the operational/departmental roles from the
-- product RBAC model. The full role→permission matrix lives in application code
-- (src/lib/rbac/permissions.ts) and is enforced in server actions / middleware
-- / the admin UI; this migration only enables the new values so that
-- store_members rows can carry them.
--
-- ADD VALUE is additive and irreversible (Postgres enums can't drop values).
-- IF NOT EXISTS makes the migration safe to re-run. Existing values
-- (owner, admin, staff) are retained: owner/admin map to the "Admin" role and
-- the legacy "staff" maps to "Manager" in resolveRoleKey().
-- =============================================================================

alter type store_member_role add value if not exists 'manager';
alter type store_member_role add value if not exists 'marketing';
alter type store_member_role add value if not exists 'warehouse';
alter type store_member_role add value if not exists 'support';
