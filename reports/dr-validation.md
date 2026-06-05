# Disaster Recovery Validation — Phase 9

**Date:** 2026-06-05 · **Status: NOT VALIDATED**

## Why
Performing a real backup → restore-into-clean-DB → integrity-verify requires
Supabase project admin (backup/PITR controls), a second clean database, and DB
admin tooling — none of which are available to me here. I will not claim a DR
drill that did not happen.

| Step | Status |
|---|---|
| Create backup | NOT VALIDATED |
| Restore into clean database | NOT VALIDATED |
| Verify stores / orders / members / customers restored | NOT VALIDATED |

## Recommended procedure (for the team to execute + record)
1. **Backup:** Supabase Dashboard → Database → Backups (or PITR), or
   `supabase db dump -f backup.sql` against the target.
2. **Restore:** provision a clean project, `supabase db reset` then apply the
   dump (or PITR restore to a fork); confirm migrations `0011–0015` present.
3. **Verify:** row counts + spot-checks on `stores`, `orders`, `store_members`,
   `profiles`; confirm RLS still enforces.
4. **Record:** RPO (backup frequency) and RTO (measured restore time) here.

Run one drill before go-live and paste the evidence into this report.
