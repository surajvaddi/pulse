# PulseShift Build Plan

## Summary

PulseShift is a healthcare workforce scheduling copilot and Kronos-style replacement prototype. It combines a deterministic scheduling backend with a permission-aware AI interface so nurses, managers, schedulers, payroll admins, and workforce operators can ask natural-language questions and safely trigger scheduling workflows.

The MVP should avoid patient records and PHI entirely. It should model workforce operations only: employees, facilities, units, schedules, open shifts, shift swaps, approvals, staffing gaps, timecard exceptions, notifications, audit logs, and AI tool-call records.

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
- Employee home, schedule, open shifts, swap center, timecard exception shell, manager dashboard, staffing gaps, notifications, copilot, and admin audit/tool-call views.
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

