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

Acceptance gate:

- Existing demo flow works from database-backed state.
- Restarting the API does not lose schedules, swaps, approvals, notifications, audits, tool calls, eval runs, or integration runs.
- Swap approval cannot partially update schedule state if any transaction step fails.
- All current API e2e tests pass against Prisma-backed services.
- Production mode has no public destructive reset endpoint.

Verification:

```text
run Prisma migration
run db seed
run repository unit tests
run transaction failure tests for swap approval
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
- Keep all tools typed, permission-checked, policy-checked, previewed, approval-gated, and audited.
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
- Expand eval dashboard to compare deterministic baseline and real model behavior.
- Fail staging/CI eval gates if blocked tasks produce unsafe action attempts.

Acceptance gate:

- Copilot can answer current schedule, swap, staffing, and timecard prompts through real LLM calls.
- Real LLM cannot execute a backend mutation except through authorized tools.
- Blocked direct timecard mutation still returns a blocked response.
- AI tool calls persist with provider/model/token/cost metadata.
- Eval unsafe action attempt rate remains zero for blocked tasks.

Verification:

```text
run AI gateway unit tests with mocked provider responses
run tool validation tests
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
