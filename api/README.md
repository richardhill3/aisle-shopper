# Aisle Shopper API

Node/Express API for the Aisle Shopper app. It exposes `/api/v1`, stores list data in Postgres, and verifies Supabase access tokens for signed-in list ownership and sharing.

## Setup

1. Create a Postgres database.
2. Copy `api/.env.example` to `api/.env`.
3. Set `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY`.
4. Apply the schema from the repo root:

```bash
npm run api:schema
```

If you prefer `psql` directly:

```bash
psql "$DATABASE_URL" -f api/schema.sql
```

5. Start the API from the repo root:

```bash
npm run api:dev
```

The API listens on `PORT`, defaulting to `3000`. The Expo app reads `EXPO_PUBLIC_API_URL`; if unset it defaults to `http://localhost:3000`.

## Environment Variables

- `PORT`: API port. Defaults to `3000`.
- `DATABASE_URL`: Postgres connection string.
- `SUPABASE_URL`: Supabase project URL used to validate JWT issuer and claims.
- `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY`: Supabase public key used by the server-side Supabase client to verify access-token claims.
- `API_ENABLE_TEST_AUTH_BYPASS`: test-only bypass for deterministic API and Playwright identities.

## Authentication

Real app sessions send `Authorization: Bearer <supabase-access-token>`. The API validates token shape, verifies Supabase claims, checks the issuer against `SUPABASE_URL`, and upserts the matching profile before list routes run.

For automated tests only, requests may send:

```txt
x-test-auth-email: e2e-owner@example.com
x-test-auth-user-id: e2e-owner
x-test-auth-display-name: E2E Owner
```

This path requires `API_ENABLE_TEST_AUTH_BYPASS=true` and is rejected when `NODE_ENV=production`. Never set `API_ENABLE_TEST_AUTH_BYPASS` in production or in a shared deployed API used by real users.

## Backend Architecture

New backend code should move toward a small clean architecture shape while
preserving the current API behavior during migration.

- `api/src/domain`: pure business types, policies, and domain errors. This layer
  must not import Express, Postgres, Supabase, environment config, infrastructure,
  presentation, main composition, or shared HTTP DTO contracts.
- `api/src/application`: use cases and ports that coordinate domain behavior.
  This layer may import domain code, but must not import Express, Postgres,
  Supabase, environment config, infrastructure, presentation, main composition,
  or shared HTTP DTO contracts.
- `api/src/infrastructure`: adapters for external systems such as Postgres and
  Supabase. This layer implements application ports and may depend on domain and
  application types.
- `api/src/presentation`: HTTP controllers, request validation, response DTO
  mapping, and error mapping. This layer may depend on application use cases and
  shared API contracts.
- `api/src/main`: hand-written composition that wires controllers, use cases,
  repositories, gateways, and other adapters together.

Dependency direction should point inward: `main -> presentation ->
application -> domain`, with infrastructure plugged into application ports by
the composition root. Existing legacy modules remain in place until a vertical
slice is migrated.

The API test suite includes an import-boundary check for domain and application
files. If a new use case needs database, Supabase, Express, or shared DTO access,
define a narrow port in application and implement it in infrastructure or map it
in presentation instead.

## Local Test Flow

Run API tests:

```bash
npm run test:api
```

Run Playwright e2e auth flows from the repo root:

```bash
npm run test:e2e
```

Playwright starts the API with `API_ENABLE_TEST_AUTH_BYPASS=true`, applies deterministic test identities through request headers, and serves an Expo web export with the matching Expo test bypass enabled.
