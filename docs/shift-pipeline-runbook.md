# Shift Pipeline Runbook

## Purpose

The production shift pipeline models coverage as one-person shift slots, claim requests, assignments, manager decisions, policy snapshots, audit events, and notifications. Multi-person coverage is represented by multiple slots tied to the same staffing requirement.

## Lifecycle

1. A `ShiftSlot` starts as `OPEN`.
2. An employee or agency user calls `POST /shift-pipeline/slots/:slotId/claim`.
3. `ShiftEligibilityService.evaluateClaim` checks slot status, active assignment, employee profile, role match, unit scope, certifications, rest period, and overtime risk.
4. If policy blocks the claim, the API returns a policy decision and does not mutate state.
5. If policy allows without approval, the pipeline creates an `ACTIVE` `ShiftAssignment`, stores an `ASSIGNED` claim, and moves the slot to `ASSIGNED`.
6. If policy requires approval, the pipeline stores a `PENDING_APPROVAL` claim, creates a pending approval, and moves the slot to `CLAIM_PENDING`.
7. A manager calls `POST /shift-pipeline/claims/:claimId/approve` or `POST /shift-pipeline/claims/:claimId/deny`.
8. Approval creates the active assignment, marks the claim `ASSIGNED`, marks the approval `APPROVED`, and moves the slot to `ASSIGNED`.
9. Denial marks the claim `DENIED`, marks the approval `DENIED`, and reopens the slot.
10. Managers may directly assign an open slot through `POST /shift-pipeline/slots/:slotId/assign`; blocked policy decisions require override permission and an override reason.

## API Endpoints

- `GET /shift-pipeline/slots?unitId=&facilityId=&statuses=OPEN,CLAIM_PENDING`
- `GET /shift-pipeline/claims?slotId=&employeeId=&statuses=PENDING_APPROVAL`
- `GET /shift-pipeline/assignments?slotId=&employeeId=&statuses=ACTIVE`
- `GET /shift-pipeline/approvals?status=PENDING`
- `POST /shift-pipeline/slots/:slotId/claim`
- `POST /shift-pipeline/claims/:claimId/cancel`
- `POST /shift-pipeline/claims/:claimId/approve`
- `POST /shift-pipeline/claims/:claimId/deny`
- `POST /shift-pipeline/slots/:slotId/assign`

## LLM Tool Rules

The LLM may only use predefined workflow tools:

- `list_shift_pipeline_slots`
- `claim_shift_slot`
- `decide_shift_claim`
- `direct_assign_shift_slot`

Mutation tools must require preview, policy gate, role access, page context, scope checks, and audit events. The LLM must not generate SQL or workflow names.

## Verification Commands

```bash
npm run typecheck --workspace @pulseshift/domain
npm run test --workspace @pulseshift/domain
npm run db:validate
npm run typecheck --workspace @pulseshift/db
npm run typecheck --workspace @pulseshift/api
npm run lint --workspace @pulseshift/api
npm run test --workspace @pulseshift/api
npm run typecheck --workspace @pulseshift/web
npm run lint --workspace @pulseshift/web
npm run test --workspace @pulseshift/web
```

Final integration gate:

```bash
npm run typecheck
npm run lint
npm run test
```
