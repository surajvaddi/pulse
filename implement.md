# PulseShift Goal Mode Implementation Guide

## Operating Rules

Use `spec.md` and `plan.md` as the source of truth. Build phase by phase and do not advance until the current phase meets its acceptance gate.

Default implementation choices:

- Use TypeScript everywhere.
- Use a monorepo with `apps/web`, `apps/api`, and shared `packages`.
- Use Next.js App Router for the frontend.
- Use NestJS for the API.
- Use Prisma with PostgreSQL as the source of truth.
- Use Redis and BullMQ for async jobs.
- Use Zod for API/tool validation.
- Use seeded demo users instead of production auth for the initial MVP.
- Use deterministic backend services for all state changes.
- Treat AI as a tool-calling interface only.

Always preserve these safety constraints:

- No patient records or PHI.
- No direct payroll mutation.
- No AI deletion of audit logs.
- No AI permission edits.
- No AI credential override.
- No AI approval of its own proposed action.
- No schedule visibility outside the requesting user's effective scope.
- Every write creates an audit log.
- Every AI tool call creates an `ai_tool_calls` record.

## Phase 0: Repo Scaffold

Build:

- Initialize a package-managed monorepo.
- Create `apps/web`, `apps/api`, and `packages/db`, `packages/domain`, `packages/tools`, `packages/ai`, `packages/evals`, `packages/integrations`.
- Add root TypeScript, lint, format, env example, Docker Compose, and README setup instructions.
- Configure local PostgreSQL and Redis through Docker Compose.
- Add basic health checks for the API and web app.

Acceptance gate:

- `npm install` or chosen package-manager install succeeds.
- Web app starts locally.
- API starts locally.
- PostgreSQL and Redis start with Docker Compose.
- README explains setup and commands.

Verification:

```text
install dependencies
start docker services
run web dev server
run api dev server
run lint/typecheck
```

## Phase 1: Domain Model And Seed Data

Build:

- Add Prisma schema for MVP tables:
  - organizations
  - facilities
  - units
  - users
  - user_roles
  - employee_profiles
  - workforce_roles
  - certifications
  - employee_certifications
  - shift_templates
  - shifts
  - availability_windows
  - shift_swap_requests
  - approval_requests
  - staffing_requirements
  - timecard_events
  - timecard_exceptions
  - notifications
  - ai_conversations
  - ai_messages
  - ai_tool_calls
  - audit_logs
- Add shared domain enums and Zod schemas in `packages/domain`.
- Add permission primitives and scope types matching `spec.md`.
- Seed one organization, two facilities, several units, demo employees, managers, payroll/admin users, roles, certifications, schedules, availability windows, open shifts, timecard exceptions, and staffing requirements.
- Seed the MVP swap demo scenario:
  - Requesting employee has Friday night ICU shift.
  - Maya exists as a qualified candidate.
  - Manager has approval scope for ICU.
  - Overtime and credential data allow a visible policy explanation.

Acceptance gate:

- Prisma migration applies cleanly.
- Seed script creates a usable demo dataset.
- Domain package exports shared types/schemas without circular dependencies.

Verification:

```text
run db migration
run seed script
run prisma studio or equivalent db inspection
run typecheck
```

## Phase 2: Auth, Roles, And Permission Scope

Build:

- Implement demo login that selects seeded users by role.
- Add session context containing user ID, organization ID, role, permissions, and scope.
- Implement API guards for authenticated requests.
- Implement `PermissionService` with RBAC and ABAC checks:
  - self scope
  - unit scope
  - facility scope
  - organization scope
- Enforce scope on schedule, employee, swap, timecard, notification, audit, and AI routes.
- Add a role switcher only for local demo mode.

Acceptance gate:

- Employee can only read their own schedule and allowed request data.
- Unit manager can read and approve only assigned unit workflows.
- Payroll admin can read timecard queues but cannot edit future schedules.
- Admin/auditor can read audit/tool-call records where allowed.

Verification:

```text
run permission unit tests
run API tests for allowed and forbidden access
manually verify seeded roles in web app
```

## Phase 3: Core UI And Schedule Views

Build:

- Implement global desktop layout:
  - top bar with facility/unit switchers, search, profile
  - sidebar with dashboard, schedule, open shifts, swaps, timecards, staff, reports, admin, copilot
- Implement mobile bottom navigation:
  - home, schedule, open shifts, requests, copilot
- Add shared API client and TanStack Query setup.
- Build Employee Home:
  - next shift
  - pending requests
  - qualified open shifts
  - timecard exceptions
  - copilot prompt box
- Build Employee Schedule:
  - list and week views first
  - shift detail drawer
  - request swap, release, message manager, ask copilot actions
- Build Manager Dashboard:
  - tonight coverage
  - tomorrow staffing risk
  - open shifts
  - pending approvals
  - overtime risk
  - call-outs

Acceptance gate:

- Demo employee sees accurate seeded schedule.
- Demo manager sees unit dashboard data scoped to assigned unit.
- Navigation works on desktop and mobile widths.
- No private schedules are exposed to employees.

Verification:

```text
run frontend typecheck
run component tests where available
run manual responsive checks
```

## Phase 4: Scheduling Workflows

Build:

- Implement open shifts list and filters:
  - date
  - facility
  - unit
  - role
  - duration
  - only shifts I qualify for
  - no overtime risk
- Implement open shift claim:
  - safe claim assigns if policy allows
  - risky claim creates approval request
  - blocked claim explains blocking reasons
- Implement swap center:
  - my requests
  - requests for me
  - awaiting manager
  - history
- Implement swap lifecycle:
  - draft or preview
  - pending counterparty
  - pending manager
  - approved
  - denied
  - cancelled
  - expired
- Implement manager approval and denial actions.
- Update shift assignments only after required approvals are complete.

Acceptance gate:

- Employee can create a swap request with Maya.
- Maya can accept or decline.
- Manager can approve or deny.
- Approved swap updates both schedules.
- Denied/cancelled swaps do not mutate schedules.

Verification:

```text
run workflow service tests
run API tests for swap state transitions
run UI smoke test for MVP swap path
```

## Phase 5: Policy Engine, Audit Logs, And Risk Explanations

Build:

- Implement `PolicyEngine` with checks:
  - availability conflict
  - overlapping shift
  - role mismatch
  - certification mismatch
  - expired credential
  - overtime risk
  - rest period violation
  - maximum consecutive shifts
  - unit scope violation
  - manager approval requirement
  - published schedule lock
  - pay period lock
- Return `PolicyDecision` with allowed, requiresApproval, riskFlags, blockingReasons, and warnings.
- Require override reasons for allowed-but-risky manager actions.
- Create audit logs for every write and policy override.
- Add audit views for admin/auditor users.
- Show policy explanations in swap, open shift claim, manager approval, and copilot preview UIs.

Acceptance gate:

- Unsafe operations are blocked.
- Risky operations require approval or reason.
- Every write has an audit log.
- Audit log captures actor, actor type, object, before/after where practical, reason, and timestamp.

Verification:

```text
run policy unit tests
run audit-log integration tests
attempt forbidden employee and AI actions
```

## Phase 6: Notifications And Live Updates

Build:

- Implement in-app notifications:
  - shift assigned
  - shift updated
  - swap requested
  - swap approved
  - swap denied
  - open shift available
  - timecard exception
  - staffing risk
  - approval required
- Add notification inbox with read state and basic filters.
- Add BullMQ jobs for notification delivery.
- Add email adapter interface, with local console/log delivery for MVP.
- Add WebSocket or SSE updates for approvals, swap status, and notifications.

Acceptance gate:

- Swap request notifies Maya.
- Counterparty acceptance notifies manager.
- Manager approval notifies both employees.
- Notifications are visible in-app and update without full page refresh where supported.

Verification:

```text
run notification service tests
run queue worker locally
manually verify notification routing for swap demo
```

## Phase 7: Copilot And Tool Registry

Build:

- Implement AI conversations and messages.
- Add side-panel copilot on app pages and full copilot route.
- Implement tool registry with read, low-risk write, approval-required, and blocked categories.
- Add initial tools:
  - get_my_schedule
  - get_unit_schedule
  - find_open_shifts
  - get_timecard_exceptions
  - compute_staffing_gaps
  - find_qualified_staff
  - explain_policy
  - create_shift_swap_request
  - create_shift_release_request
  - submit_availability
  - create_employee_timecard_note
  - assign_shift
  - approve_swap
  - publish_schedule
  - resolve_timecard_exception
  - broadcast_to_unit
- Add blocked tool behavior for payroll hour edits, audit deletion, AI permission modification, and credential requirement override.
- Implement permission-aware tool execution using requesting user scope.
- Add action preview cards and explicit confirmation for medium-risk writes.
- Add approval request creation for approval-required actions.
- Log every proposed, authorized, executed, blocked, or failed tool call.
- Add clarifying question flow when multiple matching objects exist.

Acceptance gate:

- Employee can ask "When do I work next?" and receive only their own schedule.
- Employee can ask "Can I swap my Friday night ICU shift with Maya?" and create a pending request only after preview/confirmation.
- Manager can ask "Where are we short tomorrow night?" and see scoped staffing gaps.
- Employee asking to change clock-in directly is routed to a correction request, not a direct edit.
- Unauthorized schedule exposure is blocked.

Verification:

```text
run AI tool permission tests
run tool schema validation tests
run blocked-action tests
manually run MVP copilot prompts
```

## Phase 8: Operational Modules

Build:

- Timecard page and exception detail:
  - current pay period
  - clock events
  - exceptions
  - explanation
  - employee correction note
- Payroll exception queue:
  - pay period filter
  - unit filter
  - employee filter
  - severity filter
  - resolve/dismiss/escalate workflow
- Credentialing UI:
  - employee certifications
  - verification
  - expiration warnings
  - revoked/expired status
- Staffing gaps:
  - computed gaps
  - severity ranking
  - candidate ranking
  - find coverage
  - broadcast foundation
- Staff directory:
  - manager-scoped employee profiles
  - limited employee-to-employee visibility for swap candidate search

Acceptance gate:

- Timecard exception explanation works for employee and payroll flows.
- Credential changes can create future staffing risk.
- Staffing gaps compute from requirements and assigned shifts.
- Candidate search respects qualifications, availability, overtime risk, and scope.

Verification:

```text
run staffing computation tests
run timecard service tests
run credentialing service tests
run visibility tests for staff directory
```

## Phase 9: Integrations

Build:

- Add integration connection and sync run tables if not already present.
- Implement adapter interface:
  - pullEmployees
  - pullSchedules
  - pushScheduleChange
  - pullTimecards
- Implement CSV import adapter.
- Implement CSV export for schedules and payroll-adjacent timecard exception status.
- Implement mock Kronos adapter.
- Add sync pipeline:
  - create sync run
  - store raw payload reference or local payload for MVP
  - normalize
  - validate
  - upsert domain objects
  - compute diffs
  - audit changes
  - notify affected users
- Add integration health/admin views.

Acceptance gate:

- CSV import can create/update employees and shifts.
- Mock Kronos sync populates demo schedule data.
- Sync runs show status, counts, and errors.
- External sync changes create audit logs.

Verification:

```text
run adapter tests
run CSV fixture imports
run sync pipeline integration tests
```

## Phase 10: LLM Evaluation Harness

Build:

- Add synthetic task dataset from `spec.md` examples.
- Add model runner interface for:
  - large reference model
  - small local model
  - quantized model
  - distilled model
  - small model plus validator
  - parallel ensemble plus judge
  - cascade router
- Add metrics:
  - tool_selection_accuracy
  - tool_argument_accuracy
  - json_validity
  - unsafe_action_attempt_rate
  - clarifying_question_quality
  - final_answer_correctness
  - latency_ms
  - cost_per_task
  - escalation_rate
  - manager_approval_precision
- Build evaluation dashboard.
- Emphasize `unsafe_action_attempt_rate` as the top metric.

Acceptance gate:

- Evaluation runner can score at least the four example tasks in `spec.md`.
- Dashboard compares model/category results.
- Unsafe actions are visible and treated as failures.

Verification:

```text
run eval dataset
inspect metrics output
verify blocked unsafe task behavior
```

## Phase 11: Hardening And Demo Readiness

Build:

- Add end-to-end tests for the MVP demo script.
- Add responsive and accessibility passes for core pages.
- Add loading, empty, error, and forbidden states.
- Add seed reset command.
- Add complete README:
  - setup
  - environment variables
  - seed users
  - demo script
  - test commands
  - architecture overview
- Add admin demo page for audit logs and AI tool calls.
- Prepare the final MVP demo flow:
  - employee schedule lookup
  - swap request with Maya
  - counterparty accept
  - manager risk review
  - approval
  - schedule update
  - notifications
  - audit trail
  - blocked unsafe AI action
  - evaluation dashboard comparison

Acceptance gate:

- A clean checkout can run setup from README.
- Demo script is repeatable from seeded data.
- Core tests pass.
- MVP demo path works without manual database edits.

Verification:

```text
run full test suite
run e2e demo flow
run lint/typecheck/build
reset seed data and repeat demo
```

