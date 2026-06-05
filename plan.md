# PulseShift Build Plan

## Summary

PulseShift is a healthcare workforce scheduling copilot and Kronos-style replacement prototype. It combines a deterministic scheduling backend with a permission-aware AI interface so nurses, managers, schedulers, payroll admins, and workforce operators can ask natural-language questions and safely trigger scheduling workflows.

The MVP should avoid patient records and PHI entirely. It should model workforce operations only: employees, facilities, units, schedules, open shifts, shift swaps, approvals, staffing gaps, time clock events, timecard exceptions, notifications, audit logs, and AI tool-call records.

The first build target is the MVP demo path:

1. Employee logs in and asks when they work next.
2. Employee requests a Friday night shift swap with Maya.
3. System checks availability, certification, overtime, overlap, and policy risk.
4. Swap request is created and routed to the counterpart.
5. Counterpart accepts.
6. Manager reviews risk and approves.
7. Schedules update.
8. Notifications are sent.
9. Audit logs and AI tool calls show the full chain.
10. Admin/evaluation view shows safe tool use and blocked unsafe actions.

## Architecture

Use the serious architecture from `spec.md` as the target:

- Frontend: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, Zod, Recharts, Luxon or date-fns.
- Backend: NestJS API, TypeScript, Prisma ORM, PostgreSQL.
- Async/system services: Redis, BullMQ, WebSocket or Server-Sent Events for live updates.
- AI: OpenAI-compatible LLM gateway, model router, tool registry, validator, structured Zod schemas.
- Local development: Docker Compose for PostgreSQL and Redis.
- Future deployment: managed PostgreSQL, managed Redis, S3-compatible export storage, and a container hosting target such as ECS/Fargate, Fly.io, Railway, or Render.

Monorepo layout:

```text
apps/
  web/
  api/
packages/
  db/
  domain/
  tools/
  ai/
  evals/
  integrations/
docker-compose.yml
README.md
```

## Product Scope

MVP in scope:

- Demo authentication and seeded users.
- RBAC plus ABAC permission scope.
- Organization, facility, unit, user, employee, workforce role, certification, shift template, shift, availability, shift swap request, approval request, notification, AI conversation, AI tool call, and audit log models.
- Employee home, schedule, open shifts, swap center, clock-in/out and timecard exception shell, manager dashboard, staffing gaps, notifications, copilot, and admin audit/tool-call views.
- Open shift claim workflow.
- Shift swap workflow with counterpart and manager approval.
- Policy engine checks for availability, overlap, role, certification, expired credential, overtime, rest period, manager approval, unit scope, locked schedule, and locked pay period.
- In-app notifications, with email/SMS as later adapters.
- Copilot read tools, low-risk write previews, approval-required action routing, and blocked unsafe actions.
- Synthetic LLM evaluation harness for tool selection, argument quality, unsafe action attempts, latency, and cost.

MVP out of scope:

- Patient records, diagnoses, clinical notes, patient assignments, billing claims, and PHI.
- Direct payroll mutation.
- Real UKG/Kronos, Workday, or ADP write integrations.
- Silent AI writes to published schedules, payroll-impacting data, credentials, permissions, or audit logs.
- Enterprise SSO beyond architecture hooks.

## Domain And Safety Principles

The LLM is never the source of truth. It is the interface, planner, summarizer, and escalation layer. All real actions must execute through typed backend tools guarded by permissions, policy checks, confirmation flows, approvals, and audit logs.

Effective AI permission is:

```text
requesting_user.permissions
intersect ai_tool_allowed_permissions
intersect tool_risk_policy
intersect object_scope_policy
```

Hard rules:

- AI cannot directly edit payroll hours.
- AI cannot delete audit logs.
- AI cannot silently override certifications.
- AI cannot approve its own proposed action.
- AI cannot expose schedules outside user scope.
- AI cannot mutate published schedules without policy checks.
- AI cannot send urgent broadcasts without confirmation.
- AI cannot access patient records in the MVP.

Risk categories:

- Read-only: schedule lookup, open shift search, timecard exception explanation, staffing gap computation.
- Low-risk write: create swap request, release request, PTO request, availability submission, timecard note.
- Approval-required: assign shift, approve swap, publish schedule, approve overtime override, resolve timecard exception, broadcast to unit.
- Blocked: delete timecard event, change payroll hours, delete audit log, modify permissions through AI, override credential requirements directly.

## Roadmap

Phase 0: Scaffold the monorepo, local services, shared TypeScript configuration, linting, formatting, and README.

Phase 1: Build the domain model, Prisma schema, migrations, seed data, shared Zod schemas, permissions, and policy constants.

Phase 2: Add demo auth, role-scoped session context, RBAC/ABAC checks, and API guards.

Phase 3: Build core UI shell, employee home, schedule views, manager dashboard, and shared API client/query layer.

Phase 4: Implement scheduling workflows: open shifts, claims, shift swap requests, counterpart responses, manager approvals, and schedule updates.

Phase 5: Implement the policy engine, risk flags, approval routing, audit logs, and visible policy explanations.

Phase 6: Add notifications and live updates for swaps, approvals, schedule changes, timecard exceptions, and staffing gaps.

Phase 7: Build copilot conversations, tool registry, permission-aware tool execution, clarification requests, action previews, confirmations, and tool-call logs.

Phase 8: Add timecard exception explanations, credentialing warnings, staffing gap computation, coverage candidate ranking, and manager operational workflows.

Phase 9: Add CSV import/export, mock Kronos adapter, integration sync runs, external ID mapping, and integration health views.

Phase 10: Add the LLM evaluation harness, synthetic datasets, model runner interface, metrics collection, and evaluation dashboard.

Phase 11: Harden the MVP demo, improve accessibility and responsive layouts, add end-to-end tests, document setup, and record a repeatable demo script.

Phase 12: Establish the production platform foundation with Supabase as the primary hosted PostgreSQL target, Prisma as the application ORM, production environment conventions, CI quality gates, and a migration strategy from in-memory demo state to database-backed services.

Phase 13: Replace demo-header authentication with Supabase Auth, add real account sessions, login/logout, password recovery, invite acceptance, and organization-invite onboarding for workforce members.

Phase 14: Move core workflows from in-memory demo state to Prisma-backed persistence for schedules, swaps, approvals, notifications, audit logs, AI tool calls, integrations, eval runs, staff, credentials, clock-in/out events, and timecards. Add a dedicated SQL reporting/tooling layer for predefined, optimized, read-only reporting queries that can be safely used by dashboards and LLM tools without allowing model-authored SQL.

Phase 15: Build full SaaS administration for organizations, facilities, units, users, roles, workforce roles, invitations, account suspension, and tenant-scoped access control.

Phase 16: Redesign the operational UI around role-specific workflows for employees, managers, payroll/admin users, and system administrators, with concise explanations for every workflow state, policy flag, AI action, approval, and integration status.

Phase 16B: Complete full role-view coverage for every production role with sandbox data, role-specific landing pages, scoped schedule modes, secondary workflow pages, walkthrough assertions, and final responsive/integration QA so every seeded role can be demoed end to end.

Phase 17: Persist notifications, add communication preferences, and introduce realtime or near-realtime updates for approvals, swaps, schedule changes, staffing gaps, and notification reads, with role-specific notification preferences, delivery visibility, and walkthrough tests for every Phase 16B persona.

Phase 18: Integrate a real OpenAI-compatible LLM gateway behind the existing tool permission, policy, preview, approval, audit, and evaluation boundaries, using the Phase 16B role matrix as the required eval surface for allowed, blocked, read-only, and approval-required tool behavior.

Phase 19: Add production security and HIPAA-ready controls while continuing to exclude PHI: secure session handling, CORS allowlists, rate limits, structured logs, audit retention, full-role access reviews, AI service identity controls, incident response docs, backup/restore docs, and dependency audit policy.

Phase 20: Prepare production deployment and launch readiness with staging/production environment docs, migration runbooks, full-role smoke tests, release checklists, rollback plans, monitoring, and removal or strict gating of demo-only affordances.

## Phase 16B Role Coverage Gate

Phase 16B is now a standing acceptance gate for every later phase. Future work must not treat role coverage as optional UI polish. Every new feature, page, API, notification, LLM tool, security rule, integration, and smoke test must explicitly declare:

- which roles can see it
- which roles can act on it
- which roles receive read-only context
- which roles must not see it
- required permission and scope
- relevant empty, forbidden, loading, and error states
- audit events or monitoring events created by mutations or denied actions
- whether Copilot or predefined SQL reporting tools can read or act in that page context

Every future phase must keep the Phase 16B personas usable:

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
- AI agent service identity

The minimum recurring verification is:

- role/page contract assertions stay complete
- role landing and navigation walkthroughs pass
- API permission tests cover allowed and forbidden access for affected roles
- UI smoke tests cover at least one meaningful page per affected role
- production/demo controls remain hidden or denied where inappropriate

## Production Readiness Interfaces

The production phases should add these durable interfaces and contracts:

- `User.supabaseAuthId` maps Supabase Auth identities to application users while preserving app-owned IDs, roles, scopes, employee profiles, and audit relations.
- Invitation records should store organization, email, role, scope, token hash, status, inviter, expiration, and acceptance timestamps.
- Auth/session responses should include user, organization, employee profile, roles, scopes, permissions, and feature flags.
- Organization admin APIs should cover users, roles, facilities, units, invites, suspension/reactivation, and role assignment.
- LLM metadata should be persisted for conversations and tool calls: provider, model, latency, tokens, estimated cost, safety status, and blocked-action reason.
- SQL reporting tools should be implemented as concrete, named backend functions with fixed SQL text, typed parameters, mandatory tenant/org scope injection, result limits, query timeouts, and audit metadata. The LLM must never generate, edit, concatenate, or execute arbitrary SQL.

## Production Role And Page Interaction Matrix

The production UI must be driven by a concrete role, permission, scope, and page interaction matrix. Supabase Auth proves identity only; PulseShift roles, scopes, and permissions remain the authorization source of truth.

Role coverage should include:

- `ORGANIZATION_OWNER`: organization-wide administration, account ownership, billing/contract-adjacent settings later, audit visibility, integration oversight, and user/role management.
- `SYSTEM_ADMIN`: system configuration, integrations, audit, evals, facilities, units, users, invitations, role assignment, and operational monitoring.
- `WORKFORCE_ADMIN`: schedule planning, schedule publishing, workforce operations, facility-scoped staffing, role/scope assignment where delegated, and notifications.
- `UNIT_MANAGER`: unit schedule, staffing gaps, approvals, swaps, staff directory, overtime/credential risk, unit notifications, and timecard review context.
- `CHARGE_NURSE`: unit schedule visibility, near-term coverage context, staffing risk visibility, and unit notifications without broad admin controls.
- `EMPLOYEE`: own schedule, open shifts, swaps, time clock, timecard exceptions, availability/PTO, notifications, and self-service copilot.
- `FLOAT_POOL_COORDINATOR`: facility/unit staffing gaps, float candidates, credential visibility, and shift assignment recommendations.
- `PAYROLL_ADMIN`: timecard exception queues, payroll export readiness, correction workflow, and payroll audit context without schedule mutation.
- `CREDENTIALING_ADMIN`: credential lists, expiring credentials, verification workflow, and credential audit context without schedule mutation.
- `COMPLIANCE_AUDITOR`: audit logs, AI tool calls, policy decisions, read-only reports, and access review evidence.
- `EXECUTIVE_VIEWER`: read-only workforce, staffing, schedule, risk, and performance summaries scoped to allowed facilities/orgs.
- `EXTERNAL_AGENCY_ADMIN`: agency worker schedule/open shift visibility and claim workflows limited to agency/self scope.
- `AI_AGENT_SERVICE`: backend service identity for tool execution metadata only, never a user-facing account.

Each production page must declare:

- allowed roles
- required permissions
- required scope type: self, unit, facility, or organization
- visible actions
- hidden actions
- read/write level
- empty state
- forbidden state
- audit events created by mutations
- whether LLM tools can read from or act on the page context

Minimum page interaction matrix:

- Login and invite acceptance: unauthenticated users can sign in, create invited accounts, and accept valid invitations; authenticated users are routed to their role landing page.
- Employee home: employees see own next shift, own requests, own timecard status, own notifications, and self-service copilot prompts.
- Schedule: employees see only their own schedule; managers see assigned unit schedules; workforce admins see facility schedules; system admins and organization owners see org-wide schedule management; payroll admins and credentialing admins do not mutate schedules.
- Open shifts: employees and agency admins see claimable shifts in scope; managers/workforce admins see coverage impact and approval queues; payroll and credentialing roles are read-only or hidden unless needed for context.
- Swaps/requests: employees create/accept/decline own swaps; managers approve/deny unit swaps; workforce admins can supervise facility workflows; other roles are read-only or hidden.
- Timecards: employees clock in/out and view own exceptions; payroll admins resolve exceptions/export payroll-adjacent data; managers review unit context; admins audit; schedule mutation remains unavailable.
- Staffing: managers, charge nurses, workforce admins, float coordinators, system admins, and executives see scoped staffing gaps; employees do not see broad staffing analytics.
- Staff directory: managers and admins see scoped staff details; credentialing admins see credential fields; employees see limited coworker context only where operationally necessary.
- Admin users/invitations/roles/facilities/units: organization owners, system admins, and delegated workforce admins can manage scoped resources; every mutation requires visible role/scope impact and audit trail.
- Integrations: system admins and organization owners manage connections; workforce/payroll roles see only operational sync status where relevant.
- Audit/evals/AI tool calls: compliance auditors, system admins, organization owners, and AI admins see read-only audit/eval views; no user-facing audit delete exists.
- Copilot: every role receives only tools allowed by that role, scope, page context, policy, and risk category.

## Schedule View Requirements

The production schedule view must be clear enough for repeated operational use by employees, managers, schedulers, and admins.

Schedule views should include:

- role-specific default view: employee personal calendar, manager unit board, workforce admin facility planner, admin org overview
- day, week, and list modes
- clear shift cards showing unit, role, start/end time, duration, status, assigned person, required credentials, risk flags, and pending approvals
- timezone clarity and local date boundaries
- filters for unit, facility, role, status, credential requirement, open shifts, swaps, and exceptions where permitted
- visual distinction between assigned, open, draft, published, in-progress, completed, cancelled, pending swap, pending approval, and policy-blocked shifts
- explanation text for risk flags such as overtime, overlap, rest period, missing credential, locked schedule, locked pay period, and manager approval required
- accessible keyboard navigation and mobile-friendly list fallback
- no schedule visibility outside the user's effective scope
- no schedule mutation without permission, policy checks, confirmation, approval where required, and audit write

## Production Readiness Test Strategy

The production phases should add and maintain these gates:

- Unit tests for Supabase JWT verification, permission loading, invite token validation, role/scope mapping, and policy decisions.
- API e2e tests for login/session, invite acceptance, forbidden cross-organization access, employee schedule visibility, manager unit scope, swap lifecycle, audit writes, notification reads, and admin user management.
- Prisma service tests for transactional workflow correctness, especially swap approval, schedule reassignment, approval updates, notifications, and audit writes.
- SQL reporting tests for every predefined query: tenant isolation, role/scope isolation, parameter validation, result limits, timeout behavior, explain-plan review where practical, and denial of arbitrary SQL inputs.
- Full-role walkthrough tests for every Phase 16B persona: landing route, navigation, schedule mode, one meaningful allowed workflow, one restricted/denied behavior, and production-hidden demo controls.
- UI smoke tests for login, onboarding, role-specific dashboards, account controls, admin invite flow, and production empty/error/forbidden states.
- LLM eval tests for expected tool selection, blocked payroll edits, unauthorized schedule access, approval-required actions, audit persistence, AI service identity misuse, and zero unsafe action attempts on blocked tasks across the Phase 16B role matrix.
- Staging smoke tests for login, invite acceptance, schedule read, swap workflow, approval workflow, notification read, audit view, integration sync, copilot blocked action, eval suite execution, and all Phase 16B role walkthroughs.

## Production Readiness Assumptions

- Supabase is the production auth provider and primary hosted PostgreSQL provider.
- Prisma remains the ORM and the backend API remains the source of truth for workflow mutations.
- Direct SQL is allowed only inside the dedicated reporting/tooling layer for predefined read-only queries; mutations remain behind application services, policy checks, approvals, and audit writes.
- Supabase client usage should support auth/session and optional realtime, not bypass backend permission and policy checks.
- The first production target is full SaaS-capable with invite-first onboarding for workforce members.
- The product continues to exclude patient records and PHI.
- Real LLM integration is included in the production-readiness roadmap, but every mutation remains backend-tool-gated.
- Security scope combines production baseline controls with HIPAA-ready documentation and operational practices, without claiming formal compliance certification until the required legal/vendor process is complete.
