# Auth Implementation Issues

Generated from `features/auth-PRD.md` after reviewing the current Expo Router app, `src/storage/lists.ts` API-backed list data access, Express routes in `api/src/routes.ts`, repository SQL in `api/src/listsRepository.ts`, shared response types in `shared/src/index.ts`, app tests, API tests, and Playwright e2e coverage.

# Issue 1: Add Auth-Aware Database Ownership Tracer

## Status Completed: 8587167 feat: add auth-aware list ownership

## Type

AFK

## Goal

Introduce the minimum database and API support needed for a signed-in user to own, create, list, fetch, edit, shop, and delete their own lists without changing the existing guest app flow yet.

## Scope

- Add `profiles`, `lists.owner_profile_id`, and ownership indexes to `api/schema.sql`.
- Add an API auth middleware that resolves a current user from a Supabase JWT or test-only auth header.
- Add profile upsert behavior when an authenticated request is received.
- Update list repository methods to accept an optional/current profile context and scope authenticated list summaries/details by owner.
- Keep unauthenticated list behavior working during this transitional slice so existing app and e2e flows do not break before guest/local routing lands.
- Extend shared API error codes if needed for `unauthorized` and `forbidden`.

## Acceptance Criteria

- Authenticated `POST /api/v1/lists` creates a list owned by the authenticated profile.
- Authenticated `GET /api/v1/lists`, `GET /api/v1/lists/recent`, and `GET /api/v1/lists/:id` return only that user's owned lists.
- Authenticated edit/shop/delete operations work for owned lists.
- Authenticated access to another owner's list is denied or hidden consistently.
- Existing unauthenticated API list CRUD tests still pass until the app is migrated to local guest storage.

## Testing Requirements

- Add API integration tests covering authenticated create/list/fetch/update/delete for two different test users.
- Add an API test proving user A cannot read or mutate user B's owned list.
- Run `npm run test:api` and `npm run typecheck`.

## Blocked By

[]

## Notes

Use a test-only auth bypass for deterministic tests; do not drive real Google OAuth in automated tests. Keep Supabase verification isolated in an API auth utility so routes and repositories receive a normalized current-user/profile object.

# Issue 2: Add App Auth Client and Token-Attached API Requests

## Status Completed: 88a59e6 feat: add Supabase auth client

## Type

AFK

## Goal

Set up Supabase auth client utilities in the Expo app and make authenticated sessions attach access tokens to existing API requests.

## Scope

- Install and configure the Supabase Expo client dependencies using Expo-compatible packages.
- Add a typed auth utility under `src/utils` or `src/storage` for session lookup, Google sign-in start, redirect/session handling, sign out, and access-token retrieval.
- Update `src/utils/api.ts` so API calls include `Authorization: Bearer <token>` when a session exists.
- Keep unauthenticated requests possible so guest mode can continue.
- Add environment-variable handling for Supabase URL, anon key, and redirect configuration.

## Acceptance Criteria

- App code can determine whether a user is signed in.
- Existing storage callers do not need to manually pass tokens.
- Signed-in API requests include an access token.
- Guest API requests still omit the header.
- Missing Supabase environment values fail clearly in auth-specific code, not during unrelated guest app startup.

## Testing Requirements

- Add app/unit tests for `apiRequest` proving it adds auth headers only when a token exists.
- Add app/unit tests for auth utility behavior using mocked Supabase client/session responses.
- Run `npm run test:app` and `npm run typecheck`.

## Blocked By

[]

## Notes

Keep token attachment centralized in `src/utils/api.ts`; screens and components should not know how auth headers work.

# Issue 3: Split List Data Access Between Guest Local Storage and Signed-In API

## Status Completed: 60711b5 feat: split guest and signed-in list storage

## Type

AFK

## Goal

Preserve immediate guest usage while routing signed-in list operations to the existing API boundary.

## Scope

- Refactor `src/storage/lists.ts` into a session-aware facade.
- Add or restore device-local AsyncStorage-backed guest list operations behind storage helpers.
- Keep signed-in operations using the existing API helper functions.
- Ensure Home, All Lists, Create List, and List Detail screens keep calling `@/storage/lists` only.
- Avoid direct AsyncStorage access from screens or UI components.

## Acceptance Criteria

- A guest can create, view, edit, shop, reset, and delete local lists without an account or API-backed ownership.
- A signed-in user performs the same operations through the API.
- Screens do not contain branchy auth persistence logic.
- Existing UI behavior remains unchanged for basic list flows.

## Testing Requirements

- Add/extend `src/__tests__/storage/lists.test.ts` for guest local CRUD and signed-in API routing.
- Add regression tests for create/list/detail screens using the storage facade mocks.
- Run `npm run test:app` and `npm run typecheck`.

## Blocked By

[2]

## Notes

This is the key app-side tracer bullet: the user-visible list flow remains intact while the source of truth changes based on auth state.

# Issue 4: Import Guest Lists Once After Sign-In

## Status Completed: 0c32efc feat: import guest lists after sign-in

## Type

AFK

## Goal

Automatically copy device-local guest lists into the signed-in account when a guest signs in, without duplicating imports on repeated session handling.

## Scope

- Add import orchestration in the app storage/auth layer, not in screens.
- Create signed-in API lists that preserve list names, sections, items, item checked state, and ordering.
- Track completed imports by signed-in user id in AsyncStorage.
- Decide whether imported guest lists remain locally available after sign out; implement the simplest behavior consistent with the PRD that sign-out returns to guest mode and hides account-backed lists.
- Surface import failure in a recoverable way without losing guest data.

## Acceptance Criteria

- First sign-in imports all current guest lists into the signed-in account.
- Repeated session refreshes or app restarts do not duplicate imported lists.
- Imported lists are visible through signed-in Home, All Lists, and List Detail screens.
- Sign out hides account-backed lists and returns to guest mode.
- Guest data is not destroyed until import success is confirmed.

## Testing Requirements

- Add storage/auth tests for one-time import, no duplicate import, and import failure preservation.
- Add API-call sequencing tests proving nested sections/items are recreated.
- Run `npm run test:app` and `npm run typecheck`.

## Blocked By

[2, 3]

## Notes

Keep import logic deterministic and idempotent. If bulk API endpoints are not introduced, use existing list/section/item endpoints for the first implementation.

# Issue 5: Add Settings Account Section for Sign-In, Profile, and Sign-Out

## Status Completed: c72f97f feat: add account sign-in settings

## Type

Human-in-the-Loop

## Goal

Expose account controls in `src/app/settings.tsx` so users can sign in with Google, see account identity, edit display name, and sign out.

## Scope

- Add reusable account/settings components under `src/components` if the UI grows beyond a small section.
- Add Google sign-in button, signed-in email display, editable display name, and sign-out action.
- Wire actions to app auth utilities and profile API helpers.
- Use existing theme colors, `StyleSheet.create`, React Native components, and Expo Router conventions.
- Include loading/error states for sign-in, profile save, and sign-out.

## Acceptance Criteria

- Guest users see a Google sign-in control in Settings.
- Signed-in users see their email, can update display name, and can sign out.
- Sign-out returns the app to guest mode and hides account-backed lists.
- Errors are communicated with native-feeling alerts or inline state matching existing app style.
- The section fits existing Settings layout and theme behavior.

## Testing Requirements

- Add app tests for guest settings state, signed-in settings state, display-name save, and sign-out callback.
- Manual QA real Google sign-in on web.
- Manual QA real Google sign-in on at least one native target.
- Run `npm run test:app`, `npm run lint`, and `npm run typecheck`.

## Blocked By

[2, 4]

## Notes

Human review is useful here for OAuth copy, loading states, and how prominently account controls should appear in the existing minimal Settings screen.

# Issue 6: Add Current User Profile API

## Status Completed: 0703059 feat: add current user profile api

## Type

AFK

## Goal

Provide the app with a backend profile endpoint for signed-in identity and display-name updates.

## Scope

- Add `GET /api/v1/me` returning current profile data.
- Add `PATCH /api/v1/me` for display-name updates.
- Normalize email casing for lookup/storage.
- Keep profile creation/upsert tied to authenticated requests.
- Add shared response/request types for profile data.

## Acceptance Criteria

- Authenticated users can fetch their profile.
- Authenticated users can update display name.
- Unauthenticated requests to `/me` return `401`.
- Profile records store Supabase user id, email, display name, timestamps, and no password data.

## Testing Requirements

- Add API tests for fetch/update profile, unauthenticated rejection, and email normalization.
- Add app API-helper tests for profile fetch/update.
- Run `npm run test:api`, `npm run test:app`, and `npm run typecheck`.

## Blocked By

[1, 2]

## Notes

This can be implemented independently from the final Settings UI, but it supports Issue 5.

# Issue 7: Enforce Owner vs Collaborator Permissions in Existing List Routes

## Status Completed: e79f642 feat: add collaborator list permissions

## Type

AFK

## Goal

Extend list authorization so owners and future collaborators can edit/shop shared lists, while owner-only actions remain protected.

## Scope

- Add `list_memberships` table with unique list/profile membership.
- Add repository authorization helpers for owner access, member access, and owner-or-member access.
- Update existing list routes so read, section changes, item changes, checked resets, and list renames allow owner or collaborator.
- Restrict list deletion to owner only.
- Include membership-accessible lists in authenticated summaries and recent lists.

## Acceptance Criteria

- Owners can read, edit, shop, reset checked items, rename, and delete their lists.
- Collaborators can read, rename list/sections/items, add/delete sections/items, check items, reset checked items, and cannot delete the list.
- Non-members cannot read or mutate a list.
- Recent/all list summaries include owned and shared lists, ordered by updated time.

## Testing Requirements

- Add API tests for owner, collaborator, and unrelated-user permissions across representative routes.
- Add API tests for list summaries containing owned and shared lists only.
- Run `npm run test:api` and `npm run typecheck`.

## Blocked By

[1]

## Notes

This issue prepares the permission model before exposing sharing UI. It should reuse the same repository methods instead of adding parallel collaborator-specific code paths.

# Issue 8: Add Owner Sharing API by Email

## Status Completed: e306f4b feat: add owner sharing api

## Type

AFK

## Goal

Allow list owners to add, list, and remove collaborators by email with the v1 limit of 5 existing users.

## Scope

- Add owner-only sharing routes, for example:
  - `GET /api/v1/lists/:listId/members`
  - `POST /api/v1/lists/:listId/members`
  - `DELETE /api/v1/lists/:listId/members/:profileId`
- Accept email address for adding collaborators.
- Reject unknown emails with a clear validation error.
- Reject adding more than 5 collaborators.
- Prevent adding the owner as a collaborator.
- Add shared request/response types for membership data.

## Acceptance Criteria

- Owner can view current collaborators.
- Owner can add an existing profile by email.
- Owner can remove a collaborator.
- Collaborators and unrelated users cannot manage sharing.
- Unknown email, duplicate collaborator, owner email, and over-limit cases return clear errors.

## Testing Requirements

- Add API tests for successful add/remove/list members.
- Add API tests for unknown email, duplicate member, owner-as-member, more than 5 collaborators, collaborator forbidden, unrelated user forbidden.
- Run `npm run test:api` and `npm run typecheck`.

## Blocked By

[6, 7]

## Notes

Use profiles as the source of truth for share targets. Do not add pending invites or public links; both are explicitly out of scope.

# Issue 9: Surface Ownership Metadata to the App

## Status Completed: aeda794 feat: surface list ownership metadata

## Type

AFK

## Goal

Give the app enough list metadata to know whether the current user owns a list and whether sharing/delete controls should be shown.

## Scope

- Extend shared list/list-summary types with ownership or permissions metadata, such as `ownerProfileId`, `currentUserRole`, or explicit capability flags.
- Update API mappers for list detail and summaries.
- Update app storage facade and list consumers to tolerate the new metadata.
- Keep guest local lists compatible by assigning guest-appropriate capabilities locally.

## Acceptance Criteria

- Signed-in owned lists expose owner-level capabilities.
- Signed-in shared lists expose collaborator-level capabilities.
- Guest local lists continue to allow local delete/edit/shop.
- Existing list screens compile and behave correctly with the extended type.

## Testing Requirements

- Add API tests asserting owner vs collaborator metadata in list detail and summaries.
- Add app storage tests for guest metadata defaults and signed-in metadata passthrough.
- Run `npm run test:api`, `npm run test:app`, and `npm run typecheck`.

## Blocked By

[7]

## Notes

Prefer capability flags if they simplify UI conditions and keep screens from duplicating role rules.

# Issue 10: Add List Sharing UI for Owners

## Status Completed: 8e8b068 feat: add owner list sharing UI

## Type

Human-in-the-Loop

## Goal

Expose a list-level sharing experience that allows owners to manage collaborators while hiding owner-only controls from collaborators.

## Scope

- Add reusable sharing component(s) under `src/components`.
- Add owner-only share entry point on `src/app/lists/[id].tsx`.
- Show current collaborators, add-by-email form, remove collaborator action, and errors for unknown users/limit.
- Hide or disable delete-list and sharing controls for collaborators.
- Keep collaborator edit/shop controls available.
- Use existing theme and native controls.

## Acceptance Criteria

- Owners can open sharing UI from list detail.
- Owners can add an existing user by email and remove collaborators.
- Collaborators do not see sharing management or list delete controls.
- Sharing limit and unknown-email errors are understandable.
- UI remains usable on mobile and web layouts.

## Testing Requirements

- Add component tests for owner sharing states and collaborator hidden controls.
- Add list-detail screen tests for owner vs collaborator capability rendering.
- Manual QA with two real/test accounts.
- Run `npm run test:app`, `npm run lint`, and `npm run typecheck`.

## Blocked By

[8, 9]

## Notes

Human review is needed for where the sharing entry point lives and how much collaborator information to expose in the list detail UI.

## Completion Notes

- Added owner-only sharing management on the list detail screen.
- Added `ListSharingSection` for collaborator listing, add-by-email, removal, loading states, and API error messaging.
- Added storage facade helpers for list member API routes so screens/components do not call API helpers directly.
- Hid sharing and list deletion controls from collaborators while preserving edit/shop controls.
- Added a web-compatible collaborator removal confirmation because React Native `Alert.alert` does not provide a usable confirmation flow on web.
- Added storage, component, and list-detail screen tests for sharing behavior and owner/collaborator capability rendering.
- Manual QA completed with two accounts for owner add/remove collaborator and collaborator hidden owner controls.
- Verified with `npm run test:app`, `npm run lint`, and `npm run typecheck`.

# Issue 11: Add Deterministic Test Auth Bypass for E2E and API Cleanup

## Status Completed: a9ed41a test: gate deterministic auth bypass

## Type

AFK

## Goal

Make automated tests user-scoped without depending on real Google OAuth.

## Scope

- Standardize test-only auth identity injection for API tests and Playwright tests.
- Guard bypass behavior behind test/development configuration so it cannot be enabled accidentally in production.
- Update e2e API cleanup helpers to delete only lists for the test identity, not globally visible lists.
- Provide helpers for owner and collaborator test identities.

## Acceptance Criteria

- Playwright tests can act as a deterministic signed-in user.
- API test helpers can create profiles/lists for multiple identities.
- Existing e2e cleanup no longer assumes global list visibility.
- Bypass is disabled unless explicit test configuration is present.

## Testing Requirements

- Add API tests proving bypass is unavailable without test configuration.
- Update e2e setup helpers and run the relevant Playwright spec locally when feasible.
- Run `npm run test:api` and `npm run test:e2e`.

## Blocked By

[1]

## Notes

This should reuse the same normalized current-user path as Supabase JWT auth so tests exercise real authorization logic after identity resolution.

# Issue 12: Add Signed-In Import E2E Tracer

## Status Completed: 9ddac18 test: add signed-in import e2e tracer

## Type

AFK

## Goal

Prove the core end-to-end path: a guest creates a list, signs in through test auth, and sees the imported account-backed list.

## Scope

- Extend Playwright coverage to create a guest local list.
- Use the test auth bypass to switch to a signed-in identity.
- Assert import completes and the list appears in signed-in All Lists/List Detail.
- Assert sign-out hides the account-backed list and returns to guest mode.

## Acceptance Criteria

- E2E test covers guest creation before sign-in.
- E2E test covers deterministic sign-in/import without real Google OAuth.
- E2E test covers sign-out hiding account data.
- Existing shopping-list e2e flow still passes.

## Testing Requirements

- Run `npm run test:e2e`.
- Run `npm run test:app` if storage/import helpers change.

## Blocked By

[3, 4, 5, 11]

## Notes

Keep this as a thin user journey, not a full auth suite. Deeper permission coverage belongs in API and app tests.

# Issue 13: Add Sharing Collaboration E2E Tracer

## Status Completed: 553a242 test: add sharing collaboration e2e tracer

## Type

AFK

## Goal

Prove that an owner can share a list with an existing user and that the collaborator can edit/shop but not perform owner-only actions.

## Scope

- Use deterministic owner and collaborator identities.
- Seed or create both profiles.
- Have owner create a list and add collaborator by email through UI or test-supported setup plus UI verification.
- Switch to collaborator and verify the shared list appears.
- Verify collaborator can add/check an item.
- Verify collaborator cannot delete the list or manage sharing.

## Acceptance Criteria

- E2E test proves shared-list visibility for collaborator.
- E2E test proves collaborator edit/shop capability.
- E2E test proves collaborator does not see owner-only sharing/delete controls.
- Existing guest and signed-in import e2e tests still pass.

## Testing Requirements

- Run `npm run test:e2e`.
- Run `npm run test:api` if any permission behavior changes.

## Blocked By

[10, 11]

## Notes

Prefer testing one representative edit/shop action in e2e and leave exhaustive route permission combinations to API tests.

## Completion Notes

- Added a Playwright tracer for owner-to-collaborator sharing using deterministic test identities.
- Seeded the collaborator profile through the authenticated `/me` API before sharing by email through the owner UI.
- Verified the collaborator can open the shared list, add an item, shop/check it off, and does not see sharing or delete controls.
- Extended E2E cleanup to isolate both owner and collaborator identities.
- Verified with `npm run test:e2e`, `npm run lint`, and `npm run typecheck`.

# Issue 14: Harden Auth Configuration and Manual QA Documentation

## Status Ready: dependencies complete

## Type

Human-in-the-Loop

## Goal

Document required Supabase/Google OAuth configuration and validate real sign-in behavior on web and native targets.

## Scope

- Update README or API/app setup docs with Supabase project settings, Google provider setup, app environment variables, redirect URIs, and test bypass configuration.
- Document local development commands for API, app, schema, and e2e auth flows.
- Add production-safety notes for disabling test auth bypass.
- Perform manual QA scenarios from the PRD.

## Acceptance Criteria

- A developer can configure Supabase Google auth for this app from the docs.
- Required env vars are documented for API and Expo.
- Test-only auth bypass behavior is clearly documented as non-production.
- Manual QA checklist covers web sign-in, native sign-in, sign out/sign back in, cross-session access, and sharing with real accounts.

## Testing Requirements

- Manual QA real Google sign-in on web.
- Manual QA real Google sign-in on at least one native target.
- Manual QA sign out and sign back in.
- Manual QA cross-device or separate-session verification.
- Manual QA owner-to-collaborator sharing with real accounts.

## Blocked By

[5, 10, 11]

## Notes

This issue intentionally stays human-in-the-loop because OAuth provider configuration and redirect behavior often differ between web and native environments.

# Final Review

- The first implementation slices are tracer bullets: Issue 1 proves authenticated ownership through schema + API + repository + tests, while Issues 2 and 3 prove app-side auth/token routing and guest/signed-in data routing through existing screens.
- Horizontal-only work is avoided. Database changes appear inside issues that also expose and test behavior.
- Parallel work is possible: Issues 1 and 2 can start together; Issue 6 can follow Issue 1/2 while Issue 3 progresses; Issue 11 can follow Issue 1 without waiting for UI.
- Early feedback exists before sharing UI: owner-scoped list CRUD, token attachment, guest local mode, and one-time import can all be reviewed independently.
- Human-in-the-loop work is limited to UX-sensitive account/sharing UI and real OAuth/manual QA.
- The backlog preserves the existing architecture: Expo screens call storage helpers, storage uses `src/utils/api.ts`, the Express API remains the backend boundary, and AsyncStorage stays isolated from UI components.
