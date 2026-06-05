# Monitoring Dashboard Plan

PulseShift monitoring should start provider-neutral and map every dashboard panel to events the API already emits or to a clearly named future event. Dashboards must use request IDs, deployment version, environment, organization ID, actor role, route, severity, and redacted metadata. Do not send secrets, JWTs, service-role keys, LLM keys, integration credentials, or sensitive free text into monitoring metadata.

## Dashboard Sources

- Structured API request logs from `RequestLoggingService`.
- Monitoring events from `MonitoringService`.
- Deployment/build status from the hosting provider.
- Supabase database and auth health from Supabase dashboards or exported metrics.
- LLM provider latency/error metrics from the provider or API wrapper.
- Integration and notification provider health from their provider dashboards or API wrappers.

## Required Panels

| Panel | Existing or planned event | Severity | Primary dimensions | Launch action |
| --- | --- | --- | --- | --- |
| Auth failures | `auth.failure` | `WARN` | environment, route, request ID, auth mode | Alert on spike or repeated failure from same route. |
| Permission denials | `permission.denied` | `WARN` | role, user ID, organization ID, route, scope summary | Alert when privileged routes spike or a role is unexpectedly denied a launch-critical page. |
| Rate-limit spikes | `rate_limit.exceeded` planned | `WARN` | route, actor role, organization ID, request IP hash | Add provider/export wiring when external metrics are connected. |
| API errors | `api.error` planned plus request logs | `ERROR` | route, status code, request ID, deployment version | Alert on 5xx rate, repeated digest, or failed health checks. |
| Blocked AI actions | `ai.blocked_action` | `WARN` | role, current page, tool intent, request ID | Alert on direct SQL, unsafe mutation, permission edit, audit delete, credential override, payroll mutation, or self-approval attempts. |
| LLM provider failures | `llm.provider_failure` planned | `ERROR` | provider, model, route, request ID, timeout bucket | Add when provider adapter sends live traffic. |
| Integration failures | `integration.failure` | `ERROR` | integration ID, direction, organization ID, route | Alert immediately for schedule, credential, timecard, or payroll-affecting sync failures. |
| Notification failures | `notification.delivery_failure` | `WARN` | category, channel, role, organization ID | Alert when failures affect shift, swap, credential, or timecard notifications. |
| Migration health | `deployment.migration_failed` planned plus migration logs | `CRITICAL` | environment, migration ID, database target | Block promotion until migration owner resolves. |
| Build/deploy health | `deployment.failed` planned plus hosting status | `CRITICAL` | app, version, environment, commit SHA | Block launch and use rollback checklist. |

## Role Coverage Panel

Phase 16B role coverage is a launch blocker. The dashboard should show the latest staging smoke result for:

- organization owner
- system admin
- workforce admin
- unit manager
- charge nurse
- employee
- float pool coordinator
- payroll admin
- credentialing admin
- compliance auditor
- executive viewer
- external agency admin
- AI service identity

Each role should have a pass/fail status for landing route, navigation, one meaningful allowed workflow, one denied workflow, and production-hidden demo controls.

## AI And SQL Tooling Panel

Track:

- Count of AI tool calls by tool name, role, current page, and status.
- Count of blocked direct SQL or raw database attempts.
- Count of predefined SQL report calls by report name and role.
- Timeout and error rate for LLM provider requests.
- Eval run status and failure reason for launch-critical evals.

The dashboard must never expose prompts or raw user text when the text may contain sensitive operational details. Store only redacted summaries and IDs.

## Integration And Notification Panel

Track:

- Integration sync success/failure by integration ID and direction.
- Rejected import rows and validation reasons.
- Notification delivery failures by channel, category, and eligible role.
- Retry queue age when async delivery is added.
- Scope mismatches or out-of-scope recipient blocks.

## Security And Audit Panel

Track:

- Permission denials on admin, audit, integration, eval, role, invitation, timecard, and demo reset routes.
- AI service identity browser access attempts.
- Production demo-control denials.
- Audit writes by privileged action.
- Any missing request ID in structured logs or monitoring events.

## Alert Routing

- `CRITICAL`: release owner, backend on-call, security owner.
- `ERROR`: owning feature team and release owner during launch window.
- `WARN`: owning feature team; escalate when repeated or role-critical.
- `INFO`: retained for trend review only.

## Verification

Before launch:

```bash
npm run test --workspace @pulseshift/api
npm run test:staging-smoke
```

Manual cross-check:

1. Confirm `apps/api/src/security/monitoring.assert.ts` still covers current emitted event names.
2. Confirm every dashboard panel maps to an emitted event, structured request log, provider metric, or explicitly planned future event.
3. Confirm redaction prevents credentials, JWTs, service-role keys, LLM keys, integration secrets, and raw unsafe AI prompts from appearing in monitoring payloads.
