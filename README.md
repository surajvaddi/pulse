# PulseShift

PulseShift is a healthcare workforce scheduling copilot and Kronos-style replacement prototype. The product pairs deterministic scheduling services with permission-aware AI tooling for shift lookup, open shifts, swap requests, policy checks, approvals, notifications, audit logs, and LLM evaluation.

## Local Setup

Prerequisites:

- Node.js 20.11 or newer
- npm 10 or newer
- Docker Desktop or another Docker Compose compatible runtime

Commands:

```bash
cp .env.example .env
npm install
docker compose up -d
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev:web
npm run dev:api
```

Default local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- API health: `http://localhost:4000/health`

## Quality Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Source Documents

- `spec.md`: full product specification.
- `plan.md`: architecture and product roadmap.
- `implement.md`: phase-by-phase Goal Mode execution guide.

## Safety Boundaries

The MVP intentionally excludes patient records and PHI. AI actions must be routed through typed backend tools, scoped permissions, policy checks, previews, approvals, and audit logs. AI cannot directly mutate payroll hours, delete audit logs, edit permissions, override credentials, or approve its own proposed actions.
