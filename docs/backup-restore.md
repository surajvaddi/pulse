# Backup And Restore Runbook

PulseShift uses Supabase PostgreSQL as the production data store and Prisma as the application migration tool. Backups, restores, and migration rollbacks must be treated as operational procedures with explicit owners and evidence, not as ad hoc developer tasks.

## Scope

This runbook covers staging and production Supabase projects. Local development may use Docker PostgreSQL or a local Supabase stack; local data can be recreated from migrations and seeds unless a developer explicitly exports a snapshot for debugging.

Backups must cover:

- PostgreSQL application data, including schedules, users, roles, timecards, notifications, audit logs, AI tool calls, integrations, invitations, credentials, and eval runs.
- Supabase Auth users and identity linkage metadata.
- Migration history.
- Environment and secret inventory needed to restore a running deployment.

## Required Secrets

Restore operators need access through the deployment secret store, never through copied chat messages, screenshots, or local notes:

- `DATABASE_URL`: pooled runtime connection.
- `DIRECT_URL`: direct migration connection.
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`

The service-role key is server-only. It must not be exposed to the browser, support tickets, LLM prompts, logs, audit payloads, or monitoring event metadata.

## Backup Cadence

Staging:

- Nightly automated database backups.
- Manual backup before destructive migration tests, schema refactors, seed resets, or integration import rehearsals.
- Monthly restore drill.

Production:

- Daily automated backups at minimum.
- Point-in-time recovery enabled where available.
- Manual backup before every migration that changes persisted workflow, auth, audit, notification, or integration tables.
- Quarterly restore drill, plus an immediate drill after the first production launch.

## Restore Drill

1. Create an isolated restore target, never the live production project.
2. Restore the latest selected Supabase backup into the isolated target.
3. Load staging-safe secrets into the API and web deployments.
4. Run:

```bash
npm run db:generate
npm run db:validate
npm run typecheck
npm run test
```

5. Run a role smoke pass for organization owner, system admin, employee, payroll admin, compliance auditor, external agency admin, and AI service identity.
6. Verify audit logs, AI tool calls, timecard events, notifications, integration sync runs, and invitations are present.
7. Record restore date, source backup ID, restore target, operator, validation commands, and unresolved issues.

## Migration Rollback

Prisma migrations are schema changes. They are not a substitute for data restoration.

Before applying migrations to staging or production:

1. Confirm `DIRECT_URL` points to the direct database connection.
2. Confirm application runtime uses `DATABASE_URL`, not `DIRECT_URL`.
3. Run `npm run db:validate`.
4. Take or verify a recent backup.
5. Review whether the migration is reversible without data loss.

If a migration fails before application release:

1. Stop the rollout.
2. Keep API/web traffic on the previous release.
3. Use Prisma migration status and Supabase logs to identify the failed migration.
4. Prefer fixing forward in staging first.
5. Restore from backup only when schema/data state cannot be safely repaired.

If a migration succeeds but the release fails:

1. Roll back API/web first if the previous version remains compatible with the migrated schema.
2. If the previous version is incompatible, deploy a forward fix or restore a backup into a new database target.
3. Never manually edit migration history in production without a written incident record.

## Local Development

For Prisma-only local work, Docker PostgreSQL is sufficient:

```bash
npm run db:generate
npm run db:validate
npm run db:migrate
npm run db:seed
```

For Supabase Auth testing, use a local Supabase stack or a staging Supabase project. Local demo reset remains local/demo-only and must stay disabled outside local development.

## Evidence Checklist

Each backup or restore drill should record:

- Environment: staging or production.
- Operator.
- Backup identifier or timestamp.
- Restore target.
- Commands run.
- Role smoke results.
- Migration status.
- Follow-up issues and owner.
