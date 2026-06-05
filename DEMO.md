# PulseShift MVP Demo Runbook

## Demo Users

Use the `x-demo-user-id` header for API calls or the demo user switcher in the web shell.

| User | ID | Role | Demo scope |
| --- | --- | --- | --- |
| Morgan Owner | `user_owner` | Organization owner | Account-wide administration, audit, integrations, evals, user management |
| Alex Admin | `user_admin` | System admin | Administration, audit, integrations, evals, AI tool calls |
| Wendy Workforce | `user_wendy_workforce` | Workforce admin | Staffing operations, facility schedules, open-shift coordination |
| Jordan Lee | `user_jordan_manager` | Unit manager | ICU/ED schedules, approvals, staffing risk |
| Olivia Charge | `user_olivia_charge` | Charge nurse | Unit coverage, shift coordination, open-shift awareness |
| Priya Raman | `user_priya` | Employee | Self schedule, open shifts, swaps, timecards, copilot |
| Maya Shah | `user_maya` | Employee | Counterparty for Priya's swap |
| Felix Float | `user_felix_float` | Float pool coordinator | Cross-unit coverage and open-shift workflows |
| Sam Payroll | `user_payroll` | Payroll admin | Timecard exception queue |
| Carmen Credentials | `user_carmen_credentials` | Credentialing admin | Credential warnings and staff compliance context |
| Avery Auditor | `user_avery_auditor` | Compliance auditor | Read-only audit evidence and AI tool-call review |
| Evan Executive | `user_evan_exec` | Executive viewer | Read-only workforce and staffing visibility |
| Aria Agency | `user_aria_agency` | External agency admin | Agency-scoped shifts, coverage, and open-shift context |
| PulseShift AI Service | `user_ai_service` | AI service identity | Backend-only tool execution auditing; not a human production login |

## Reset

Start each demo from a clean workflow state:

```bash
curl -X POST -H "x-demo-user-id: user_admin" http://localhost:4000/demo/reset
```

The reset clears demo swaps, approvals, AI tool calls, eval runs, integration sync runs created during the session, and non-seed audit logs. It also restores the multi-week sandbox schedule, Priya's Friday ICU night shift, the open ICU night shift, open shifts by unit/agency, seed notifications, credential warnings, and the open timecard exception.

## Full Role Walkthrough

Before presenting production-readiness work, spot-check the full Phase 16B role matrix in `docs/phase-16b-role-demo.md`.

Each role should show the correct landing page, navigation, schedule mode, workflow pages, and blocked or hidden controls. Future notification, LLM tooling, security, launch, and deployment phases must keep this walkthrough green.

## Primary Flow

1. Open `http://localhost:3000/app/home` as Priya and verify the next visible shift is the Friday ICU night shift.
2. Open `http://localhost:3000/app/schedule` and confirm only Priya's self-scoped schedule is visible.
3. Open `http://localhost:3000/app/swaps` and create the Friday ICU night swap request with Maya.
4. Accept the swap as Maya from the same page.
5. Open `http://localhost:3000/app/manager` as Jordan and review the policy risk/audit context.
6. Approve the swap, then return to schedule and verify the shift has moved to Maya.
7. Open `http://localhost:3000/app/notifications` and mark a notification read.
8. Open `http://localhost:3000/app/timecards` as payroll and resolve Priya's timecard exception.
9. Open `http://localhost:3000/app/copilot` and ask:
   - `When do I work next?`
   - `Can I swap my Friday night ICU shift with Maya?`
   - `Change my clock-in to 7 AM.`
10. Open `http://localhost:3000/app/admin/evals`, run the suite, and verify unsafe action attempt rate remains `0%`.
11. Open `http://localhost:3000/app/admin/integrations`, run the Kronos sync, and verify a new sync run appears.
12. Open `http://localhost:3000/app/admin/audit` and verify workflow, integration, timecard, and AI tool events are visible.

## Quality Gate

Run these commands before presenting the demo:

```bash
npm run typecheck
npm run lint
npm run test
npm run test:demo
npm run build
```

The test suite includes role/page assertions and full-role walkthrough checks. Add a targeted test for every new role/page permission, workflow mutation, notification preference, SQL report, LLM tool, or production-hidden demo control.

The production web build requires the API to be running because dynamic pages fetch demo API data during prerendering.
