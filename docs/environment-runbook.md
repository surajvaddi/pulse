# Environment Runbook

PulseShift should use separate local, staging, and production environments. Staging and production must have separate Supabase projects, deployment secrets, LLM provider credentials, integration credentials, monitoring destinations, and public URLs.

## Environment Classes

Local:

- Demo auth may be enabled.
- Demo reset may be enabled.
- Docker PostgreSQL or local Supabase may be used.
- Mock LLM provider should be the default.

Staging:

- Demo auth must be disabled.
- Demo reset must be disabled.
- Supabase Auth and Prisma-backed workflow persistence should be enabled.
- Live LLM smoke tests may run only with staging credentials.
- Staging may use seeded demo-like data for smoke tests, but data must not be copied from production without an approved restore process.

Production:

- Demo auth must be disabled.
- Demo reset must be disabled.
- Supabase Auth and Prisma-backed workflow persistence must be enabled.
- Secrets must come from the deployment secret store.
- Browser bundles must receive only `NEXT_PUBLIC_*` variables.

## Server-Only Variables

Database and Supabase:

- `DATABASE_URL`: pooled runtime PostgreSQL connection.
- `DIRECT_URL`: direct PostgreSQL connection for migrations only.
- `SUPABASE_URL`: server-side Supabase project URL.
- `SUPABASE_ANON_KEY`: server-side anon key for Supabase client operations.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only automation key.
- `SUPABASE_JWT_SECRET`: JWT verification secret when symmetric verification is used.

Auth and persistence:

- `ENABLE_DEMO_AUTH`: `true` only for local demos.
- `ENABLE_DEMO_RESET`: `true` only for local demos.
- `AUTH_PERSISTENCE`: `memory` locally, `prisma` in staging and production.
- `WORKFLOW_PERSISTENCE`: `memory` locally, `prisma` in staging and production.

API and security:

- `API_PORT`
- `API_HOST`
- `WEB_ORIGINS`
- `CORS_ALLOWED_ORIGINS`
- `SESSION_COOKIE_SECURE`
- `RATE_LIMIT_AUTH_SESSION_LIMIT`
- `RATE_LIMIT_INVITATION_LIMIT`
- `RATE_LIMIT_COPILOT_LIMIT`
- `RATE_LIMIT_WORKFLOW_WRITE_LIMIT`
- `RATE_LIMIT_INTEGRATION_LIMIT`
- `RATE_LIMIT_DEFAULT_READ_LIMIT`

LLM:

- `LLM_PROVIDER`
- `LLM_PROVIDER_ENABLED`
- `LLM_MODEL`
- `LLM_TIMEOUT_MS`
- `LLM_LIVE_SMOKE`
- `AI_GATEWAY_BASE_URL`
- `AI_GATEWAY_API_KEY`
- `OPENAI_API_KEY`

Future provider secrets:

- Email/SMS provider key.
- Payroll/timekeeping integration key.
- Monitoring provider key or DSN.

## Browser-Safe Variables

Only these variables should be exposed to the browser:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Do not expose `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `DATABASE_URL`, `DIRECT_URL`, LLM provider keys, integration keys, or monitoring write keys to the browser.

## Rotation Owners

- Supabase service-role key: system admin or platform owner.
- Supabase JWT secret: platform owner.
- Database credentials: platform owner.
- LLM provider keys: AI/tooling owner.
- Integration credentials: integration owner.
- Email/SMS keys: notification owner.
- Monitoring keys: operations owner.

Every rotation should record owner, reason, changed environment, affected deployment, validation command, and rollback note.

## Staging Preflight

Before staging deploy:

```bash
npm run db:validate
npm run typecheck
npm run lint
npm run test
npm run test:staging-smoke
```

Then confirm:

- `ENABLE_DEMO_AUTH=false`
- `ENABLE_DEMO_RESET=false`
- `AUTH_PERSISTENCE=prisma`
- `WORKFLOW_PERSISTENCE=prisma`
- `CORS_ALLOWED_ORIGINS` includes only staging web origins.
- Cookie secure mode is enabled for HTTPS staging.

## Production Preflight

Before production deploy:

```bash
npm audit --audit-level=high
npm run db:validate
npm run typecheck
npm run lint
npm run test
npm run test:demo
npm run build
```

Production must also complete the release checklist, rollback checklist, backup verification, and full-role staging smoke pass.
