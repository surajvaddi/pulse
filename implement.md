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

4. `Interface: Build manager dashboard`
   - Purpose: Give managers operational coverage, staffing, approval, staff, and risk context.
   - Build: manager dashboard components and service calls.
   - Verify: manager page smoke test and unit-scope enforcement.

5. `Interface: Build payroll dashboard`
   - Purpose: Give payroll users timecard exceptions, export readiness, and audit context.
   - Build: payroll dashboard components and exception actions.
   - Verify: payroll page smoke test and employee self-data denial.

6. `Interface: Build system admin dashboard`
   - Purpose: Give system admins user, invite, facility, unit, role, integration, audit, eval, and system health access.
   - Build: admin dashboard components and route links.
   - Verify: admin page smoke test and non-admin denial.

7. `Interface: Add workflow explanations`
   - Purpose: Add concise, useful copy for statuses, policy flags, approvals, AI actions, and integration outcomes.
   - Build: explanation helpers and page integrations.
   - Verify: UI tests for expected explanation text on key states.

8. `Interface: Add production states`
   - Purpose: Standardize empty, loading, error, forbidden, success, confirmation, and destructive-action states.
   - Build: reusable state components and route integrations.
   - Verify: component tests or smoke tests for all state variants.

9. `Interface: Verify responsive accessibility`
   - Purpose: Ensure keyboard navigation, focus states, labels, and mobile layouts work.
   - Build: focused fixes only.
   - Verify: responsive manual checks, accessibility checks, web lint/build.

## Phase 17 Goal Mode Steps: Notifications, Realtime, And Communication Preferences

1. `Notifications: Define preference schema`
   - Purpose: Model notification preferences per user and channel.
   - Build: Prisma schema, domain schemas, repository interface.
   - Verify: db validate/generate and preference unit tests.

2. `Notifications: Build notification repository`
   - Purpose: Persist notification state and delivery metadata.
   - Build: list, create, mark read, update delivery status methods.
   - Verify: repository tests and notification API e2e tests.

3. `Notifications: Build preference service`
   - Purpose: Let users update delivery preferences.
   - Build: get/update preference methods and controller routes.
   - Verify: self-access tests and cross-user denial.

4. `Notifications: Integrate workflow events`
   - Purpose: Create notifications from swaps, approvals, schedule changes, staffing gaps, and timecard events.
   - Build: service calls from workflow services.
   - Verify: workflow e2e tests assert notification creation.

5. `Notifications: Add polling or realtime client`
   - Purpose: Surface notification changes without manual refresh.
   - Build: polling hook or Supabase Realtime subscription wrapper.
   - Verify: smoke test for read-state update and new notification visibility.

6. `Notifications: Build preferences UI`
   - Purpose: Let users view and edit notification preferences.
   - Build: preferences page/form and explanatory copy.
   - Verify: web typecheck/lint and UI smoke test.

7. `Notifications: Add delivery failure handling`
   - Purpose: Track and show delivery failures for admin/operator review.
   - Build: failure fields, retry metadata, admin view.
   - Verify: failure-state tests and admin UI smoke test.

## Phase 18 Goal Mode Steps: Tool-Gated Real LLM Integration

1. `LLM: Define provider gateway interface`
   - Purpose: Create provider-neutral LLM request/response contracts.
   - Build: gateway interface, model route config, metadata types.
   - Verify: AI package typecheck and mocked gateway tests.

2. `LLM: Build OpenAI-compatible provider`
   - Purpose: Call an OpenAI-compatible chat/completions API safely.
   - Build: provider class, timeout handling, error normalization.
   - Verify: mocked provider unit tests.

3. `LLM: Build model router`
   - Purpose: Route tasks to lightweight, reasoning, embedding, or safety models.
   - Build: router function/class and env-driven config.
   - Verify: routing unit tests.

4. `LLM: Define tool registry contracts`
   - Purpose: Make tool schemas typed and permission-aware.
   - Build: tool definition interface, argument validators, result schemas.
   - Verify: tool validation tests.

5. `LLM: Register SQL-backed report tools`
   - Purpose: Expose only predefined SQL reports to the LLM.
   - Build: tool entries for named SQL reports with typed params.
   - Verify: SQL-backed tool contract tests and arbitrary-SQL absence tests.

6. `LLM: Register workflow action tools`
   - Purpose: Expose safe backend actions through policy/preview/approval gates.
   - Build: tool entries for claim shift, create swap, accept swap, approve swap where allowed.
   - Verify: permission, preview, approval, and audit tests.

7. `LLM: Integrate real copilot service`
   - Purpose: Replace deterministic routing with provider calls while preserving deterministic backend execution.
   - Build: copilot orchestration service and controller integration.
   - Verify: copilot API e2e tests with mocked provider.

8. `LLM: Persist tool metadata`
   - Purpose: Store provider, model, latency, tokens, cost, safety status, and blocked reasons.
   - Build: persistence methods and metadata writes.
   - Verify: tool-call persistence assertions.

9. `LLM: Expand eval suite`
   - Purpose: Compare deterministic baseline and real model behavior safely.
   - Build: eval fixtures for schedule, swap, staffing, timecard, blocked SQL, blocked payroll edits.
   - Verify: eval suite with zero unsafe action attempts.

10. `LLM: Add live-provider smoke gate`
    - Purpose: Allow optional live API validation when keys are present.
    - Build: guarded smoke script/test.
    - Verify: mocked CI path always passes; live path runs only with explicit key.

## Phase 19 Goal Mode Steps: Security, Compliance, And HIPAA-Ready Controls

1. `Security: Harden session cookies`
   - Purpose: Make auth cookies production-safe.
   - Build: secure cookie settings, expiration handling, logout clearing.
   - Verify: session unit/e2e tests.

2. `Security: Add CORS allowlist`
   - Purpose: Restrict browser origins in production.
   - Build: env-driven CORS config.
   - Verify: allowed and denied origin tests.

3. `Security: Add rate limits`
   - Purpose: Protect auth, invites, copilot, and write-heavy endpoints.
   - Build: rate-limit middleware/config.
   - Verify: rate-limit e2e tests.

4. `Security: Add request IDs and structured logs`
   - Purpose: Improve traceability without leaking sensitive data.
   - Build: request ID middleware, log helpers, redaction rules.
   - Verify: log redaction checks.

5. `Security: Protect audit integrity`
   - Purpose: Ensure audit records are append-only through public APIs.
   - Build: absence tests for delete routes and admin export route if needed.
   - Verify: audit delete absence e2e tests.

6. `Security: Write backup and restore docs`
   - Purpose: Document Supabase backup/restore and migration rollback expectations.
   - Build: operational doc.
   - Verify: doc review against environment variables and migration commands.

7. `Security: Write incident and access review docs`
   - Purpose: Prepare HIPAA-ready operational practices without claiming certification.
   - Build: incident response, access review, vendor/BAA checklist docs.
   - Verify: checklist review and launch-readiness doc link checks.

8. `Security: Add monitoring event hooks`
   - Purpose: Emit events for auth failures, permission denials, blocked AI actions, integration failures, workflow errors, and notification delivery failures.
   - Build: monitoring interface and initial emitters.
   - Verify: unit tests for event emission and redaction.

9. `Security: Run production security gate`
   - Purpose: Validate security baseline before launch-readiness work.
   - Build: fixes only if gate failures appear.
   - Verify: `npm audit --audit-level=high`, typecheck/lint/test/build, security e2e tests.

## Phase 20 Goal Mode Steps: Production Deployment And Launch Readiness

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
   - Build: smoke test script or test suite.
   - Verify: smoke tests run against local/staging config.

4. `Launch: Build deployment checklist`
   - Purpose: Create a repeatable pre-release checklist.
   - Build: release checklist covering migrations, Supabase settings, tenant scoping, backups, monitoring, audit export, evals, dependency audit.
   - Verify: checklist maps to existing commands and docs.

5. `Launch: Build rollback checklist`
   - Purpose: Document rollback paths for web, API, migration, integration, and LLM provider failures.
   - Build: rollback doc.
   - Verify: each rollback item has owner, trigger, and command/procedure.

6. `Launch: Gate demo affordances`
   - Purpose: Ensure production cannot access demo-only controls, reset routes, demo switchers, or seed-only shortcuts.
   - Build: route guards, UI gates, tests.
   - Verify: production env smoke tests deny demo controls.

7. `Launch: Add monitoring dashboard plan`
   - Purpose: Define launch metrics and operational alerts.
   - Build: monitoring doc/config stubs for auth failures, API errors, blocked AI actions, integration failures, notification failures.
   - Verify: monitoring event hooks exist and docs reference them.

8. `Launch: Run final production gate`
   - Purpose: Validate the full product before launch.
   - Build: no feature work unless failures require fixes.
   - Verify: staging smoke tests, production build, typecheck/lint/test/test:demo, high-severity audit, release checklist complete, rollback checklist complete.
