# Phase 16B Role Demo Checklist

Use the demo identity selector to walk each role through its landing page and the pages visible in navigation.

## Demo Personas

- Organization owner: Morgan Owner
- System admin: Alex Admin
- Workforce admin: Wendy Workforce
- Unit manager: Jordan Lee
- Charge nurse: Olivia Charge
- Employee: Priya Raman
- Employee counterpart: Maya Shah
- Float pool coordinator: Felix Float
- Payroll admin: Sam Payroll
- Credentialing admin: Carmen Credentials
- Compliance auditor: Avery Auditor
- Executive viewer: Evan Executive
- External agency admin: Aria Agency
- AI service identity: PulseShift AI Service

## Role Walkthroughs

- Employee and agency roles should land on Home, see self-schedule/open-shift context, and avoid broad staffing/admin pages.
- Unit manager should land on Manager and see coverage, gaps, approvals, staff, swaps, notifications, and Copilot.
- Charge nurse should land on Home and see unit coverage links without broad admin controls.
- Workforce admin and float coordinator should land on Home and see facility schedule/staffing workflows.
- Payroll should land on Timecards and see exception review without schedule mutation.
- Credentialing should land on Credentials and see credential warnings plus notifications/Copilot.
- Auditor should land on Audit and see audit evidence without reset-only or mutation controls in production.
- Executive viewer should land on Home and see read-only schedule/staffing/Copilot links.
- Organization owner and system admin should land on Admin and see administration, integrations, audit, evals, and user management.
- AI service identity should land on Copilot only and should not be used as a human account in production.

## Standing Gate For Future Phases

Phase 16B is the baseline for all future production work. Phases 17 through 20 must reuse this checklist for notifications, LLM tooling, SQL reporting, security hardening, staging launch checks, and deployment readiness.

For each new feature, answer and test:

1. Which roles can see it?
2. Which roles can act on it?
3. Which roles have read-only visibility?
4. Which roles are blocked or hidden?
5. Which organization, unit, employee, agency, or service scope is enforced?
6. Which audit, monitoring, notification, Copilot, or SQL-reporting context is emitted?

No phase is complete until the full-role walkthrough, role/page contract assertions, allowed workflow checks, and denied-action checks are passing.

## Verification Commands

```text
npm run typecheck --workspace @pulseshift/api
npm run lint --workspace @pulseshift/api
npm run test --workspace @pulseshift/api
npm run typecheck --workspace @pulseshift/web
npm run lint --workspace @pulseshift/web
npm run test --workspace @pulseshift/web
npm run test:demo
npm run build --workspace @pulseshift/web
```
