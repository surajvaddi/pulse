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
  - employee clock-in and clock-out actions
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
- Employee can clock in and clock out from the timecard page.
- Clock-in and clock-out writes create auditable timecard events without allowing direct edits to prior events.
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

## Phase 12: Production Platform Foundation

Build:

- Configure Supabase as the production PostgreSQL target while keeping Prisma as the application ORM.
- Add production environment variables for:
  - `DATABASE_URL`
  - `DIRECT_URL` if Supabase pooled/direct connections are both needed
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_JWT_SECRET` or JWKS configuration
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_API_BASE_URL`
  - LLM provider keys
- Update `.env.example` with local, staging, and production notes.
- Add CI workflow documentation for:
  - install
  - Prisma generate
  - Prisma validate
  - typecheck
  - lint
  - API e2e tests
  - MVP demo-flow e2e test
  - production build
  - high-severity security audit
- Define a repository/service migration pattern for replacing `demo-data.ts` arrays with Prisma-backed services.
- Add a production-readiness document that explains:
  - local Supabase setup
  - hosted Supabase setup
  - connection pooling expectations
  - migration commands
  - seed/reset policy
  - staging versus production safety boundaries

Acceptance gate:

- Prisma can validate and generate against a Supabase-compatible Postgres URL.
- `.env.example` contains every required variable with safe placeholder values.
- README or production docs explain local, staging, and production setup.
- No production code path requires demo-header auth as the long-term strategy.
- The repository/service migration pattern is documented before workflow rewrites begin.

Verification:

```text
run npm install
run db generate
run db validate
run typecheck
run lint
run test
run test:demo
run build with API available for web prerender
run npm audit --audit-level=high
```

## Phase 13: Supabase Auth And Account Creation

Build:

- Add Supabase client configuration for the web app and server-side auth helpers.
- Add API-side Supabase JWT verification.
- Add `supabaseAuthId` to the application `User` model and matching domain/session types.
- Add invitation persistence with:
  - organization ID
  - email
  - role
  - scope
  - token hash
  - status
  - invited by user ID
  - expiration timestamp
  - accepted timestamp
- Replace `DemoAuthMiddleware` for production routes with an auth guard that:
  - verifies the Supabase session/JWT
  - loads the app user from Postgres
  - loads roles, permissions, and scopes
  - rejects inactive, suspended, missing, expired, or cross-organization users
- Keep demo-header auth only behind an explicit local/demo mode flag.
- Add web routes:
  - `/login`
  - `/invite/accept`
  - `/onboarding/profile`
  - `/onboarding/organization`
  - `/logout`
- Add API routes:
  - `GET /auth/me`
  - `POST /auth/logout`
  - `POST /users/invite`
  - `GET /invitations/:token`
  - `POST /invitations/:token/accept`
- Invite acceptance should create or link the Supabase auth user, activate the app user, attach role/scope, and route to the correct onboarding step.

Acceptance gate:

- A new organization admin can invite a workforce member.
- Invitee can accept the invite, authenticate with Supabase, complete profile confirmation, and access the app.
- Authenticated users receive accurate organization, role, permission, scope, and employee profile data from `/auth/me`.
- Suspended or inactive users cannot access protected API routes.
- Demo auth cannot be accidentally enabled in production.

Verification:

```text
run Prisma migration
run seed script
run auth unit tests
run invite token validation tests
run API e2e tests for login/session/invite acceptance
run forbidden tests for inactive and cross-organization users
run web typecheck and lint
manually verify login and invite acceptance in local Supabase
```

## Phase 14: Database-Backed Core Workflows

Build:

- Replace in-memory workflow state with Prisma-backed services for:
  - schedules
  - swaps
  - approvals
  - notifications
  - audit logs
  - AI tool calls
  - integrations
  - eval runs
  - staff directory
  - credentials
  - clock-in/out events
  - timecard exceptions
- Preserve existing API behavior while changing the persistence layer.
- Implement repository/service classes for each workflow boundary instead of querying Prisma directly from controllers.
- Make swap approval transactional:
  - verify manager permission
  - verify approval status
  - evaluate policy
  - update swap
  - update approval
  - reassign shift
  - create notifications
  - append audit log
- Make all workflow writes append audit records.
- Move demo reset to local/staging-only tooling; do not expose destructive reset in production.
- Add seed data that recreates the current MVP demo path in the database.
- Add a dedicated SQL reporting/tooling layer for read-heavy dashboard and LLM tools:
  - predefined SQL only
  - no model-authored SQL
  - no free-form SQL text input
  - typed parameter objects
  - mandatory organization scope injected by the server
  - permission checks before query execution
  - result limits
  - query timeout configuration
  - audit/tool-call metadata for LLM use
- Implement initial predefined SQL reports:
  - `get_staffing_gaps_report`
  - `get_employee_schedule_report`
  - `get_timecard_exceptions_report`
  - `get_credential_expiry_report`
  - `get_audit_activity_report`
- Keep write workflows on Prisma/service methods, not SQL reporting tools.

Acceptance gate:

- Existing demo flow works from database-backed state.
- Restarting the API does not lose schedules, swaps, approvals, notifications, audits, tool calls, eval runs, or integration runs.
- Swap approval cannot partially update schedule state if any transaction step fails.
- All current API e2e tests pass against Prisma-backed services.
- Production mode has no public destructive reset endpoint.
- LLM-facing SQL tools expose only named reports with concrete SQL definitions and typed parameters.
- Any attempt to pass arbitrary SQL text is impossible at the API/tool contract level.
- Reporting queries enforce tenant isolation, permission checks, row limits, and timeouts.

Verification:

```text
run Prisma migration
run db seed
run repository unit tests
run transaction failure tests for swap approval
run SQL report unit tests for each predefined query
run SQL report tenant-isolation tests
run SQL report parameter validation tests
run SQL report result-limit tests
review EXPLAIN plans for high-traffic reports
run API e2e tests
run MVP demo-flow e2e test
restart API and verify persisted workflow state
run typecheck/lint/build
```

## Phase 15: Multi-Tenant SaaS Administration

Build:

- Add organization administration APIs and pages for:
  - organizations
  - facilities
  - units
  - users
  - roles
  - workforce roles
  - invitations
  - suspensions and reactivations
- Enforce organization boundaries on every query and mutation.
- Add role assignment flow with explicit scope selection:
  - organization scope
  - facility scope
  - unit scope
  - self scope where applicable
- Add concise explanations for each role and scope so admins understand operational impact.
- Add invite status tracking:
  - pending
  - accepted
  - expired
  - revoked
- Add admin audit entries for user invite, role assignment, suspension, reactivation, facility/unit changes, and invite revocation.
- Add UI safeguards for high-impact admin changes:
  - confirmation state
  - reason field where appropriate
  - visible audit note

Acceptance gate:

- Organization admins can manage users, roles, facilities, units, and invitations without direct database edits.
- Users from one organization cannot read or mutate another organization's records.
- Every admin mutation creates an audit log.
- Role/scope explanations are visible before assignment.
- Suspended users lose access immediately.

Verification:

```text
run API e2e tests for organization isolation
run API e2e tests for invite, role assignment, suspension, and reactivation
run audit assertion tests for admin mutations
run UI smoke tests for admin pages
run typecheck/lint/build
manually verify cross-organization denial
```

## Phase 16: Operational UI Redesign

Build:

- Redesign the app shell for production account usage:
  - remove demo user switcher from production
  - add authenticated profile/account menu
  - show organization, facility, and unit context clearly
  - preserve mobile navigation
- Redesign employee workflows:
  - next shift
  - schedule
  - open shifts
  - swap requests
  - timecard exceptions
  - notifications
  - copilot
- Redesign manager workflows:
  - coverage dashboard
  - staffing gaps
  - approvals
  - staff directory
  - overtime and credential risk
  - audit context
- Redesign admin workflows:
  - users
  - invitations
  - facilities
  - units
  - roles
  - integrations
  - audit
  - evals
  - system health
- Add concise explanatory copy for:
  - workflow status
  - policy flags
  - approval requirements
  - AI action previews
  - blocked AI actions
  - integration sync outcomes
  - role/scope impact
- Add production-grade empty, loading, error, forbidden, success, confirmation, and destructive-action states.
- Maintain accessible keyboard navigation, focus states, form labels, and responsive layouts.

Acceptance gate:

- Each role lands on a dashboard tailored to its operational needs.
- Demo-only controls are removed or explicitly gated from production.
- Every action page explains what will happen before a high-impact mutation.
- Empty/error/forbidden states are useful and non-technical.
- Core workflows are usable at mobile and desktop widths.

Verification:

```text
run web typecheck
run web lint
run UI smoke tests for employee, manager, and admin routes
run accessibility checks for core pages
run responsive manual checks at mobile/tablet/desktop widths
run production build
```

## Phase 17: Notifications, Realtime, And Communication Preferences

Build:

- Persist notifications and read state in Postgres.
- Add notification preferences per user:
  - in-app
  - email
  - SMS later
  - push later
- Add realtime or near-realtime updates using Supabase Realtime or API polling for:
  - approvals
  - swaps
  - schedule changes
  - staffing gaps
  - notification reads
- Add notification delivery metadata:
  - channel
  - status
  - attempted at
  - delivered at
  - failure reason
- Add retry handling for failed notification delivery where appropriate.
- Keep urgent or broad broadcasts confirmation-gated.
- Add user-facing explanations for notification types and delivery state.

Acceptance gate:

- Notification state persists across API restarts.
- Users can update notification preferences.
- Workflow-created notifications appear without a full manual refresh or within the documented polling interval.
- Failed delivery states are visible to admins/operators.
- Broad or urgent notifications cannot be sent without confirmation.

Verification:

```text
run notification service unit tests
run API e2e tests for notification creation, read state, and preferences
run realtime or polling smoke tests
run failure-state tests for notification delivery
run UI smoke tests for inbox and preferences
run typecheck/lint/build
```

## Phase 18: Tool-Gated Real LLM Integration

Build:

- Add an OpenAI-compatible LLM gateway in the AI package.
- Configure model routes for:
  - lightweight routing/classification
  - stronger reasoning
  - embeddings if RAG is enabled
  - moderation/safety checks
- Replace deterministic copilot routing with real provider calls while keeping backend tool execution deterministic.
- Route read-heavy LLM data access through the dedicated SQL reporting/tooling layer only when a matching predefined report exists.
- Keep all tools typed, permission-checked, policy-checked, previewed, approval-gated, and audited.
- Prohibit arbitrary SQL generation in prompts, tool schemas, API routes, and backend executors.
- Ensure the LLM can request only named SQL-backed tools with typed parameters, never raw SQL text.
- Persist conversation and tool-call metadata:
  - provider
  - model
  - latency
  - input tokens
  - output tokens
  - estimated cost
  - safety status
  - blocked-action reason
- Add prompts/system instructions that enforce:
  - no PHI
  - no direct payroll mutation
  - no unauthorized schedule access
  - no silent writes
  - no permission edits
- no audit deletion
- no SQL writing, editing, or execution by the model
- Expand eval dashboard to compare deterministic baseline and real model behavior.
- Fail staging/CI eval gates if blocked tasks produce unsafe action attempts.

Acceptance gate:

- Copilot can answer current schedule, swap, staffing, and timecard prompts through real LLM calls.
- Real LLM cannot execute a backend mutation except through authorized tools.
- Real LLM cannot execute arbitrary SQL and can only call predefined SQL-backed reporting tools.
- Blocked direct timecard mutation still returns a blocked response.
- AI tool calls persist with provider/model/token/cost metadata.
- Eval unsafe action attempt rate remains zero for blocked tasks.

Verification:

```text
run AI gateway unit tests with mocked provider responses
run tool validation tests
run SQL-backed tool contract tests
run arbitrary-SQL refusal/absence tests
run copilot API e2e tests
run LLM eval suite against mock provider fixtures
run optional live-provider smoke test when API key is present
run audit/tool-call persistence assertions
run typecheck/lint/build
```

## Phase 19: Security, Compliance, And HIPAA-Ready Controls

Build:

- Keep PHI explicitly out of product scope and documentation.
- Add production security controls:
  - secure cookies/session handling
  - CORS allowlist
  - rate limits
  - request IDs
  - structured logs
  - error redaction
  - secrets hygiene
  - backup and restore documentation
  - dependency audit policy
- Add audit protections:
  - no user-facing audit delete
  - append-only application behavior
  - admin export
  - audit retention policy
- Add access review and incident response documents.
- Add vendor and BAA checklist for Supabase, LLM provider, hosting provider, email/SMS provider, and monitoring provider.
- Add operational monitoring for:
  - auth failures
  - permission denials
  - blocked AI actions
  - integration failures
  - workflow errors
  - notification delivery failures
- Add production-safe logging rules that prevent sensitive workforce or auth data from being logged unnecessarily.

Acceptance gate:

- High-severity dependency audit is clean or documented with approved mitigation.
- API rejects disallowed origins in production.
- Rate limits protect auth, invite, copilot, and write-heavy endpoints.
- Audit records cannot be deleted through public API.
- Security and HIPAA-ready docs are present and actionable.
- Monitoring events exist for the highest-risk operational failures.

Verification:

```text
run security unit tests for CORS/rate limit/session behavior
run API e2e tests for audit delete absence and permission denials
run npm audit --audit-level=high
run log redaction checks
review backup/restore docs
review incident response and access review docs
run typecheck/lint/test/build
```

## Phase 20: Production Deployment And Launch Readiness

Build:

- Add deployment documentation for:
  - web app
  - API
  - Supabase database
  - Supabase auth settings
  - environment variables
  - migrations
  - seed/bootstrap
  - monitoring
- Add staging and production runbooks.
- Add smoke tests for:
  - login
  - invite acceptance
  - schedule read
  - swap workflow
  - approval workflow
  - notification read
  - audit view
  - integration sync
  - copilot blocked action
  - eval suite execution
- Add release checklist:
  - migrations applied
  - Supabase settings verified
  - tenant scoping verified
  - backups enabled
  - monitoring configured
  - audit export tested
  - eval suite passing
  - high-severity audit clean
- Add rollback plan for:
  - web deploy
  - API deploy
  - database migration
  - failed integration rollout
  - failed LLM provider rollout
- Remove or strictly gate demo-only affordances in production builds.

Acceptance gate:

- A new staging environment can be provisioned from docs without undocumented steps.
- Smoke tests pass against staging.
- Production release checklist is complete and repeatable.
- Rollback plan is documented before production launch.
- Demo-only controls cannot be accessed in production mode.

Verification:

```text
run staging deployment dry run
run migrations against staging
run staging smoke test suite
run production build
run typecheck/lint/test/test:demo
run npm audit --audit-level=high
verify production env blocks demo-only routes and controls
review release and rollback checklists
```

## Goal Mode Execution Protocol For Phases 14-20

Use this protocol for every remaining production step:

- Complete one step at a time.
- Keep each step focused on either one clear build unit or one integration boundary.
- Build units may include a small interface, class, repository, service, controller method set, UI component group, or test fixture.
- Integration steps may connect two previously built units, such as a service to a repository, a page to an API action, or an LLM tool to the tool registry.
- End every step with verification that proves the touched unit and surrounding workflow still work.
- After every completed step, commit to GitHub with this format:
  - `Word: Action ...`
  - first word is a capitalized description word
  - colon follows the description word
  - first word after the colon is a capitalized action verb
  - examples: `Persistence: Add schedule repository`, `Admin: Build role assignment service`, `LLM: Register staffing report tool`
- After every completed step, report:
  - changed files
  - functions/classes/interfaces added or changed
  - tests and verification commands run
  - behavior the user should understand
  - commit hash

## Phase 14 Goal Mode Steps: Database-Backed Core Workflows

1. `Persistence: Define workflow repository contracts`
   - Purpose: Add shared repository interfaces for schedules, swaps, approvals, notifications, audit logs, integrations, evals, staff, credentials, timecards, and SQL reports.
   - Build: interfaces only, plus typed input/output DTOs where missing.
   - Verify: run `npm run typecheck --workspace @pulseshift/api`, `npm run lint --workspace @pulseshift/api`.

2. `Persistence: Build schedule repository`
   - Purpose: Move schedule reads from demo arrays into a repository with in-memory and Prisma implementations.
   - Build: schedule repository class methods for `findMySchedule`, `findUnitSchedule`, and `findOpenShifts`.
   - Verify: schedule API e2e assertions, `npm run test --workspace @pulseshift/api`, `npm run test:demo`.

3. `Persistence: Integrate schedule service`
   - Purpose: Route schedule controllers through the schedule service/repository boundary.
   - Build: service methods, controller delegation, permission-preserving tests.
   - Verify: employee self schedule allowed, employee unit schedule forbidden, manager unit schedule allowed.

4. `Persistence: Build swap repository`
   - Purpose: Persist shift swap requests and approvals through Prisma while preserving in-memory test parity.
   - Build: repository methods for create, list, accept, decline, manager approve, manager deny.
   - Verify: swap lifecycle e2e tests and repository unit tests.

5. `Persistence: Add transactional swap approval`
   - Purpose: Make manager approval atomic.
   - Build: transaction that checks permission, approval status, policy result, swap update, approval update, shift reassignment, notifications, and audit write.
   - Verify: transaction success test and injected failure test proving no partial schedule reassignment.

6. `Persistence: Build notification repository`
   - Purpose: Persist notification reads and workflow-created notification records.
   - Build: repository methods for list, create, mark read, and workflow append.
   - Verify: notification read e2e test before and after API restart where practical.

7. `Persistence: Build audit repository`
   - Purpose: Centralize append-only audit writes.
   - Build: audit service/repository methods for workflow actions, admin actions, AI tool calls, and integration runs.
   - Verify: audit assertion tests for clock-in/out, swap approval, invite, role changes, and integration sync.

8. `Persistence: Build operations repositories`
   - Purpose: Persist staff directory, credential warnings, staffing gaps, and timecard exceptions.
   - Build: repositories plus service methods for staff list, coverage candidates, credential warnings, exception reads, exception resolution.
   - Verify: operations API e2e tests for employee, manager, payroll, and admin access.

9. `Persistence: Build integration repositories`
   - Purpose: Persist integration connections, import previews, and sync runs.
   - Build: repository methods for list connections, preview import, run sync, list sync runs.
   - Verify: integration API e2e tests and sync audit assertion.

10. `Persistence: Build eval repositories`
    - Purpose: Persist eval tasks and eval runs.
    - Build: repository/service methods for list tasks, run evals, list runs.
    - Verify: eval API e2e tests and stored run assertions.

11. `Reporting: Define SQL report registry`
    - Purpose: Create the dedicated SQL reporting/tooling layer contract.
    - Build: named report registry, typed parameter schemas, result schemas, permission metadata, row limit config, timeout config.
    - Verify: contract tests proving no raw SQL parameter exists.

12. `Reporting: Add staffing SQL report`
    - Purpose: Implement `get_staffing_gaps_report` with fixed SQL.
    - Build: one predefined SQL query with server-injected organization scope and typed params.
    - Verify: tenant isolation, permission denial, row limit, and expected result tests.

13. `Reporting: Add schedule SQL report`
    - Purpose: Implement `get_employee_schedule_report` with fixed SQL.
    - Build: one predefined SQL query for employee schedule windows.
    - Verify: self-scope allowed, cross-user denied, manager/unit scope allowed where appropriate.

14. `Reporting: Add timecard SQL report`
    - Purpose: Implement `get_timecard_exceptions_report` with fixed SQL.
    - Build: one predefined SQL query for timecard exception review.
    - Verify: payroll/manager allowed, employee self-only behavior, no raw SQL input path.

15. `Reporting: Add credential SQL report`
    - Purpose: Implement `get_credential_expiry_report` with fixed SQL.
    - Build: one predefined SQL query for credential expiration risk.
    - Verify: manager/admin access, result limits, date parameter validation.

16. `Reporting: Add audit SQL report`
    - Purpose: Implement `get_audit_activity_report` with fixed SQL.
    - Build: one predefined SQL query for audit search and activity summaries.
    - Verify: admin-only access, bounded result size, action/date filter tests.

17. `Persistence: Remove production demo reset access`
    - Purpose: Ensure destructive reset cannot run in production mode.
    - Build: environment guard and route tests.
    - Verify: `ENABLE_DEMO_RESET=false` returns 403 and production UI exposes no reset control.

18. `Persistence: Verify database-backed demo flow`
    - Purpose: Prove persisted workflows survive API restart.
    - Build: no new feature code unless gaps are found; add restart/smoke fixture if practical.
    - Verify: seed, run flow, restart API, verify schedules/swaps/approvals/notifications/audit/tool calls remain.

## Phase 15 Goal Mode Steps: Multi-Tenant SaaS Administration

1. `Admin: Define role permission matrix`
   - Purpose: Create the production role, permission, scope, and page interaction matrix.
   - Build: role matrix constants/docs covering every role, each major page, allowed actions, hidden actions, read/write level, scope, empty/forbidden state, and audit events.
   - Verify: matrix unit tests or static assertions that every role and every production page is covered.

1. `Admin: Define administration contracts`
   - Purpose: Add DTOs/interfaces for organizations, facilities, units, users, roles, invitations, suspensions, and audit reasons.
   - Build: schemas and service interfaces.
   - Verify: typecheck and schema unit tests.

2. `Admin: Build organization service`
   - Purpose: Read and update organization profile safely.
   - Build: methods for organization summary, settings update, and status checks.
   - Verify: org admin allowed, cross-org denied.

3. `Admin: Build facility service`
   - Purpose: Manage facilities within an organization.
   - Build: list, create, update, deactivate methods.
   - Verify: tenant isolation and audit write tests.

4. `Admin: Build unit service`
   - Purpose: Manage units and manager assignments.
   - Build: list, create, update, assign manager, deactivate methods.
   - Verify: unit scope tests and manager assignment audit tests.

5. `Admin: Build user management service`
   - Purpose: List users and manage account status.
   - Build: list, detail, suspend, reactivate methods.
   - Verify: suspended user cannot access protected API routes.

6. `Admin: Build role assignment service`
   - Purpose: Assign role and scope through controlled choices.
   - Build: assign role, update scope, remove role methods with derived permissions.
   - Verify: role/scope permission tests and no arbitrary permission entry path.

7. `Admin: Build invitation management service`
   - Purpose: Manage pending, accepted, expired, and revoked invitations.
   - Build: list invites, revoke invite, resend invite metadata methods.
   - Verify: invite status tests and audit assertions.

8. `Admin: Add administration controllers`
   - Purpose: Expose service methods through tenant-scoped API routes.
   - Build: organization, facility, unit, user, role, invitation controllers.
   - Verify: API e2e tests for allowed/forbidden paths.

9. `Admin: Build administration pages`
   - Purpose: Add role-aware admin UI for users, invites, facilities, units, and roles.
   - Build: pages, forms, confirmation states, reason fields.
   - Verify: web typecheck, web lint, UI smoke tests.

10. `Admin: Integrate admin audit trail`
    - Purpose: Ensure every admin mutation appends audit records.
    - Build: audit calls in each admin service method.
    - Verify: audit assertion tests for invite, role assignment, suspension, reactivation, facility/unit changes.

## Phase 16 Goal Mode Steps: Operational UI Redesign

1. `Interface: Define page interaction contracts`
   - Purpose: Turn the role/page matrix into frontend route contracts.
   - Build: page config objects declaring allowed roles, required permissions, required scope, visible actions, hidden actions, empty state, forbidden state, and LLM context availability.
   - Verify: static tests proving every app route has a page contract and unsupported roles are denied.

1. `Interface: Build session-aware navigation`
   - Purpose: Render navigation from `/auth/me` role, scopes, and permissions.
   - Build: role nav config, filtering function, layout integration.
   - Verify: employee/manager/payroll/admin nav smoke tests.

2. `Interface: Build role landing router`
   - Purpose: Send users to the right dashboard after login.
   - Build: landing resolver and redirect behavior.
   - Verify: login smoke tests for all seeded roles.

3. `Interface: Build employee dashboard`
   - Purpose: Give employees a focused home for shift, swap, timecard, notification, and copilot tasks.
   - Build: dashboard component group and API wiring.
   - Verify: employee page smoke test and no manager/admin controls visible.

4. `Interface: Build schedule view model`
   - Purpose: Make the schedule page understandable across roles before rendering it.
   - Build: schedule view model with day/week/list modes, shift status labels, risk flag explanations, timezone display, filters, and role-specific action availability.
   - Verify: view-model tests for employee self schedule, manager unit schedule, workforce admin facility schedule, payroll read-only behavior, and hidden out-of-scope shifts.

5. `Interface: Build manager dashboard`
   - Purpose: Give managers operational coverage, staffing, approval, staff, and risk context.
   - Build: manager dashboard components and service calls.
   - Verify: manager page smoke test and unit-scope enforcement.

6. `Interface: Build payroll dashboard`
   - Purpose: Give payroll users timecard exceptions, export readiness, and audit context.
   - Build: payroll dashboard components and exception actions.
   - Verify: payroll page smoke test and employee self-data denial.

7. `Interface: Build system admin dashboard`
   - Purpose: Give system admins user, invite, facility, unit, role, integration, audit, eval, and system health access.
   - Build: admin dashboard components and route links.
   - Verify: admin page smoke test and non-admin denial.

8. `Interface: Redesign schedule page`
   - Purpose: Render the schedule view clearly for employees, managers, workforce admins, and admins.
   - Build: schedule page components for day/week/list modes, filters, shift cards, risk explanations, approval markers, and accessible mobile fallback.
   - Verify: UI smoke tests for employee, manager, workforce admin, payroll read-only, and system admin schedule access.

9. `Interface: Add workflow explanations`
   - Purpose: Add concise, useful copy for statuses, policy flags, approvals, AI actions, and integration outcomes.
   - Build: explanation helpers and page integrations.
   - Verify: UI tests for expected explanation text on key states.

10. `Interface: Add production states`
   - Purpose: Standardize empty, loading, error, forbidden, success, confirmation, and destructive-action states.
   - Build: reusable state components and route integrations.
   - Verify: component tests or smoke tests for all state variants.

11. `Interface: Verify responsive accessibility`
   - Purpose: Ensure keyboard navigation, focus states, labels, and mobile layouts work.
   - Build: focused fixes only.
   - Verify: responsive manual checks, accessibility checks, web lint/build.

## Phase 16B Goal Mode Steps: Full Role Demo Coverage

1. `Demo: Expand role sandbox data`
   - Purpose: Give every production role realistic data to view during demos.
   - Build: multi-week shifts, open shifts, staff, credentials, timecard exceptions, notifications, audit records, integration status, and role personas.
   - Verify: API typecheck/lint/e2e, demo flow, and assertions that each role has sample data in scope.

2. `Access: Add role persona session coverage`
   - Purpose: Make every production role selectable and permission-scoped in demo mode.
   - Build: demo auth sessions for organization owner, workforce admin, charge nurse, float pool coordinator, credentialing admin, compliance auditor, executive viewer, external agency admin, and AI service handling.
   - Verify: permission e2e tests for allowed and forbidden route families by role.

3. `Views: Build role landing and dashboard coverage`
   - Purpose: Ensure every role lands on a meaningful page rather than a generic employee/admin screen.
   - Build: role-specific dashboard view models and route rendering for charge nurse, workforce admin, float coordinator, credentialing admin, auditor, executive viewer, external agency admin, organization owner, and AI service/blocked service identity behavior.
   - Verify: web typecheck/lint, dashboard model assertions, and landing-route assertions for every role.

4. `Schedule: Add role-specific schedule modes`
   - Purpose: Make schedule views clear for employees, managers, charge nurses, workforce admins, float coordinators, executives, and admins.
   - Build: employee personal calendar, unit board, facility planner, org overview, open-shift/agency view, read-only executive summary, status/risk legends, and role-appropriate actions.
   - Verify: schedule model tests by role, API scope tests, and web smoke assertions for no cross-scope leakage.

5. `Operations: Complete secondary workflow pages`
   - Purpose: Make open shifts, swaps, staffing, staff, credentials, audit, evals, integrations, notifications, and copilot useful or explicitly unavailable for every role.
   - Build: role-aware empty/read-only/action states, concise page explanations, and links to next workflow steps.
   - Verify: page contract completeness tests, web assertions, API permission tests, and demo flow.

6. `Demo: Add multi-week sandbox scenarios`
   - Purpose: Provide a richer demo timeline across several weeks.
   - Build: assigned, open, pending, blocked, credential-risk, overtime-risk, payroll-exception, staffing-gap, integration, audit, notification, and eval scenarios.
   - Verify: deterministic reset assertions and sandbox data tests.

7. `Quality: Add role walkthrough tests`
   - Purpose: Prove every demo role can sign in, land somewhere meaningful, see role-appropriate navigation, and access sample data.
   - Build: API/web role walkthrough assertions and route matrix checks.
   - Verify: walkthrough suite, web typecheck/lint/test, API typecheck/lint/test, demo flow.

8. `QA: Run final role coverage gate`
   - Purpose: Confirm Phase 16B is ready for hands-on demos.
   - Build: only fixes discovered by the final gate.
   - Verify: web production build, API/web typecheck, API/web lint, API/web tests, demo flow, clean working tree.

## Phase 17 Goal Mode Steps: Notifications, Realtime, And Communication Preferences

Phase 17 must preserve the Phase 16B role coverage gate. Every notification preference, inbox state, realtime event, and delivery failure view must define role visibility, actionability, read-only context, forbidden behavior, and walkthrough coverage for all demo personas.

1. `Notifications: Define preference schema`
   - Purpose: Add the data contract for notification preferences without changing runtime behavior.
   - Sub-steps:
     - Add Prisma models/enums for notification preferences, channel preferences, event categories, delivery urgency, and immutable/system-critical settings.
     - Add matching domain schemas and exported TypeScript types.
     - Add role/channel default mapping for every Phase 16B persona.
     - Add repository interfaces for preference reads/writes and default hydration.
   - Tests:
     - `npm run db:validate`
     - `npm run db:generate`
     - domain/unit tests for role default coverage across every Phase 16B role
     - typecheck for API/domain packages
   - Commit: `Notifications: Define preference schema`

2. `Notifications: Persist notification repository`
   - Purpose: Move notification reads/writes toward durable, scope-aware persistence.
   - Sub-steps:
     - Extend notification records with organization, recipient, role, category, priority, delivery metadata, and read/delivery timestamps.
     - Implement repository methods for list, create, mark read, mark unread if needed, update delivery status, and fetch unread counts.
     - Keep the in-memory adapter aligned for local demo mode.
     - Ensure every repository method enforces tenant, recipient, role, and scope constraints.
   - Tests:
     - repository unit tests for list/create/read/update delivery
     - tenant isolation tests
     - recipient isolation tests
     - API e2e tests for employee, manager, payroll, credentialing, auditor, executive, admin, and agency notification reads
   - Commit: `Notifications: Persist repository state`

3. `Notifications: Build preference service`
   - Purpose: Add the application service that owns preference rules and channel permissions.
   - Sub-steps:
     - Implement get/update preference methods.
     - Apply role-specific channel eligibility for in-app, email, SMS, and urgent/system messages.
     - Prevent users from disabling required safety, approval, payroll, credential, and compliance alerts where policy requires delivery.
     - Add controller routes for current-user preferences.
     - Add admin/operator read-only access only where justified by role permissions.
   - Tests:
     - self-access preference tests
     - cross-user denial tests
     - immutable critical alert tests
     - role/channel matrix tests for all Phase 16B roles
   - Commit: `Notifications: Build preference service`

4. `Notifications: Integrate workflow events`
   - Purpose: Replace scattered notification creation with a role-aware event publisher.
   - Sub-steps:
     - Define workflow notification event types for swaps, approvals, schedule changes, open shifts, staffing gaps, timecard exceptions, credentials, integrations, and AI/tool safety.
     - Add a notification event publisher used by workflow services.
     - Map each event to eligible recipient roles and scopes.
     - Preserve audit writes for notification creation and denied/non-delivered events where relevant.
   - Tests:
     - workflow e2e tests assert notification creation for eligible recipients
     - denial/non-delivery tests for roles outside scope
     - audit assertions for important workflow notification events
     - `npm run test --workspace @pulseshift/api`
   - Commit: `Notifications: Publish workflow events`

5. `Notifications: Add update transport`
   - Purpose: Surface notification changes without requiring a full manual page refresh.
   - Sub-steps:
     - Choose the first production-compatible transport for this phase: scoped polling by default, Supabase Realtime wrapper if the existing environment is ready.
     - Add unread count and recent notification API support if needed by the web shell.
     - Add a client hook/helper scoped to the active user and organization.
     - Ensure production auth and demo auth both use the same scoped transport contract.
   - Tests:
     - API tests for unread counts and scoped recent notifications
     - web tests for read-state refresh and new notification visibility
     - role smoke checks for employee, manager, payroll, credentialing, auditor, executive, agency, and admin accounts
   - Commit: `Notifications: Add update transport`

6. `Notifications: Improve inbox experience`
   - Purpose: Make the notification inbox useful, understandable, and role-aware.
   - Sub-steps:
     - Replace raw JSON payload rendering with concise human-readable notification summaries.
     - Add category, priority, source workflow, timestamp, and status display.
     - Add clear empty, loading, forbidden, and error states.
     - Add role-aware action affordances only when the user can act on the notification.
     - Preserve keyboard and responsive behavior.
   - Tests:
     - web component/page tests for rendering and empty/forbidden states
     - action visibility tests for role/page contracts
     - `npm run test --workspace @pulseshift/web`
     - `npm run lint --workspace @pulseshift/web`
   - Commit: `Notifications: Improve inbox experience`

7. `Notifications: Build preferences UI`
   - Purpose: Let users safely view and edit delivery preferences.
   - Sub-steps:
     - Add preferences route or account-panel section.
     - Render role-aware channel controls, category controls, disabled critical settings, and save feedback.
     - Wire server actions/API calls to the preference service.
     - Add concise explanatory text for why critical alerts cannot be disabled.
     - Hide or deny editing for roles without editable preferences.
   - Tests:
     - web tests for preference display, save behavior, disabled critical settings, and forbidden/read-only roles
     - API e2e tests for update success and denial paths
     - role walkthrough assertions remain complete
   - Commit: `Notifications: Build preferences UI`

8. `Delivery: Track notification failures`
   - Purpose: Give admins/operators visibility into delivery problems without exposing sensitive details to the wrong roles.
   - Sub-steps:
     - Add failure reason, retry count, last attempted timestamp, next retry timestamp, and provider metadata fields.
     - Add service method to record delivery attempts and failures.
     - Add admin/operator review view or section.
     - Add user-safe failure messaging for recipient-facing pages.
     - Emit monitoring events for repeated failures and blocked channels.
   - Tests:
     - failure-state unit tests
     - admin/operator UI smoke tests
     - non-admin denial tests
     - monitoring event/redaction assertions
   - Commit: `Delivery: Track notification failures`

9. `Quality: Run phase 17 gate`
   - Purpose: Validate Phase 17 end to end before moving to Phase 18.
   - Sub-steps:
     - Run full API and web typecheck/lint/test suites.
     - Run demo flow and Phase 16B role walkthrough assertions.
     - Run production build with the API available.
     - Fix only Phase 17 regressions discovered by the gate.
     - Confirm the working tree only contains intentional Phase 17 changes.
   - Tests:
     - `npm run db:validate`
     - `npm run typecheck`
     - `npm run lint`
     - `npm run test`
     - `npm run test:demo`
     - `npm run build`
   - Commit: `Quality: Run phase 17 gate`

## Phase 18 Goal Mode Steps: Tool-Gated Real LLM Integration

Phase 18 must use the Phase 16B role matrix as the mandatory LLM test surface. Each tool must define allowed roles, read-only roles, approval-required roles, blocked roles, scope requirements, audit/tool-call metadata, and whether a predefined SQL report may be used. The LLM must never generate SQL or bypass backend services.

1. `LLM: Define provider gateway interface`
   - Purpose: Create provider-neutral LLM request/response contracts.
   - Sub-steps:
     - Add request/response types for chat messages, tool proposals, structured outputs, usage, latency, provider IDs, model IDs, and normalized errors.
     - Add a role/scope/page context envelope that includes actor user ID, role, permissions, organization scope, current page, and production/demo mode.
     - Add model route config types for fast, reasoning, safety, and eval routes without hard-coding one vendor.
     - Add a no-provider mock gateway for deterministic tests.
   - Tests:
     - AI package typecheck
     - gateway serialization tests
     - normalized provider error tests
     - role-context tests across every Phase 16B role
   - Commit: `LLM: Define provider gateway interface`

2. `LLM: Build OpenAI-compatible provider`
   - Purpose: Call an OpenAI-compatible chat/completions API safely.
   - Sub-steps:
     - Implement provider class that accepts base URL, API key, model, timeout, and retry config.
     - Normalize OpenAI-compatible success, refusal, rate-limit, timeout, auth, and malformed-response cases.
     - Keep live network calls behind explicit environment opt-in so CI uses mocks.
     - Ensure secrets are read server-side only and never serialized to web clients, tool calls, or audit payloads.
   - Tests:
     - mocked provider success test
     - timeout/error normalization tests
     - missing-key disabled-provider test
     - secret redaction assertion
   - Commit: `LLM: Build OpenAI provider`

3. `LLM: Build model router`
   - Purpose: Route tasks to lightweight, reasoning, embedding, or safety models.
   - Sub-steps:
     - Add route names for self-service chat, manager operations, SQL/report summarization, workflow preview, safety review, and eval runs.
     - Read provider/model mapping from env-backed config with safe defaults.
     - Add fallback behavior when a route is disabled.
     - Add cost/latency budget metadata per route.
   - Tests:
     - route selection tests for every route name
     - disabled-route fallback tests
     - env config parsing tests
     - budget metadata assertions
   - Commit: `LLM: Build model router`

4. `LLM: Define tool registry contracts`
   - Purpose: Make tool schemas typed and permission-aware.
   - Sub-steps:
     - Define tool contract shape with name, description, input schema, output schema, risk level, route availability, page context, and audit metadata.
     - Add required role matrix declarations: allowed, read-only, approval-required, and blocked.
     - Add scope requirements for self, unit, facility, org, agency, and AI service identity.
     - Add registry validation that rejects missing role coverage, missing schemas, arbitrary SQL tools, or mutation tools without policy gates.
   - Tests:
     - tool registry validation tests
     - role matrix completeness assertion for every Phase 16B role
     - page-context declaration tests
     - arbitrary SQL tool rejection test
   - Commit: `LLM: Define tool registry contracts`

5. `LLM: Register SQL-backed report tools`
   - Purpose: Expose only predefined SQL reports to the LLM.
   - Sub-steps:
     - Register only existing predefined SQL report definitions from the SQL reporting layer.
     - Add typed tool inputs for staffing gaps, employee schedule, timecard exceptions, credential expiry, and audit activity reports.
     - Inject tenant/org scope server-side and prevent caller-supplied tenant override.
     - Add per-role allowed/denied behavior for employee, manager, payroll, credentialing, auditor, executive, agency, admin, and AI service identity.
   - Tests:
     - SQL-backed tool contract tests
     - arbitrary SQL absence tests
     - tenant override rejection tests
     - allowed/denied role report-call tests
   - Commit: `LLM: Register SQL report tools`

6. `LLM: Register workflow action tools`
   - Purpose: Expose safe backend actions through policy/preview/approval gates.
   - Sub-steps:
     - Register read tools for self schedule, visible schedule context, staffing gaps, notifications, timecard exceptions, credentials, and audit summaries where role-appropriate.
     - Register low-risk or approval-required action tools for claim shift, create swap, accept swap, and approve/deny swap.
     - Require preview output before any mutation and preserve policy/approval gates.
     - Block direct payroll edits, permission edits, audit deletion, credential override, raw SQL, and self-approval.
   - Tests:
     - permission tests across all Phase 16B personas
     - preview-before-mutation tests
     - approval-required tests
     - blocked unsafe action tests
     - audit/tool-call persistence assertions
   - Commit: `LLM: Register workflow tools`

7. `LLM: Integrate real copilot service`
   - Purpose: Replace deterministic routing with provider calls while preserving deterministic backend execution.
   - Sub-steps:
     - Add copilot orchestrator that sends prompt, conversation context, role envelope, available tools, and page context to the model route.
     - Keep deterministic execution in backend tools after provider proposes a tool call.
     - Add structured response handling for answer, action preview, blocked action, provider failure, and no-tool answer.
     - Preserve the existing deterministic fallback when real provider use is disabled.
   - Tests:
     - copilot API e2e tests with mocked provider
     - employee self-schedule behavior
     - manager staffing behavior
     - payroll/credential/auditor/executive/agency/admin role behavior
     - AI service identity blocked-human-account behavior
   - Commit: `LLM: Integrate copilot service`

8. `LLM: Persist tool metadata`
   - Purpose: Store provider, model, latency, tokens, cost, safety status, and blocked reasons.
   - Sub-steps:
     - Extend tool-call metadata with provider, model, route, latency, token counts, estimated cost, page context, actor role, scope, risk level, safety status, and denied reason.
     - Persist provider failures and blocked tool attempts without leaking secrets or prompt-sensitive data.
     - Add audit metadata for executed, blocked, failed, and approval-required tool calls.
     - Ensure admin and auditor views can inspect tool-call evidence while normal roles cannot.
   - Tests:
     - tool-call metadata persistence tests
     - blocked/failed provider metadata tests
     - redaction assertions
     - admin/auditor visibility tests
     - employee/payroll/agency denial tests for tool-call review
   - Commit: `LLM: Persist tool metadata`

9. `LLM: Expand eval suite`
   - Purpose: Compare deterministic baseline and real model behavior safely.
   - Sub-steps:
     - Add eval fixtures for every role family: employee, manager, charge nurse, workforce, float pool, payroll, credentialing, auditor, executive, agency, admin, owner, and AI service identity.
     - Add tasks for schedule lookup, swap preview, staffing gap, timecard exception, credential expiry, audit summary, executive summary, agency scoped access, blocked SQL, blocked payroll edit, and AI service misuse.
     - Score tool selection, role/scope correctness, unsafe action attempts, answer sufficiency, and refusal quality.
     - Keep live-provider eval optional; mocked eval must remain deterministic.
   - Tests:
     - eval dataset completeness assertions
     - eval runner tests
     - zero unsafe action attempt assertion
     - per-role expected tool-selection assertions
   - Commit: `LLM: Expand eval suite`

10. `LLM: Add live-provider smoke gate`
    - Purpose: Allow optional live API validation when keys are present.
    - Sub-steps:
      - Add explicit env gate for live provider smoke tests.
      - Add minimal prompt set per role family that verifies allowed read behavior and blocked unsafe behavior.
      - Ensure live smoke never performs real unsafe mutations and uses preview-only paths for actions.
      - Document required env vars and expected skip behavior when keys are absent.
    - Tests:
      - mocked CI path always passes
      - live path skips without explicit key/flag
      - live path validates allowed/blocked behavior when enabled
      - no unsafe mutation assertion
    - Commit: `LLM: Add live smoke gate`

11. `Quality: Run phase 18 gate`
    - Purpose: Validate Phase 18 end to end before moving to security hardening.
    - Sub-steps:
      - Run full API, web, AI, eval, tools, domain, db, and integrations typecheck/lint/test suites.
      - Run demo flow and Phase 16B role walkthrough assertions.
      - Run production build with the API available.
      - Confirm live-provider smoke is skipped safely unless explicitly configured.
      - Fix only Phase 18 regressions discovered by the gate.
    - Tests:
      - `npm run db:validate`
      - `npm run typecheck`
      - `npm run lint`
      - `npm run test`
      - `npm run test:demo`
      - `npm run build`
    - Commit: `Quality: Run phase 18 gate`

### Phase 18 Completion Gate Record

- Completed on 2026-06-05.
- Commits created:
  - `LLM: Define provider gateway interface`
  - `LLM: Build OpenAI provider`
  - `LLM: Build model router`
  - `LLM: Define tool registry contracts`
  - `LLM: Register SQL report tools`
  - `LLM: Register workflow tools`
  - `LLM: Integrate copilot service`
  - `LLM: Persist tool metadata`
  - `LLM: Expand role evals`
  - `LLM: Add live smoke gate`
- Final verification passed:
  - `npm run db:validate`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run test:demo`
  - `npm run build`
  - `npm run test:llm:live` in default skipped mode
- Notes:
  - `npm run test:demo` intentionally logs an injected swap approval failure while asserting rollback behavior and exits successfully.
  - Live provider validation remains opt-in with `LLM_LIVE_SMOKE=true` and `AI_GATEWAY_API_KEY` or `OPENAI_API_KEY`.

## Phase 19 Goal Mode Steps: Security, Compliance, And HIPAA-Ready Controls

Phase 19 must harden the full role surface from Phase 16B. Security work must cover human roles, admin roles, read-only roles, external agency users, and the AI service identity separately.

1. `Security: Harden session cookies`
   - Purpose: Make auth cookies production-safe.
   - Sub-steps:
     - Add a shared server-side cookie config helper for API/web auth cookies with environment-aware `secure`, `sameSite`, `httpOnly`, path, and max-age settings.
     - Ensure production refuses insecure cookie settings when `APP_ENV=production` or `NODE_ENV=production`.
     - Confirm logout clears the exact same cookie names, path, and domain attributes used at login.
     - Add session-expiration behavior for stale or malformed session cookies.
     - Verify demo auth switcher behavior remains demo-only and cannot weaken production cookie settings.
   - Tests:
     - Cookie config unit tests for local, staging, and production modes.
     - Logout e2e test proving cookies are cleared.
     - Malformed/stale cookie e2e test.
     - Production-mode denial test for demo/insecure cookie behavior.
     - `npm run typecheck --workspace @pulseshift/api`
     - `npm run typecheck --workspace @pulseshift/web`
     - `npm run test --workspace @pulseshift/api`
     - `npm run test --workspace @pulseshift/web`
   - Commit: `Security: Harden session cookies`

2. `Security: Add CORS allowlist`
   - Purpose: Restrict browser origins in production.
   - Sub-steps:
     - Add an env-driven CORS config module for the API using explicit allowed origins.
     - Allow localhost defaults only outside production.
     - Reject wildcard origins in production.
     - Apply CORS config during API bootstrap without changing route behavior.
     - Add `.env.example` entries for staging and production web origins.
   - Tests:
     - CORS config unit tests for allowed origin, denied origin, missing origin, and production wildcard rejection.
     - API e2e test for preflight allowed and denied origins.
     - `npm run typecheck --workspace @pulseshift/api`
     - `npm run lint --workspace @pulseshift/api`
     - `npm run test --workspace @pulseshift/api`
   - Commit: `Security: Add CORS allowlist`

3. `Security: Add rate limits`
   - Purpose: Protect auth, invites, copilot, and write-heavy endpoints.
   - Sub-steps:
     - Add a small rate-limit policy module with route categories: auth/session, invitations, copilot, workflow writes, integrations, and default API reads.
     - Implement in-memory local limiter with a provider-neutral interface so Redis/Supabase-compatible backing can be added later.
     - Key limits by tenant, user/session, IP fallback, and route category without storing raw auth tokens.
     - Add safe response headers and consistent `429` error payloads.
     - Ensure demo tests can reset limiter state between runs.
   - Tests:
     - Unit tests for limit windows, key creation, reset behavior, and redaction.
     - E2E tests showing repeated auth/copilot/write requests receive `429`.
     - Role-specific tests proving admin, employee, agency, and AI service identities are all rate limited.
     - `npm run typecheck --workspace @pulseshift/api`
     - `npm run lint --workspace @pulseshift/api`
     - `npm run test --workspace @pulseshift/api`
   - Commit: `Security: Add rate limits`

4. `Security: Add request IDs and structured logs`
   - Purpose: Improve traceability without leaking sensitive data.
   - Sub-steps:
     - Add request ID middleware that accepts a safe inbound request ID or creates one.
     - Attach request ID, organization ID, actor user ID, role, route, status, and latency to structured log records.
     - Add redaction helpers for authorization headers, cookies, Supabase keys, service-role keys, LLM keys, JWTs, prompt-sensitive content, and raw SQL-like strings.
     - Ensure errors include request ID without logging stack traces in production responses.
     - Add request ID to API responses for support/debug correlation.
   - Tests:
     - Unit tests for request ID validation/generation.
     - Log redaction tests for keys, cookies, JWTs, prompt text, and SQL-like content.
     - E2E test proving response includes request ID and logs use redacted metadata.
     - `npm run typecheck --workspace @pulseshift/api`
     - `npm run lint --workspace @pulseshift/api`
     - `npm run test --workspace @pulseshift/api`
   - Commit: `Security: Add request logging`

5. `Security: Protect audit integrity`
   - Purpose: Ensure audit records are append-only through public APIs.
   - Sub-steps:
     - Add explicit tests proving no public API exposes update/delete operations for audit logs or AI tool-call records.
     - Ensure auditors can read audit/tool-call evidence but cannot mutate users, schedules, credentials, integrations, notifications, or demo reset state.
     - Ensure admins can view evidence but still cannot delete or rewrite audit records through public routes.
     - Add an audit export read route only if it can be implemented as read-only and role-gated.
     - Add retention-policy metadata/docs without implementing destructive retention jobs in this phase.
   - Tests:
     - Audit delete/update absence e2e tests.
     - Auditor read-only role e2e tests.
     - Admin no-delete e2e tests.
     - AI tool-call metadata visibility tests for admin/auditor and denial tests for normal roles.
     - `npm run test --workspace @pulseshift/api`
     - `npm run test --workspace @pulseshift/web`
   - Commit: `Security: Protect audit integrity`

6. `Security: Write backup and restore docs`
   - Purpose: Document Supabase backup/restore and migration rollback expectations.
   - Sub-steps:
     - Add a backup/restore runbook for Supabase staging and production.
     - Include backup schedule, restore drill cadence, owner, required credentials, and safe handling of service-role keys.
     - Document Prisma migration rollback expectations and the difference between schema rollback and data restoration.
     - Link required env vars from `.env.example`.
     - Add a short local-development note for Docker PostgreSQL versus hosted Supabase.
   - Tests:
     - Documentation link/path check where available.
     - Manual cross-check against `.env.example`, `package.json` database scripts, and `docs/production-readiness.md`.
     - `npm run lint --workspace @pulseshift/db`
     - `npm run db:validate`
   - Commit: `Security: Document backups`

7. `Security: Write incident and access review docs`
   - Purpose: Prepare HIPAA-ready operational practices without claiming certification.
   - Sub-steps:
     - Add incident response runbook for auth compromise, exposed key, data access anomaly, failed integration, failed notification delivery, and unsafe AI action.
     - Add access review checklist covering every Phase 16B role, admin role, auditor, external agency user, and AI service identity.
     - Add AI service identity review checklist for permissions, scopes, provider keys, tool registry access, and blocked direct SQL.
     - Add vendor/BAA checklist for Supabase, LLM provider, hosting, email/SMS, monitoring, and payroll/timekeeping integrations.
     - Clearly state HIPAA-ready operational preparation without claiming legal certification.
   - Tests:
     - Documentation cross-check against Phase 16B role matrix.
     - Verify docs link from `docs/production-readiness.md`.
     - Verify AI service identity controls reference Phase 18 tool registry and eval gates.
     - `npm run test --workspace @pulseshift/evals`
   - Commit: `Security: Document incident reviews`

8. `Security: Add monitoring event hooks`
   - Purpose: Emit events for auth failures, permission denials, blocked AI actions, integration failures, workflow errors, and notification delivery failures.
   - Sub-steps:
     - Add provider-neutral monitoring interface with event name, severity, request ID, organization ID, actor user ID, actor role, scope summary, route, and redacted metadata.
     - Add local in-memory/no-op implementation for tests and development.
     - Emit events for auth failures, permission denials, blocked AI actions, provider failures, integration sync failures, workflow rollback errors, and notification delivery failures.
     - Reuse request ID and redaction helpers from structured logging.
     - Expose monitoring assertions in tests without introducing an external monitoring dependency.
   - Tests:
     - Unit tests for event creation and redaction.
     - E2E tests for permission denial, blocked AI action, integration failure, and notification failure monitoring events.
     - Role-specific denied-action monitoring assertions for employee, auditor, agency, admin, and AI service identity.
     - `npm run typecheck --workspace @pulseshift/api`
     - `npm run lint --workspace @pulseshift/api`
     - `npm run test --workspace @pulseshift/api`
   - Commit: `Security: Add monitoring hooks`

9. `Security: Run production security gate`
   - Purpose: Validate security baseline before launch-readiness work.
   - Sub-steps:
     - Run all Phase 19 verification commands and fix only security-phase regressions.
     - Run dependency audit and document remaining advisories if any cannot be safely fixed in this phase.
     - Run full-role walkthroughs from Phase 16B to prove security controls did not break role-specific navigation.
     - Run demo-control denial tests in production-like env settings.
     - Update `implement.md` with a Phase 19 completion gate record.
   - Tests:
     - `npm audit --audit-level=high`
     - `npm run db:validate`
     - `npm run typecheck`
     - `npm run lint`
     - `npm run test`
     - `npm run test:demo`
     - `npm run build`
     - `npm run test:llm:live` in default skipped mode
   - Commit: `Quality: Run phase 19 gate`

## Phase 20 Goal Mode Steps: Production Deployment And Launch Readiness

Phase 20 must treat Phase 16B role walkthroughs as a launch blocker. Staging and production smoke tests must verify landing route, navigation, one meaningful page, and one forbidden/denied behavior for every production role.

1. `Launch: Write environment runbook`
   - Purpose: Document staging and production environment variables and secrets.
   - Build: environment setup doc.
   - Verify: compare against `.env.example` and deployment needs.

2. `Launch: Write migration runbook`
   - Purpose: Document database migration, seed/bootstrap, rollback, and Supabase settings.
   - Build: migration runbook.
   - Verify: dry-run commands documented and reviewed.

3. `Launch: Build staging smoke tests`
   - Purpose: Automate login, invite, schedule, swap, approval, notification, audit, integration, copilot, and eval smoke paths.
   - Build: smoke test script or test suite covering every Phase 16B role persona, including allowed landing/navigation and one denied action per role family.
   - Verify: smoke tests run against local/staging config and fail if any role lacks a meaningful page.

4. `Launch: Build deployment checklist`
   - Purpose: Create a repeatable pre-release checklist.
   - Build: release checklist covering migrations, Supabase settings, tenant scoping, full-role smoke tests, backups, monitoring, audit export, evals, dependency audit.
   - Verify: checklist maps to existing commands and docs, including `docs/phase-16b-role-demo.md`.

5. `Launch: Build rollback checklist`
   - Purpose: Document rollback paths for web, API, migration, integration, and LLM provider failures.
   - Build: rollback doc.
   - Verify: each rollback item has owner, trigger, and command/procedure.

6. `Launch: Gate demo affordances`
   - Purpose: Ensure production cannot access demo-only controls, reset routes, demo switchers, or seed-only shortcuts.
   - Build: route guards, UI gates, tests.
   - Verify: production env smoke tests deny demo controls for every role, including admin and AI service identities.

7. `Launch: Add monitoring dashboard plan`
   - Purpose: Define launch metrics and operational alerts.
   - Build: monitoring doc/config stubs for auth failures, API errors, blocked AI actions, integration failures, notification failures.
   - Verify: monitoring event hooks exist and docs reference them.

8. `Launch: Run final production gate`
   - Purpose: Validate the full product before launch.
   - Build: no feature work unless failures require fixes.
   - Verify: full-role staging smoke tests, production build, typecheck/lint/test/test:demo, high-severity audit, release checklist complete, rollback checklist complete.
