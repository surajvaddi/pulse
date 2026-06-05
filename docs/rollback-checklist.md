# Rollback Checklist

Use this checklist before production launch and during any release incident. A rollback is a controlled operational action, not an ad hoc code change. Preserve evidence before changing state unless active containment requires immediate action.

## Rollback Header

- Incident or release ID:
- Environment:
- Trigger:
- Severity:
- Rollback owner:
- Communications owner:
- Current deployed web version:
- Current deployed API version:
- Current database migration version:
- Last known good version:
- Backup or restore point:

## Universal First Actions

1. Assign one rollback owner.
2. Freeze unrelated deployments.
3. Preserve request IDs, logs, audit records, monitoring events, failed job IDs, migration output, and affected user reports.
4. Decide whether containment requires disabling traffic, disabling a feature flag, rolling back web, rolling back API, rolling forward with a fix, disabling an integration, or restoring data into an isolated database target.
5. Record the decision and timestamp before executing the change.

## Web Release Rollback

- Owner: release owner or frontend on-call.
- Trigger: broken navigation, login page failure, role-specific page crash, production-visible demo controls, inaccessible critical workflow, or incorrect public environment values.
- First containment action: route traffic back to the last known good web deployment when the platform supports instant rollback.
- Procedure:
  1. Roll back web deployment to the last known good build.
  2. Confirm browser-safe variables still point to the current API and Supabase project.
  3. Clear CDN/cache only if stale assets are causing the issue.
- Validation:

```bash
npm run test --workspace @pulseshift/web
npm run test:staging-smoke
```

- Preserve: deployment ID, build logs, browser console error, server-render digest, route, role, and environment variable diff.

## API Release Rollback

- Owner: backend on-call.
- Trigger: failed health checks, auth failures, permission regression, workflow mutation failure, audit write failure, monitoring spike, or integration sync regression.
- First containment action: disable affected route, integration, or provider when narrower than full API rollback.
- Procedure:
  1. Confirm the previous API version is compatible with the current database schema.
  2. Roll back the API deployment to the last compatible version.
  3. Keep `ENABLE_DEMO_AUTH=false` and `ENABLE_DEMO_RESET=false` in staging and production.
  4. Re-run scoped smoke tests before reopening traffic.
- Validation:

```bash
npm run test --workspace @pulseshift/api
npm run test:demo
npm run test:staging-smoke
```

- Preserve: request IDs, structured logs, monitoring events, affected route, actor role/scope, audit rows, and deployment ID.

## Database Migration Rollback

- Owner: database owner and release owner together.
- Trigger: migration failure, incompatible schema, data loss risk, broken workflow persistence, or severe query performance regression.
- First containment action: stop deployment promotion and keep application traffic on the last compatible API version.
- Procedure:
  1. Follow `docs/migration-runbook.md` and `docs/backup-restore.md`.
  2. Prefer a forward fix when data has already been migrated and the previous application version is incompatible.
  3. Restore into an isolated target first when data restoration is required.
  4. Never manually edit production migration history without a written incident record.
- Validation:

```bash
npm run db:validate
npm run test:staging-smoke
```

- Preserve: migration command output, migration table state, backup ID, restore target, query errors, and Prisma schema diff.

## Supabase Auth Config Rollback

- Owner: auth owner.
- Trigger: login failure, invite redirect failure, invalid JWT verification, wrong redirect URL, or accidental demo auth exposure.
- First containment action: restore the prior Supabase Auth redirect and JWT settings from the secret store/change history.
- Procedure:
  1. Revert redirect URLs to the prior known-good set.
  2. Restore JWT settings or JWKS/symmetric verification mode expected by the API.
  3. Confirm service-role key remains server-only.
  4. Confirm browser uses only anon key and public URL.
- Validation:

```bash
npm run test --workspace @pulseshift/api
npm run test --workspace @pulseshift/web
```

- Preserve: Supabase Auth change timestamp, redirect list before/after, token verification error, and affected user email without sensitive token values.

## Integration Sync Rollback

- Owner: integration owner.
- Trigger: import creates incorrect shifts, credentials, timecards, staffing gaps, or payroll export records.
- First containment action: disable the affected integration schedule and stop retries.
- Procedure:
  1. Disable integration sync for the affected source.
  2. Preserve imported payload IDs and validation errors.
  3. Reconcile affected records through reviewed application workflow or database restore procedure.
  4. Re-enable only after staging replay succeeds.
- Validation:

```bash
npm run test --workspace @pulseshift/api
npm run test:staging-smoke
```

- Preserve: source system, sync run ID, imported row count, rejected row count, audit events, monitoring events, and affected unit/facility scope.

## Notification Delivery Rollback

- Owner: notification owner.
- Trigger: notification delivery outage, duplicate sends, incorrect recipient scope, or sensitive data in notification content.
- First containment action: pause the affected channel or template.
- Procedure:
  1. Disable the failing provider channel or template.
  2. Keep in-app notification state available when safe.
  3. Reconcile unread/failed notifications before re-enabling delivery.
  4. Verify no out-of-scope recipients were included.
- Validation:

```bash
npm run test --workspace @pulseshift/api
npm run test --workspace @pulseshift/web
```

- Preserve: notification IDs, template ID, recipient scope, provider error, monitoring event, and retry state.

## LLM Provider Rollback

- Owner: AI/tooling owner.
- Trigger: provider outage, elevated latency, unsafe response, tool registry denial spike, unexpected model behavior, or cost spike.
- First containment action: set provider to mock/disabled mode or disable `LLM_PROVIDER_ENABLED` when the release can run without live LLM calls.
- Procedure:
  1. Disable live provider traffic.
  2. Keep predefined workflow tools and SQL report tools server-gated.
  3. Preserve AI tool-call metadata and eval failures.
  4. Re-enable only after deterministic and live smoke checks pass.
- Validation:

```bash
npm run test --workspace @pulseshift/ai
npm run test --workspace @pulseshift/evals
npm run test:llm:live
```

- Preserve: conversation ID, tool call ID, role context, current page, model name, latency, provider status, and redacted request metadata.

## Monitoring Outage Rollback

- Owner: observability owner.
- Trigger: missing events, provider outage, high-cardinality event explosion, or accidental sensitive metadata emission.
- First containment action: disable the unsafe event sink or reduce to local structured logs while preserving request IDs.
- Procedure:
  1. Stop sending unsafe monitoring payloads.
  2. Keep local structured logs active.
  3. Restore provider configuration or dashboard rules.
  4. Verify redaction before reopening the sink.
- Validation:

```bash
npm run test --workspace @pulseshift/api
npm run test:staging-smoke
```

- Preserve: event names, severity, request IDs, redaction failure sample, dashboard rule change, and provider incident ID.

## Closeout

1. Confirm user-facing behavior is restored.
2. Confirm Phase 16B role smoke remains green for every production role.
3. Confirm audit and monitoring evidence covers the incident.
4. Confirm no production-only secret was copied into chat, tickets, logs, or client-side variables.
5. Create follow-up work for the root cause, missing tests, missing runbook detail, or missing dashboard alert.
