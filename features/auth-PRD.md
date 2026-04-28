# Product Requirements Document

## Problem Statement

Today, Aisle Shopper stores shopping lists without real user identity. Lists are either globally available through the API or local to the current app context, so the app cannot reliably support cross-device access, ownership, or sharing.

This matters because shopping lists are only useful long-term if users can access their own lists from multiple devices and safely share a list with household members without exposing every list to every user.

## Desired Outcome

Users can continue using the app without signing in, but signing in with Google allows them to sync their lists across devices.

Signed-in users can share owned lists with up to 5 existing users by email. Shared users can edit and shop the list, while ownership-only actions remain restricted to the owner.

## Proposed Solution

Add optional Supabase Google authentication to the Expo app while keeping the existing Express API as the list backend.

Guests keep device-only lists. When a guest signs in, the app automatically imports local guest lists into the signed-in account and then treats the API as the source of truth for signed-in list data.

The API verifies Supabase access tokens, creates or updates user profiles, scopes list reads/writes by owner or membership, and exposes sharing endpoints for owners.

## User Stories

As a guest user  
I want to create and manage shopping lists without signing in  
So that I can use the app immediately.

As a guest user with local lists  
I want my lists imported automatically when I sign in  
So that I do not lose work when enabling sync.

As a signed-in user  
I want to access my lists from another device using the same Google sign-in  
So that my grocery planning follows my account.

As a signed-in list owner  
I want to share a list with another existing user by email  
So that another household member can help maintain and shop the list.

As a signed-in collaborator  
I want to add, rename, delete, and check off items on a shared list  
So that I can actively participate in shopping.

As a list owner  
I want only myself to manage sharing and delete the list  
So that collaborators cannot remove access or destroy the list accidentally.

As a list owner  
I want sharing limited to 5 collaborators  
So that list access stays intentionally small for v1.

As a user entering an unknown email  
I want the app to tell me the user must already have an account  
So that I understand why sharing did not work.

As a signed-in user who signs out  
I want the app to return to guest mode  
So that account data is no longer visible on that device.

## Proposed Modules to Modify

- Expo app auth/client utilities:
  - Add Supabase client setup, session persistence, OAuth redirect handling, and access-token retrieval.
- Storage/data access:
  - Keep guest list persistence local.
  - Route signed-in list operations through the existing API helpers.
  - Add automatic local-to-account import after sign-in.
- Existing Express API:
  - Verify Supabase JWTs.
  - Add current-user/profile handling.
  - Scope existing list routes by owner or membership.
  - Add owner-only sharing routes.
- Database:
  - Add `profiles`.
  - Add owner association to `lists`.
  - Add `list_memberships`.
- UI:
  - Settings account section for Google sign-in, signed-in email, display name editing, and sign out.
  - List sharing UI available to owners.
- Tests:
  - API authorization tests.
  - Storage/auth state tests.
  - Sharing permission tests.
  - E2E flows using a test-only auth bypass.

## Implementation Decisions

- Use Supabase Auth with Google only for v1.
- Do not store passwords in this app.
- Store only Supabase user id, email, display name, list ownership, and list membership data.
- Keep the existing Express API as the backend boundary for list data.
- Do not move list reads/writes directly to Supabase Row Level Security in v1.
- Guest lists remain device-only.
- Guest lists import automatically after sign-in.
- Signed-in account data uses the API as source of truth.
- Sharing is by email address only.
- A share target must already have a profile/account.
- Collaborators can edit and shop shared lists.
- Only owners can delete lists or manage sharing.
- Each list supports up to 5 collaborators.
- Automated tests should not drive real Google OAuth. Use a test-only auth bypass for deterministic user identity.

## Testing Decisions

Must be tested:

- Guest users can create, edit, shop, and delete local lists.
- Google-authenticated sessions cause API requests to include a valid access token.
- Guest lists import once after sign-in.
- Signed-in users see only owned and shared lists.
- Owners can share with existing users by email.
- Sharing rejects unknown emails.
- Sharing rejects more than 5 collaborators.
- Collaborators can edit/shop shared lists.
- Collaborators cannot delete lists or manage sharing.
- Sign out hides account-backed lists and returns to guest mode.
- Existing shopping-list flows still work.

Acceptance criteria:

- A user can use the app without signing in.
- A user can sign in with Google through Supabase.
- A signed-in user can access imported/account lists from another device.
- A list owner can add and remove collaborators by email.
- API authorization prevents cross-user list access.
- No passwords or password hashes are stored by the app.

Regression risks:

- Existing list CRUD may break when owner filtering is added.
- Guest and signed-in storage paths may diverge.
- Import could duplicate lists if sign-in/session handling repeats.
- Existing e2e cleanup currently assumes global list visibility and must be updated for user-scoped data.
- OAuth redirect handling may differ across web and native.

Required automated tests:

- API unit/integration tests for auth, ownership, sharing, and collaborator permissions.
- App tests for guest storage, auth state, import behavior, and signed-in data routing.
- E2E tests for guest list creation, sign-in/import using test auth bypass, and shared-list collaboration.

Required manual QA:

- Real Google sign-in on web.
- Real Google sign-in on at least one native target.
- Sign out and sign back in.
- Cross-device or separate-session verification.
- Sharing from owner to collaborator using real accounts.

## Out of Scope

- Password sign-up or password login.
- Magic links.
- Apple sign-in.
- Pending invites for emails without accounts.
- Public invite links.
- Username-based search or sharing.
- More than 5 collaborators per list.
- Role customization beyond owner and collaborator.
- Real-time collaborative updates.
- Offline sync conflict resolution for signed-in users.
- Admin user management.
- Moving list data access directly to Supabase RLS.
- Email notifications for sharing.
