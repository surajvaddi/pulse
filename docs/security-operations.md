# Security Operations Runbook

PulseShift is preparing for HIPAA-ready operations, but this document does not claim HIPAA certification or legal compliance. Formal compliance depends on legal review, signed vendor agreements, implemented policies, workforce training, and production evidence.

## Incident Response

Open an incident when any of these occur:

- Supabase Auth compromise or suspicious login behavior.
- Exposed `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, LLM key, hosting token, email/SMS key, or integration credential.
- Unexpected access to user, schedule, timecard, credential, audit, notification, or integration data.
- Unsafe AI tool attempt, blocked AI action spike, or model provider behavior outside the tool registry.
- Failed integration import that could affect schedule, payroll, credential, or timecard accuracy.
- Notification delivery failure that could prevent users from seeing schedule, approval, credential, or timecard events.

Incident steps:

1. Assign an incident owner and severity.
2. Preserve request IDs, audit logs, AI tool-call metadata, monitoring events, and deployment version.
3. Rotate exposed keys before resuming normal traffic.
4. Disable affected integrations, LLM provider route, or workflow mutation path if containment requires it.
5. Verify role and scope impact across organization owner, system admin, workforce admin, unit manager, charge nurse, employee, float pool coordinator, payroll admin, credentialing admin, compliance auditor, executive viewer, external agency admin, and AI service identity.
6. Record timeline, affected data types, containment actions, customer/user communication owner, and follow-up work.
7. Run the relevant verification gates before closing the incident:

```bash
npm run typecheck
npm run lint
npm run test
npm run test:demo
```

## Access Review Checklist

Run access review before launch, quarterly after launch, and after any incident involving identity or authorization.

For every role, verify:

- Assigned permissions match `RolePermissionMap`.
- Scopes match expected self, unit, facility, organization, agency, or service boundaries.
- Landing route and navigation match Phase 16B role walkthroughs.
- At least one allowed workflow works.
- At least one restricted workflow is denied.
- Audit evidence is written for privileged mutations.
- Monitoring emits denied-action events where appropriate.

Role-specific review:

- Organization owner: audit, integrations, user management, AI admin access.
- System admin: admin functions without unsupported direct SQL or audit rewriting.
- Workforce admin: facility schedule visibility and staffing actions without payroll mutation.
- Unit manager: unit schedule, swaps, staffing, and timecard review in scope.
- Charge nurse: unit read/notification behavior without assignment or payroll authority.
- Employee: self schedule, open shifts, swaps, availability, timeclock, and self-scoped Copilot.
- Float pool coordinator: facility coverage context without payroll or audit authority.
- Payroll admin: timecard exceptions, resolution, payroll export, and no schedule admin rights.
- Credentialing admin: credential warning/review access without schedule or payroll mutation.
- Compliance auditor: audit and AI tool-call read-only access without reset or mutation.
- Executive viewer: facility summary visibility without workflow writes.
- External agency admin: self/agency schedule and open-shift access without internal staffing controls.
- AI service identity: backend-only, no human landing-page assumptions, no raw SQL, no direct mutation outside registered tools.

## AI Service Identity Review

The AI service identity must remain backend-only.

Review:

- It has only explicit `ai:use`-style service permissions required by backend orchestration.
- It cannot sign in as a normal browser user.
- It cannot access demo reset controls.
- It cannot call raw SQL, arbitrary query, permission-editing, audit-delete, credential-override, payroll-edit, or self-approval tools.
- Its available tools are declared through the Phase 18 tool registry.
- Its blocked direct database behavior is covered by eval task `eval_ai_service_raw_database_block`.
- Its provider keys are stored server-side and redacted from logs, audit payloads, and monitoring events.

## Vendor And BAA Checklist

Before production launch, review each vendor:

- Supabase: database, auth, backups, logs, service-role key controls, BAA status.
- LLM provider: model endpoint, data retention, training controls, BAA status, prompt/tool metadata handling.
- Hosting provider: deployment logs, environment secrets, network controls, BAA status.
- Email/SMS provider: notification content, delivery logs, BAA status.
- Monitoring provider: event metadata, request IDs, redaction, BAA status.
- Payroll/timekeeping integration provider: imported/exported fields, sync failures, BAA or contract status.

Do not send PHI-like free text to vendors unless the vendor relationship, BAA status, product configuration, retention settings, and internal policy explicitly allow it.

## Required Evidence Links

- Phase 16B role baseline: `docs/phase-16b-role-demo.md`
- Production readiness: `docs/production-readiness.md`
- Backup and restore: `docs/backup-restore.md`
- Monitoring dashboard plan: `docs/monitoring-dashboard-plan.md`
- Phase 18 LLM tool registry and eval gates: `implement.md`
