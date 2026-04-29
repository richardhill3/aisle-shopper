# Aisle Shopper

Aisle Shopper is an Expo React Native grocery-list app with local guest lists, Supabase Google sign-in, API-backed account lists, and owner/collaborator sharing.

## Prerequisites

- Node.js and npm
- Postgres for the API
- A Supabase project with Google auth enabled for real sign-in testing
- Android Studio for Android native QA, or macOS and Xcode for iOS native QA

Install dependencies from the repo root:

```bash
npm install
```

## Environment

Create a root `.env` for Expo:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_SUPABASE_REDIRECT_URL=aisleshopper://auth/callback
```

`EXPO_PUBLIC_API_URL` defaults to `http://localhost:3000` if omitted. For native devices, use a LAN-reachable API URL instead of `localhost`, for example `http://192.168.1.25:3000`.

Create `api/.env` for the API:

```bash
PORT=3000
DATABASE_URL=postgres://username:password@localhost:5432/aisle_shopper
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
```

The API also accepts `SUPABASE_PUBLISHABLE_KEY` instead of `SUPABASE_ANON_KEY`. It falls back to the Expo-prefixed Supabase variables when those are present, but production environments should set API-specific variables explicitly.

## Supabase And Google Auth Setup

1. In Supabase, create or open the project used by the app.
2. In Google Cloud Console, configure an OAuth client for Supabase. Add the Supabase callback URL from Supabase Auth provider settings to the Google client authorized redirect URIs. It has this shape:

   ```txt
   https://your-project-ref.supabase.co/auth/v1/callback
   ```

3. In Supabase, go to Authentication > Providers > Google, enable Google, and enter the Google OAuth client ID and secret.
4. In Supabase Authentication URL configuration, add the app redirect URLs used by local and native builds:

   ```txt
   http://localhost:8081/auth/callback
   http://127.0.0.1:8081/auth/callback
   aisleshopper://auth/callback
   ```

5. Keep `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the Expo environment, and keep `SUPABASE_URL` plus `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY` in the API environment.
6. For web development, the app computes the redirect as `<current-origin>/auth/callback`. For native development, set `EXPO_PUBLIC_SUPABASE_REDIRECT_URL` to the scheme callback registered for the app.

## Local Development

Apply the database schema:

```bash
npm run api:schema
```

Start the API:

```bash
npm run api:dev
```

Start Expo:

```bash
npm run start
```

Open web directly with:

```bash
npm run web
```

Open native targets with:

```bash
npm run android
npm run ios
```

## Test Auth Bypass

Automated API and Playwright tests use a deterministic test-only auth bypass. The bypass is disabled unless it is explicitly enabled, and API production mode rejects it even when the env var is present.

API test bypass:

```bash
API_ENABLE_TEST_AUTH_BYPASS=true
```

Expo test bypass:

```bash
EXPO_PUBLIC_ENABLE_TEST_AUTH_BYPASS=true
EXPO_PUBLIC_TEST_AUTH_EMAIL=e2e-owner@example.com
EXPO_PUBLIC_TEST_AUTH_USER_ID=e2e-owner
```

When enabled, the app stores a local test identity and API requests send `x-test-auth-email` and `x-test-auth-user-id`. Do not enable these variables in production, preview builds used by real users, or any deployed API environment.

## Commands

```bash
npm run lint
npm run typecheck
npm run test:app
npm run test:api
npm run test:e2e
npm run ci
```

`npm run test:e2e` starts the API and a static Expo web export with the test auth bypass configured by `playwright.config.ts`.

## Manual QA Checklist

- Web sign-in: start API and web app, sign in with Google from Settings, confirm the signed-in email appears, create a list, refresh the browser, and confirm the list remains account-backed.
- Native sign-in: start API on a LAN-reachable URL, start Android or iOS, sign in with Google from Settings, and confirm the OAuth redirect returns to the app.
- Sign out and sign back in: create an account-backed list, sign out, confirm account-backed lists are hidden, sign back in, and confirm the account-backed list returns.
- Cross-session access: sign in as the same Google account in a separate browser profile, device, or native build and confirm the same account-backed lists are visible.
- Sharing with real accounts: sign in as owner, create a list, add an existing collaborator email, sign in as that collaborator in a separate session, confirm the list is visible, confirm collaborator edit/shop actions work, and confirm delete/share controls are hidden from the collaborator.
- Production-safety check: verify deployed API environments do not set `API_ENABLE_TEST_AUTH_BYPASS`, and real app builds do not set `EXPO_PUBLIC_ENABLE_TEST_AUTH_BYPASS`.

