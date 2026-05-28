# PulseShift

PulseShift is a healthcare workforce scheduling copilot and Kronos-style replacement prototype. The product pairs deterministic scheduling services with permission-aware AI tooling for shift lookup, open shifts, swap requests, policy checks, approvals, notifications, audit logs, and LLM evaluation.

## Local Setup

Prerequisites:

- Node.js 20.11 or newer
- npm 10 or newer
- Docker Desktop or another Docker Compose compatible runtime

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

## Source Documents

- `spec.md`: full product specification.
- `plan.md`: architecture and product roadmap.
- `implement.md`: phase-by-phase Goal Mode execution guide.

## Safety Boundaries

The MVP intentionally excludes patient records and PHI. AI actions must be routed through typed backend tools, scoped permissions, policy checks, previews, approvals, and audit logs. AI cannot directly mutate payroll hours, delete audit logs, edit permissions, override credentials, or approve its own proposed actions.
