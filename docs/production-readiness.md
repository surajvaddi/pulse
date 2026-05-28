# Production Readiness

PulseShift production uses Supabase for hosted PostgreSQL and Supabase Auth, while the application API remains the source of truth for workflow mutations, authorization, policy checks, audit writes, and AI tool execution.

## Environments

Local development may use Docker PostgreSQL or a local Supabase project. Staging and production should use separate Supabase projects with separate API, web, and LLM provider credentials.

Required variables:

- `DATABASE_URL`: pooled PostgreSQL connection for app runtime.
- `DIRECT_URL`: direct PostgreSQL connection for Prisma migrations.
- `SUPABASE_URL`: server-side Supabase project URL.
- `SUPABASE_ANON_KEY`: server-side anon key for JWT/JWKS-compatible client operations.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key for invitation/admin automation.
- `SUPABASE_JWT_SECRET`: JWT verification secret when using symmetric verification.
- `NEXT_PUBLIC_SUPABASE_URL`: browser Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: browser anon key.
- `NEXT_PUBLIC_API_BASE_URL`: web-to-API URL.
- `OPENAI_API_KEY` or `AI_GATEWAY_API_KEY`: LLM provider key.

Never expose service-role keys to the browser. Never reuse staging credentials in production.

## Supabase Setup

Local options:

1. Use Docker Compose PostgreSQL for Prisma-only development.
2. Use the Supabase CLI for a local Supabase stack when testing Auth or Realtime.

Hosted setup:

1. Create separate Supabase projects for staging and production.
2. Copy the pooled connection string to `DATABASE_URL`.
3. Copy the direct connection string to `DIRECT_URL`.
4. Configure allowed redirect URLs for the web app:
   - `/login`
   - `/invite/accept`
   - `/onboarding/profile`
   - `/onboarding/organization`
5. Store Supabase anon/service-role/JWT settings in the deployment secret store.

## Prisma Commands

Use Prisma as the ORM and migration tool:

```bash
npm run db:generate
npm run db:validate
npm run db:migrate
npm run db:seed
```

For staging and production, run migrations with the direct database URL and keep application runtime traffic on the pooled URL.

## Seed And Reset Policy

Local and staging may seed demo data for development and smoke tests. Production must not expose a destructive reset endpoint or a public seed workflow.

The current in-memory `demo-data.ts` state is a temporary MVP implementation. Production phases must migrate each array-backed workflow behind repository/service interfaces and then replace those repositories with Prisma-backed implementations.

## Repository Migration Pattern

Each production workflow should follow this sequence:

1. Define a service boundary around the current controller behavior.
2. Add a repository interface for reads and writes needed by that service.
3. Implement an in-memory adapter only where needed to preserve existing tests during migration.
4. Implement a Prisma adapter with organization-scoped queries.
5. Move mutations into transactions when multiple records must update together.
6. Preserve audit and notification side effects as part of the service contract.
7. Remove direct reads from `demo-data.ts` after the Prisma repository covers the behavior.

Controllers should remain thin. Services own policy decisions and workflow orchestration. Repositories own persistence details.

## CI Quality Gate

Every production branch should pass:

```bash
npm install
npm run db:generate
npm run db:validate
npm run typecheck
npm run lint
npm run test
npm run test:demo
npm run build
npm audit --audit-level=high
```

The web production build requires the API to be available because server-rendered pages fetch API-backed data during prerender.
