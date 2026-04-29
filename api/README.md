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

