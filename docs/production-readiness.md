# Production Readiness

PulseShift production uses Supabase for hosted PostgreSQL and Supabase Auth, while the application API remains the source of truth for workflow mutations, authorization, policy checks, audit writes, and AI tool execution.

## Role Coverage Baseline

Phase 16B is now a standing production-readiness gate. Every new page, API endpoint, workflow, notification, integration, SQL report, LLM tool, audit event, and smoke test must declare how the full role matrix interacts with it.

The required recurring personas are organization owner, system admin, workforce admin, unit manager, charge nurse, employee, float pool coordinator, payroll admin, credentialing admin, compliance auditor, executive viewer, external agency admin, and the backend-only AI service identity.

For each feature, document and test:

1. Which roles can see it.
2. Which roles can mutate it.
3. Which roles have read-only access.
4. Which roles must be explicitly denied or hidden.
5. Which organization, unit, employee, agency, or service scope is enforced.
6. Which audit, monitoring, notification, Copilot, or SQL-reporting context is emitted.

Phases 17 through 20 must keep the Phase 16B role walkthroughs green before the work can be considered complete.

## Environments

Local development may use Docker PostgreSQL or a local Supabase project. Staging and production should use separate Supabase projects with separate API, web, and LLM provider credentials.

Required variables:

- `DATABASE_URL`: pooled PostgreSQL connection for app runtime.
- `DIRECT_URL`: direct PostgreSQL connection for Prisma migrations.
- `SUPABASE_URL`: server-side Supabase project URL.
- `SUPABASE_ANON_KEY`: server-side anon key for JWT/JWKS-compatible client operations.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key for invitation/admin automation.
- `SUPABASE_JWT_SECRET`: JWT verification secret when using symmetric verification.
- `NEXT_PUBLIC_SUPABASE_URL`: browser Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: browser anon key.
- `NEXT_PUBLIC_API_BASE_URL`: web-to-API URL.
- `NEXT_PUBLIC_APP_URL`: public web URL for invite/auth redirects.
- `ENABLE_DEMO_AUTH`: `true` only for local/demo environments; set to `false` for staging and production.
- `ENABLE_DEMO_RESET`: `true` only for local/demo environments; set to `false` for staging and production.
- `AUTH_PERSISTENCE`: `memory` for local demo invites, `prisma` for Supabase-backed invitations and account linking.
- `WORKFLOW_PERSISTENCE`: `memory` for the local MVP demo, `prisma` for database-backed workflow state.
- `LLM_PROVIDER`: `mock` for deterministic local runs or `openai-compatible` for a real provider.
- `LLM_PROVIDER_ENABLED`: `true` only when the server should call the configured LLM provider.
- `LLM_MODEL`: default model name for the provider gateway.
- `LLM_TIMEOUT_MS`: provider request timeout in milliseconds.
- `LLM_LIVE_SMOKE`: `true` only when intentionally running the live provider smoke test.
- `OPENAI_API_KEY` or `AI_GATEWAY_API_KEY`: LLM provider key.
- `AI_GATEWAY_BASE_URL`: OpenAI-compatible base URL; leave blank to use the default OpenAI API URL in the live smoke test.

Never expose service-role keys to the browser. Never reuse staging credentials in production.

Environment separation, browser-safe variables, server-only secrets, and rotation ownership are
documented in [Environment Runbook](./environment-runbook.md).
Release preflight, staging smoke, final quality gates, and go/no-go criteria are documented in
[Deployment Checklist](./deployment-checklist.md).
Rollback triggers, containment actions, validation commands, and evidence requirements are
documented in [Rollback Checklist](./rollback-checklist.md).
Monitoring dashboards, alert routing, event names, and future provider wiring are documented in
[Monitoring Dashboard Plan](./monitoring-dashboard-plan.md).

Run the opt-in live LLM smoke gate only after staging credentials are loaded:

```bash
LLM_LIVE_SMOKE=true npm run test:llm:live
```

## Supabase Setup

Local options:

1. Use Docker Compose PostgreSQL for Prisma-only development.
2. Use the Supabase CLI for a local Supabase stack when testing Auth or Realtime.

Hosted setup:

1. Create separate Supabase projects for staging and production.
2. Copy the pooled connection string to `DATABASE_URL`.
3. Copy the direct connection string to `DIRECT_URL`.
4. Configure allowed redirect URLs for the web app:
   - `/login`
   - `/invite/accept`
   - `/onboarding/profile`
   - `/onboarding/organization`
5. Store Supabase anon/service-role/JWT settings in the deployment secret store.
6. Set `ENABLE_DEMO_AUTH=false` outside local demos so requests require Supabase bearer tokens.
7. Set `ENABLE_DEMO_RESET=false` outside local demos so destructive reset is not exposed.
8. Set `AUTH_PERSISTENCE=prisma` so invitations are stored in Postgres and accepted users are linked to Supabase Auth IDs.
9. Set `WORKFLOW_PERSISTENCE=prisma` in staging and production so workflow writes survive API restarts.

## Supabase Auth Smoke Test

For local Supabase testing against seeded users:

1. Create Supabase Auth users with the seeded emails, such as `admin@example.com` and `priya.nurse@example.com`.
2. Start the API with `ENABLE_DEMO_AUTH=false`, `ENABLE_DEMO_RESET=false`, `AUTH_PERSISTENCE=prisma`, and `WORKFLOW_PERSISTENCE=prisma`.
3. Run `npm run db:push` and `npm run db:seed` against the Supabase database.
4. Sign in at `/login` with one of the Supabase users. On first successful request, PulseShift links the real Supabase `sub` to the matching seeded app user by email.
5. Invite a workforce member from `/onboarding/organization`, create or sign in as that invited Supabase user, then open the invite URL and accept it.

## Prisma Commands

Use Prisma as the ORM and migration tool:

```bash
npm run db:generate
npm run db:validate
npm run db:migrate
npm run db:seed
```

For staging and production, run migrations with the direct database URL and keep application runtime traffic on the pooled URL.

Backup, restore, restore-drill, and migration rollback expectations are documented in
[Backup And Restore Runbook](./backup-restore.md).
Staging and production migration procedure is documented in [Migration Runbook](./migration-runbook.md).

Incident response, full-role access review, AI service identity review, and vendor/BAA preparation
are documented in [Security Operations Runbook](./security-operations.md).

## Seed And Reset Policy

Local and staging may seed demo data for development and smoke tests. The seed set must cover every Phase 16B persona, multi-week schedule context, open shifts, approvals, timecard exceptions, credential warnings, audit records, notifications, and Copilot/reporting examples. Production must not expose a destructive reset endpoint, a public seed workflow, or the demo identity switcher.

The current in-memory `demo-data.ts` state is a temporary MVP implementation. Production phases must migrate each array-backed workflow behind repository/service interfaces and then replace those repositories with Prisma-backed implementations.

## Repository Migration Pattern

Each production workflow should follow this sequence:

1. Define a service boundary around the current controller behavior.
2. Add a repository interface for reads and writes needed by that service.
3. Implement an in-memory adapter only where needed to preserve existing tests during migration.
4. Implement a Prisma adapter with organization-scoped queries.
5. Move mutations into transactions when multiple records must update together.
6. Preserve audit and notification side effects as part of the service contract.
7. Remove direct reads from `demo-data.ts` after the Prisma repository covers the behavior.

Controllers should remain thin. Services own policy decisions and workflow orchestration. Repositories own persistence details.

The timeclock workflow is the first migrated boundary. Local demos use the in-memory adapter by
default, while `WORKFLOW_PERSISTENCE=prisma` routes clock-in/out event reads and writes through
Prisma-backed `TimecardEvent` records seeded by `npm run db:seed`.

## SQL Reporting And LLM Tooling

PulseShift should include a dedicated SQL reporting/tooling layer for read-heavy operational
queries, dashboards, and LLM tools. This layer is intentionally separate from workflow mutation
services.

Rules:

1. SQL reports are concrete backend functions with fixed SQL definitions.
2. The LLM must never generate SQL, edit SQL, concatenate SQL, or submit raw SQL text.
3. Tool contracts expose only named reports with typed parameters.
4. The server injects organization/tenant scope. The caller cannot override it.
5. Every report enforces permission checks, row limits, and query timeouts.
6. LLM-triggered report calls write AI tool-call metadata and audit-relevant context.
7. Every report/tool declares allowed, read-only, approval-required, and blocked behavior for the Phase 16B role matrix.
8. The AI service identity is backend-only and cannot be used as a human demo or production account.
9. Workflow writes remain behind Prisma-backed services, policy checks, approvals, and audit writes.

Initial report candidates:

- `get_staffing_gaps_report(unitId, startAt, endAt)`
- `get_employee_schedule_report(employeeId, startAt, endAt)`
- `get_timecard_exceptions_report(unitId, status, startAt, endAt)`
- `get_credential_expiry_report(unitId, expiresBefore)`
- `get_audit_activity_report(actorUserId, action, startAt, endAt)`

Each report should have tests for tenant isolation, parameter validation, bounded result size,
timeout behavior, expected query shape, allowed role access, denied role access, and AI service misuse. High-traffic reports should receive EXPLAIN-plan review before production rollout.

## CI Quality Gate

Every production branch should pass:

```bash
npm install
npm run db:generate
npm run db:validate
npm run typecheck
npm run lint
npm run test
npm run test:demo
npm run build
npm audit --audit-level=high
```

CI must include role/page contract assertions, full-role landing and navigation walkthroughs, one meaningful allowed workflow per role family, and at least one denied-action check per restricted role family.

The web production build requires the API to be available because server-rendered pages fetch API-backed data during prerender.
