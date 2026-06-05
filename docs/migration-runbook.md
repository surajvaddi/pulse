# Migration Runbook

PulseShift uses Prisma migrations for database schema changes and Supabase for hosted PostgreSQL and Auth. Migration execution must be separated from application runtime traffic.

## Connection Rules

- `DATABASE_URL`: pooled runtime connection used by API services.
- `DIRECT_URL`: direct PostgreSQL connection used for Prisma migrations.

Do not run production migrations with the pooled runtime URL. Do not run application traffic with the direct migration URL.

## Preflight Checklist

Before staging or production migration:

1. Confirm the target environment and Supabase project.
2. Confirm `DIRECT_URL` points to the direct connection for that target.
3. Confirm `DATABASE_URL` points to the pooled runtime connection.
4. Confirm a recent backup exists.
5. Review whether the migration is reversible without data loss.
6. Confirm application release compatibility with the migrated schema.
7. Run:

```bash
npm run db:generate
npm run db:validate
npm run typecheck
npm run test
```

## Apply Procedure

Staging:

```bash
npm run db:migrate
npm run db:seed
npm run test:staging-smoke
```

Production:

```bash
npm run db:migrate
npm run db:validate
```

Production seed or bootstrap scripts must be explicit, reviewed, and environment-safe. Production must not run demo reset or local demo seed workflows.

## Supabase Auth Settings

Before staging/production smoke:

1. Configure allowed redirect URLs:
   - `/login`
   - `/invite/accept`
   - `/onboarding/profile`
   - `/onboarding/organization`
2. Confirm Supabase Auth users are linked by `supabaseAuthId` or accepted invitations.
3. Confirm `ENABLE_DEMO_AUTH=false`.
4. Confirm `AUTH_PERSISTENCE=prisma`.
5. Confirm service-role key is server-only.

## Post-Migration Smoke

Run:

```bash
npm run db:validate
npm run test:staging-smoke
npm run build
```

Then manually confirm:

- Organization owner or system admin can access admin overview.
- Employee can view schedule and timeclock state.
- Payroll admin can view timecard exceptions.
- Compliance auditor can read audit/tool-call evidence but cannot mutate it.
- AI service identity cannot run direct database requests.

## Rollback Decision Tree

If migration fails before completion:

1. Stop rollout.
2. Keep current application release active.
3. Inspect Prisma migration status and Supabase logs.
4. Fix forward in staging first.
5. Restore from backup only if schema/data state cannot be safely repaired.

If migration succeeds but application release fails:

1. Roll back API/web deployment if the previous version is compatible with the migrated schema.
2. If previous version is incompatible, deploy a forward fix.
3. Restore from backup into a new target only when data or schema state cannot support a safe forward fix.

If data corruption is suspected:

1. Freeze writes where possible.
2. Preserve request IDs, audit logs, migration logs, and monitoring events.
3. Follow `docs/backup-restore.md`.
4. Open an incident using `docs/security-operations.md`.

## Evidence Record

Record:

- Migration name.
- Environment.
- Operator.
- Backup timestamp.
- Commands run.
- Smoke results.
- Rollback decision, if any.
- Follow-up owner.
