# Deployment Checklist

Use this checklist before every staging promotion and before every production launch. A release is not ready until each item has an owner, evidence link, and pass/fail result.

## Release Scope

- Release owner:
- Environment: staging or production.
- Git commit:
- API version:
- Web version:
- Database migration range:
- Supabase project:
- Monitoring dashboard:
- Rollback owner:

## Preflight

1. Confirm the release branch has no unrelated work in the deployment diff.
2. Confirm `docs/phase-16b-role-demo.md` still represents every production role.
3. Confirm `docs/environment-runbook.md` has the current required variables for API, web, Supabase, Prisma, CORS, cookies, rate limits, LLM provider, monitoring, integrations, and demo controls.
4. Confirm `docs/migration-runbook.md` has an approved migration path for this release.
5. Confirm `docs/backup-restore.md` has current backup and restore evidence.
6. Confirm `docs/security-operations.md` has the current incident owner, access review owner, vendor review owner, and AI service identity expectations.
7. Confirm `docs/rollback-checklist.md` has a current last-known-good deployment and rollback owner.
8. Confirm `docs/monitoring-dashboard-plan.md` has current dashboard panels, alert routes, and event names.

## Environment And Secrets

1. Verify staging and production use separate Supabase projects, deployment secrets, LLM credentials, integration credentials, monitoring destinations, and public URLs.
2. Verify server-only secrets are stored only in the deployment secret store:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET`
   - LLM provider keys
   - integration keys
   - monitoring write keys
3. Verify browser variables contain only browser-safe values:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_BASE_URL`
   - `NEXT_PUBLIC_APP_URL`
4. Verify `ENABLE_DEMO_AUTH=false` outside local demos.
5. Verify `ENABLE_DEMO_RESET=false` outside local demos.
6. Verify `AUTH_PERSISTENCE=prisma` and `WORKFLOW_PERSISTENCE=prisma` for staging and production.
7. Verify production cookies require secure transport and production CORS rejects wildcard origins.

## Supabase And Database

1. Verify Supabase Auth redirect URLs include the deployed login, invite acceptance, and onboarding URLs.
2. Verify seeded or invited accounts map to PulseShift roles, permissions, and scopes in the application database.
3. Verify the direct migration URL is used only for migration commands.
4. Verify the pooled runtime URL is used by the API at runtime.
5. Verify a backup or point-in-time recovery checkpoint exists before migration.
6. Run migration preflight:

```bash
npm run db:validate
npm run db:generate
```

7. Apply migrations according to `docs/migration-runbook.md`.
8. Run post-migration smoke checks before exposing traffic.

## Role And Workflow Smoke

1. Run the full staging smoke suite:

```bash
npm run test:staging-smoke
```

2. Walk the Phase 16B role demo checklist for organization owner, system admin, workforce admin, unit manager, charge nurse, employee, float pool coordinator, payroll admin, credentialing admin, compliance auditor, executive viewer, external agency admin, and AI service identity.
3. Confirm each role has:
   - correct landing route
   - correct navigation
   - one meaningful allowed workflow
   - one denied or hidden restricted workflow
   - no production-visible demo reset or demo identity switcher
4. Confirm schedule views are clear for self, unit, facility, executive, payroll, and admin contexts.
5. Confirm open shifts, swaps, approvals, notifications, timecards, credential warnings, audit evidence, integrations, and Copilot/reporting examples have role-appropriate data.

## AI, Reporting, And Integrations

1. Confirm the LLM provider is either disabled intentionally or configured with the approved model, timeout, and key.
2. Run the deterministic AI and report tests:

```bash
npm run test --workspace @pulseshift/ai
npm run test --workspace @pulseshift/evals
```

3. Run live provider smoke only when staging credentials are intentionally loaded:

```bash
LLM_LIVE_SMOKE=true npm run test:llm:live
```

4. Confirm LLM tools use only predefined workflow tools and predefined SQL report tools.
5. Confirm the AI service identity cannot use raw SQL, direct mutation, permission editing, audit deletion, credential override, payroll mutation, or self-approval.
6. Confirm integration sync failures emit monitoring events and do not silently mutate schedules or timecards.

## Monitoring And Audit

1. Confirm monitoring captures auth failures, permission denials, rate-limit spikes, API errors, blocked AI actions, provider failures, integration failures, notification failures, and deployment health.
2. Confirm request IDs appear in logs, API responses where appropriate, monitoring events, and incident evidence.
3. Confirm sensitive tokens, service-role keys, JWT secrets, LLM keys, integration credentials, and monitoring keys are redacted.
4. Confirm privileged mutations write audit evidence.
5. Confirm denied privileged actions emit monitoring evidence without leaking sensitive data.

## Final Gate

Run the final local quality gate before release:

```bash
npm run db:validate
npm run typecheck
npm run lint
npm run test
npm run test:demo
npm run test:staging-smoke
npm run build
npm audit --audit-level=high
```

Known moderate advisories may be tracked separately when no compatible fix is available, but high or critical advisories block launch.

## Go Or No-Go

- Go only when environment, migration, smoke, security, monitoring, rollback, and final gate evidence are complete.
- No-go when role coverage is incomplete, demo controls are visible in production, migrations lack rollback evidence, monitoring is absent, or high/critical dependency advisories are unresolved.
- Record the decision, approver, timestamp, deployment version, and rollback point before promotion.
