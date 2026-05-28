# PulseShift MVP Demo Runbook

## Demo Users

Use the `x-demo-user-id` header for API calls or the demo user switcher in the web shell.

| User | ID | Role | Demo scope |
| --- | --- | --- | --- |
| Priya Raman | `user_priya` | Employee | Self schedule, open shifts, swaps, timecards, copilot |
| Maya Shah | `user_maya` | Employee | Counterparty for Priya's swap |
| Jordan Lee | `user_jordan_manager` | Unit manager | ICU/ED schedules, approvals, staffing risk |
| Sam Payroll | `user_payroll` | Payroll admin | Timecard exception queue |
| Alex Admin | `user_admin` | System admin | Audit, integrations, evals, AI tool calls |

## Reset

Start each demo from a clean workflow state:

```bash
curl -X POST -H "x-demo-user-id: user_admin" http://localhost:4000/demo/reset
```

The reset clears demo swaps, approvals, AI tool calls, eval runs, integration sync runs created during the session, and non-seed audit logs. It also restores Priya's Friday ICU night shift, the open ICU night shift, and the open timecard exception.

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

The production web build requires the API to be running because dynamic pages fetch demo API data during prerendering.
