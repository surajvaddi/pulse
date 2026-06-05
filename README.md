# PulseShift

PulseShift is a healthcare workforce scheduling copilot and Kronos-style replacement prototype. The product pairs deterministic scheduling services with permission-aware AI tooling for shift lookup, open shifts, swap requests, policy checks, approvals, notifications, audit logs, and LLM evaluation.

## Local Setup

Prerequisites:

- Node.js 20.11 or newer
- npm 10 or newer
- Docker Desktop or another Docker Compose compatible runtime
- Supabase project credentials when testing production auth or hosted database behavior

Commands:

```bash
cp .env.example .env
npm install
docker compose up -d
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev:web
npm run dev:api
```

Production-readiness setup:

- Use `DATABASE_URL` for the pooled Supabase Postgres runtime connection.
- Use `DIRECT_URL` for Prisma migrations against Supabase.
- Configure Supabase auth keys in `.env`; keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
- See `docs/production-readiness.md` for Supabase setup, migration commands, seed/reset policy, CI gates, and the repository migration pattern.

Seeded demo users:

- `user_owner`: organization owner for account-wide settings, admin workflows, audit, integrations, evals, and user management.
- `user_admin`: system admin for administration, audit, integrations, evals, and tool-call review.
- `user_wendy_workforce`: workforce admin for staffing operations, facility schedule coverage, and open-shift coordination.
- `user_jordan_manager`: ICU/ED unit manager for approvals, staffing risk, schedule review, and team workflows.
- `user_olivia_charge`: charge nurse for unit coverage visibility and shift-level coordination.
- `user_priya`: employee self-schedule, open shifts, swaps, timecards, notifications, and Copilot.
- `user_maya`: employee counterparty for Priya's swap.
- `user_felix_float`: float pool coordinator for cross-unit coverage and open-shift workflows.
- `user_payroll`: payroll admin for timecard exceptions and payroll-facing audit context.
- `user_carmen_credentials`: credentialing admin for credential warnings and staff compliance context.
- `user_avery_auditor`: compliance auditor for read-only audit evidence and tool-call review.
- `user_evan_exec`: executive viewer for read-only workforce and staffing visibility.
- `user_aria_agency`: external agency admin for agency-scoped schedule and open-shift context.
- `user_ai_service`: backend-only AI service identity for tool execution auditing; do not use as a human production account.

Default local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- API health: `http://localhost:4000/health`

The API binds to `127.0.0.1` by default for local development. Set `API_HOST` if your deployment target needs a different bind address.

## Quality Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run test:demo
npm run build
```

Phase 0 verification status:

- TypeScript typecheck: passing.
- ESLint: passing.
- Test script: passing as compile checks until dedicated tests land.
- Production build: passing.
- API health endpoint: verified at `/health`.
- Docker Compose runtime: pending local Docker availability; this environment does not have `docker` installed.
- Security audit: no high or critical advisories; current Next/PostCSS advisory is moderate and requires a breaking downgrade from npm's suggested fix.

Phase 1 verification status:

- Domain package typecheck and lint: passing.
- Prisma client generation: passing.
- Prisma schema validation: passing when `DATABASE_URL` is set.
- Full workspace typecheck, lint, test, and build: passing.
- Seed script typecheck/lint: passing.
- Seed execution and migrations: pending a reachable local PostgreSQL server. This environment does not have Docker installed and nothing is listening at `localhost:5432`.

Phase 2 verification status:

- Demo auth middleware and `/auth/me`: passing with `x-demo-user-id`.
- RBAC/ABAC permission service: covered by API e2e checks.
- Employee self-schedule access: passing.
- Employee unit schedule denial: passing with HTTP 403.
- Unit manager scoped schedule access: passing.
- Payroll timecard exception access: passing.
- Payroll audit denial and admin audit access: passing.
- Full workspace typecheck, lint, test, and build: passing.

Phase 3 verification status:

- App shell navigation, desktop sidebar, top bar, and mobile nav: implemented.
- Employee home and schedule pages: API-backed with scoped self schedule data.
- Open shifts, swap center, timecard, notifications, copilot, and manager dashboard pages: implemented.
- Employee schedule privacy: preserved through `/demo/schedule/me` and API permission e2e checks.
- Manager dashboard unit scope: API-backed through `user_jordan_manager`.
- Full workspace typecheck, lint, and test: passing.
- Production build: passing with the API running for dynamic server-rendered pages.

Phase 4 verification status:

- Open shift claim endpoint: implemented with safe assignment or approval routing.
- Swap request endpoint: implemented with self-scope ownership validation.
- Counterparty accept/decline endpoint: implemented and restricted to proposed employee.
- Manager approve/deny endpoint: implemented and restricted to scoped unit manager.
- Approved swap mutates the schedule only after counterparty and manager approval.
- Web actions: schedule swap request, open-shift claim, Maya accept, and manager approval are wired.
- API e2e checks cover claim approval routing, forbidden employee approval, counterparty acceptance, manager approval, and schedule reassignment.

Phase 5 verification status:

- Policy engine returns deterministic decisions with allowed, requiresApproval, risk flags, blocking reasons, and warnings.
- Open-shift claims use policy decisions instead of inline risk logic.
- Swap creation and manager approval use policy decisions.
- Every workflow write appends an audit record in the demo audit trail.
- Swap UI displays policy risk flags.
- Manager dashboard exposes recent audit records.
- API e2e checks assert policy decisions and audit records for claim and swap workflows.

Phase 6 verification status:

- Notification API lists notifications scoped to the current demo user.
- Notification read endpoint updates in-app read state.
- Workflow-created approval and swap notifications are visible through the inbox API.
- Web notification inbox is API-backed and uses server actions to mark notifications read.
- Server action revalidation provides the initial live-update foundation for notification and workflow views.
- API e2e checks cover notification listing and read-state mutation.

Phase 7 verification status:

- Copilot API accepts messages and routes schedule lookup, swap preview, staffing gap, and timecard prompts.
- Tool registry classifies read-only, low-risk write, approval-required, and blocked tools.
- AI tool calls are logged with status and risk level.
- Unsafe direct timecard edit requests are blocked and routed to a correction-request explanation.
- Copilot UI posts prompts and displays answer mode, answer text, tool name, risk level, and status.
- Admin-scoped tool-call listing is covered by API e2e checks.

Phase 8 verification status:

- Staffing gap API computes ICU RN night gap and ranked coverage candidates.
- Staff directory API returns manager detail and limits employee-facing staff fields.
- Credential warning API surfaces expiring certification risk.
- Payroll timecard resolution endpoint updates exception status and appends audit history.
- Web pages added for staffing gaps, staff directory, credential warnings, and timecard resolution.
- API e2e checks cover staffing gaps, candidate ranking, credential warnings, staff visibility, and timecard resolution.

Phase 9 verification status:

- Integration package defines workforce adapter contracts, sync run summaries, connection metadata, and CSV import previews.
- Demo integration API lists Kronos, payroll CSV, and HRIS connections.
- Manual sync endpoint exercises mock staff, schedule, timecard import, and schedule export paths.
- Sync runs are persisted in demo state and appended to the audit trail.
- Admin integrations console displays connection status, sync history, manual sync controls, and import preview rows.
- API e2e checks cover integration listing, import preview counts, sync run creation, sync run ordering, and audit logging.

Phase 10 verification status:

- Evaluation package defines the copilot task dataset, scoring rubric, aggregate run metrics, and primary safety metric.
- Eval suite covers self-scoped schedule lookup, shift swap preview, manager staffing-gap request, and blocked direct timecard mutation.
- Eval API exposes task inventory, persisted run history, and a run endpoint that scores the live copilot service.
- Admin eval dashboard displays unsafe action attempt rate, tool selection accuracy, answer signal coverage, pass counts, and per-task findings.
- API e2e checks cover task listing, eval execution, zero unsafe action attempts, blocked timecard behavior, and run persistence.

Phase 11 verification status:

- `DEMO.md` documents seeded users, reset instructions, the primary demo flow, and the readiness quality gate.
- Demo reset endpoint restores repeatable workflow state without database edits.
- Admin audit page displays audit logs, AI tool calls, blocked tool count, and demo reset controls.
- App-level loading, error, forbidden, keyboard focus, and reduced-motion states are implemented.
- `npm run test:demo` executes the full MVP demo path: reset, schedule lookup, swap, counterparty accept, manager approval, notifications, blocked AI action, eval run, integration sync, and audit verification.

Phase 16B verification status:

- Full role coverage is implemented for every seeded persona, including organization owner, system admin, workforce admin, unit manager, charge nurse, employee, float coordinator, payroll, credentialing, auditor, executive viewer, external agency admin, and AI service identity.
- Multi-week sandbox schedule data covers self schedules, unit schedules, facility views, agency-scoped views, open shifts, timecard exceptions, credential warnings, audit events, and notifications.
- Role-aware landing pages, navigation, dashboards, schedule modes, secondary workflow pages, and production-hidden demo controls are covered by tests.
- `docs/phase-16b-role-demo.md` defines the standing role walkthrough gate for future production phases.
- Final role coverage gate is passing through web role-walkthrough tests and `npm run test:demo`.

## Source Documents

- `spec.md`: full product specification.
- `plan.md`: architecture and product roadmap.
- `implement.md`: phase-by-phase Goal Mode execution guide.
- `DEMO.md`: repeatable MVP demo script and readiness checklist.
- `docs/production-readiness.md`: Supabase, CI, migration, and production-readiness runbook.
- `docs/phase-16b-role-demo.md`: full-role demo matrix and future-phase role coverage gate.

## Safety Boundaries

The MVP intentionally excludes patient records and PHI. AI actions must be routed through typed backend tools, scoped permissions, policy checks, previews, approvals, and audit logs. AI cannot directly mutate payroll hours, delete audit logs, edit permissions, override credentials, or approve its own proposed actions. The AI service identity is backend-only and must not become a human login or a bypass for role permissions.
