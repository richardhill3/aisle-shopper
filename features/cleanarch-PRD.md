# Product Requirements Document

## Problem Statement

The Aisle Shopper API has grown from a compact Express backend into a user-aware service with authentication, ownership, collaborator access, list editing, shopping state, profile management, and integration tests. The current implementation works, but its responsibilities are concentrated in a few modules:

- `api/src/routes.ts` handles HTTP routing, request validation, response shaping, and direct calls into persistence-facing functions.
- `api/src/listsRepository.ts` combines SQL queries, transactions, access checks, business rules, row mapping, and use-case orchestration.
- `api/src/auth.ts` combines Express middleware, Supabase token verification, test identity resolution, and profile persistence.
- Shared API contract types live in `shared/src/index.ts`, but there is no separate domain model or application layer.

This matters because each new backend behavior now increases coupling across HTTP, database, authorization, and business-rule code. The API is still small enough to migrate incrementally, but large enough that continued feature work will become harder to test and reason about if the boundaries remain blurred.

The reference architecture is the Clean Architecture shape described in Josh Batey's article, "Mastering Clean Architecture in Node.js: A Practical Guide for Express and MongoDB": dependencies should point inward, with domain/business rules at the center, application use cases around them, infrastructure implementations outside them, and Express routes/controllers at the presentation edge.

## Desired Outcome

The API should move toward clear clean-layer boundaries without a disruptive rewrite:

- Domain rules can be tested without Express, Postgres, Supabase, or HTTP fixtures.
- Application use cases coordinate behavior through interfaces instead of directly issuing SQL.
- Infrastructure modules own Postgres and Supabase-specific implementation details.
- Presentation modules remain thin HTTP adapters.
- Existing API routes, response contracts, auth behavior, and database schema continue working during migration.
- The migration can proceed feature-by-feature, starting with list sharing as the pilot slice.

The desired engineering outcome is not a theoretical folder reorganization. The outcome is lower coupling, faster unit tests for business behavior, and a backend shape that can support future list, sharing, profile, and sync features without pushing more logic into repository modules.

## Proposed Solution

Introduce a Clean Architecture structure under `api/src` and migrate one vertical slice at a time.

Target layers:

- `domain`: Pure business concepts, rules, entities/value objects, domain errors, and repository/service interfaces. This layer must not import Express, `pg`, Supabase, environment config, or shared HTTP response DTOs.
- `application`: Use cases that orchestrate domain rules and depend on domain interfaces. This layer should not know SQL, Express request/response objects, or Supabase client APIs.
- `infrastructure`: Postgres repositories, Supabase auth gateway, ID generation, transactions, and external-service adapters. This layer implements domain/application interfaces.
- `presentation`: Express routes/controllers, request parsing, HTTP validation, HTTP status codes, and response DTO mapping.
- `main`: Composition root that wires infrastructure implementations into application use cases and presentation controllers.

Recommended target structure:

```txt
api/src/
  domain/
    lists/
      List.ts
      ListAccess.ts
      ListRepository.ts
      ListSharingPolicy.ts
    profiles/
      Profile.ts
      ProfileRepository.ts
    auth/
      AuthIdentity.ts
      AuthVerifier.ts
    errors/
      DomainError.ts
  application/
    lists/
      addListMember.ts
      createList.ts
      deleteList.ts
      getList.ts
      listSummaries.ts
      removeListMember.ts
      updateItem.ts
    profiles/
      getCurrentProfile.ts
      updateCurrentProfile.ts
    auth/
      resolveCurrentProfile.ts
  infrastructure/
    postgres/
      db.ts
      PostgresListRepository.ts
      PostgresProfileRepository.ts
      transaction.ts
    supabase/
      SupabaseAuthVerifier.ts
    ids/
      nodeRandomIdGenerator.ts
  presentation/
    http/
      controllers/
        listsController.ts
        profilesController.ts
      routes.ts
      validators.ts
      errorMapper.ts
      dtoMappers.ts
  main/
    container.ts
    app.ts
    server.ts
```

The first migration should be the list sharing slice because it currently demonstrates the most coupling: owner-only access, collaborator lookup, duplicate prevention, max collaborator policy, membership persistence, and HTTP errors are all intertwined in `api/src/listsRepository.ts`.

Migration phases:

1. Establish layer scaffolding and conventions.
   - Add folders for `domain`, `application`, `infrastructure`, `presentation`, and `main`.
   - Keep existing route behavior in place.
   - Add import-boundary conventions to documentation.
   - Do not move every file immediately.

2. Pilot list sharing.
   - Extract pure sharing rules into domain code:
     - owners can manage sharing.
     - collaborators cannot manage sharing.
     - owners cannot add themselves as collaborators.
     - duplicate collaborators are rejected.
     - a list can have at most 5 collaborators.
   - Add domain/application interfaces for list access, profile lookup by email, and membership persistence.
   - Add `AddListMember`, `ListMembers`, and `RemoveListMember` use cases.
   - Implement those interfaces with Postgres adapters.
   - Convert `/lists/:listId/members` routes to call use cases.
   - Preserve current response bodies and status codes.

3. Migrate profile and auth profile resolution.
   - Separate identity verification from profile persistence.
   - Move Supabase token verification into infrastructure.
   - Move current-profile resolution/upsert into an application use case.
   - Keep Express middleware as a presentation adapter that only attaches the resolved current profile.
   - Preserve the deterministic test-auth bypass behavior and production rejection.

4. Migrate list read/write use cases.
   - Migrate `createList`, `updateList`, `deleteList`, `getList`, `listSummaries`, section operations, item operations, section movement, and reset-checked operations into application use cases.
   - Keep Postgres SQL in infrastructure repositories.
   - Extract pure list capabilities and role calculation into domain code.
   - Preserve unauthenticated transitional list behavior unless a separate product decision removes it.

5. Consolidate presentation and composition.
   - Move route handlers into controller functions.
   - Keep request parsing, HTTP validation, and HTTP response shaping in presentation.
   - Add a composition root that constructs use cases with infrastructure dependencies.
   - Keep `createApp()` responsible for Express app setup, middleware, route mounting, and error handling.

6. Remove legacy repository-service exports.
   - Once use cases cover a feature area, stop calling legacy repository functions from routes.
   - Retire or split `api/src/listsRepository.ts` and `api/src/profilesRepository.ts`.
   - Keep compatibility tests passing before and after each removal.

## User Stories

As an API maintainer  
I want list-sharing business rules to live outside SQL repository functions  
So that I can test sharing behavior without building HTTP requests or database state.

As an API maintainer  
I want Express route handlers to call use cases  
So that HTTP concerns stay separate from application behavior.

As an API maintainer  
I want Postgres code isolated in infrastructure adapters  
So that SQL changes do not leak into domain or application rules.

As an API maintainer  
I want Supabase token verification isolated behind an auth verifier interface  
So that application code does not depend on Supabase client details.

As an API maintainer  
I want current API response contracts preserved during migration  
So that the Expo app and e2e tests continue working.

As an API maintainer  
I want migration to happen by vertical slices  
So that each PR can be reviewed, tested, and shipped independently.

As a future feature developer  
I want clear boundaries between domain, application, infrastructure, presentation, and composition  
So that I know where new rules, use cases, SQL queries, and route code belong.

As a test author  
I want pure unit tests for domain policies and use cases  
So that regression coverage does not require every rule to be exercised through Supertest.

## Proposed Modules to Modify

Existing API modules:

- `api/src/routes.ts`
  - Reduce to route registration or replace with presentation HTTP routes/controllers.
  - Keep request parsing and response status behavior at the HTTP edge.

- `api/src/listsRepository.ts`
  - Split responsibilities into domain policies, application use cases, and Postgres infrastructure repository methods.
  - Keep SQL, transaction use, row mapping, and locking behavior in infrastructure.

- `api/src/profilesRepository.ts`
  - Split profile use cases from Postgres implementation.
  - Preserve current `/me` behavior.

- `api/src/auth.ts`
  - Separate Express middleware from identity verification and profile resolution.
  - Keep production safety rules for test auth bypass.

- `api/src/db.ts`
  - Move or wrap under infrastructure.
  - Keep transaction behavior available to Postgres adapters.

- `api/src/validation.ts`
  - Keep HTTP request validation in presentation.
  - Avoid using presentation validators inside domain or application layers.

- `api/src/errors.ts`
  - Split or map errors so domain/application can throw framework-free errors while presentation maps them to current API error response shapes.

- `api/src/app.ts` and `api/src/server.ts`
  - Move toward `main/app.ts` and `main/server.ts`, or keep as compatibility entrypoints that delegate to `main`.

- `api/tests/*.test.ts`
  - Keep current integration tests as regression coverage.
  - Add focused unit tests for new domain and application modules.

Shared modules:

- `shared/src/index.ts`
  - Continue owning API contract types consumed by the Expo app.
  - Do not make domain depend on HTTP response DTOs from `shared`.
  - Use presentation mappers to convert domain/application outputs into shared response shapes.

Documentation:

- `api/README.md`
  - Add architecture notes once the folder structure exists.

- `AGENTS.md`
  - Optionally add backend layer rules after the first migration slice proves the pattern.

Database:

- `api/schema.sql`
  - No schema changes are expected for the clean architecture migration itself.
  - Any future schema changes should remain separate from architecture-only PRs unless a migrated use case requires them.

Expo app:

- No app UI changes are expected.
  - Existing app tests and e2e tests remain regression coverage for unchanged API contracts.

## Implementation Decisions

- This is an API architecture migration, not a product behavior change.
- Preserve existing `/api/v1` routes, HTTP status codes, and response body shapes.
- Preserve current Postgres schema unless a separate feature requires schema changes.
- Use TypeScript for all new code.
- Do not introduce a dependency injection framework for the initial migration.
- Use explicit factory functions or a small hand-written `main/container.ts` composition module.
- Keep domain code free of Express, `pg`, Supabase, environment variables, and shared HTTP DTOs.
- Keep application code free of Express request/response objects, SQL strings, Supabase client calls, and Node HTTP concerns.
- Keep infrastructure code responsible for SQL, transactions, row mapping, Supabase verification, and ID generation.
- Keep presentation code responsible for request validation, route params, query params, HTTP status codes, and mapping errors to API responses.
- Keep `shared/src` as the API contract boundary for the Expo app, not as the internal domain model.
- Prefer functions for use cases unless a class materially improves dependency wiring or test readability.
- Avoid creating generic abstractions for every repository method before a use case needs them.
- Migrate one vertical slice at a time; do not pause feature work for a full backend rewrite.
- Start with list sharing because it has clear business rules and high current coupling.
- Preserve test-only auth bypass behavior exactly, including production rejection.
- Preserve unauthenticated list behavior during this migration unless a separate PRD changes guest/account behavior.

Layer boundary rules:

- `domain` may import only domain-local modules and TypeScript types with no framework dependency.
- `application` may import `domain` and application-local modules.
- `infrastructure` may import `domain`, `application`, `pg`, Supabase, config, and Node APIs.
- `presentation` may import `application`, `shared`, Express, validation, and DTO mappers.
- `main` may import every layer to wire dependencies.
- Inner layers must not import outer layers.

Pilot slice decisions:

- `AddListMember` should enforce collaborator limit, owner self-add rejection, duplicate collaborator rejection, and unknown-email rejection.
- Owner-only access should be expressed as a use-case authorization rule, supported by repository access queries.
- Postgres repositories may still use SQL joins to efficiently check access, but use cases own the decision of which access level is required.
- Domain/application tests should assert rule outcomes independently from HTTP status codes.
- Presentation tests should assert current HTTP mapping, including `400`, `401`, `403`, `404`, `201`, and `204`.

## Testing Decisions

Must be tested:

- Existing API integration tests still pass after each migration phase.
- List sharing use cases can be unit tested without Express or Postgres.
- Domain sharing policy rejects:
  - collaborator management by non-owners.
  - adding the owner as a collaborator.
  - adding an existing collaborator.
  - adding more than 5 collaborators.
  - adding an email that does not map to a profile.
- Domain sharing policy allows an owner to add and remove valid collaborators.
- Presentation route tests still return the same response contracts for collaborator management.
- Auth profile resolution still supports Supabase JWT verification.
- Test auth bypass still requires `API_ENABLE_TEST_AUTH_BYPASS=true`.
- Test auth bypass is still rejected in production.
- List role and capability mapping stays stable for owners, collaborators, and guests.
- List CRUD, section, item, movement, and reset-checked flows preserve existing behavior when migrated.

Acceptance criteria:

- The first migration PR introduces the clean layer structure and migrates list sharing without changing public API behavior.
- No domain module imports Express, `pg`, Supabase, environment config, or `shared/src` response DTOs.
- No application use case imports Express, `pg`, or Supabase.
- Routes/controllers for migrated slices are thin adapters.
- Existing `npm run test:api` passes after each migration phase.
- Existing `npm run typecheck` passes after each migration phase.
- New unit tests cover migrated domain policies and application use cases.
- The Expo app does not require any code changes for the architecture migration.

Regression risks:

- HTTP status codes may change accidentally when domain/application errors are introduced.
- `404` versus `403` behavior for inaccessible lists may drift from current tests.
- Transaction boundaries may move incorrectly and cause partial writes.
- Concurrent item/section position behavior may regress if locking or transaction behavior changes.
- Current authenticated and unauthenticated list behavior may diverge during migration.
- Shared DTO mapping may accidentally rename or omit fields consumed by the Expo app.
- Test auth bypass may become less isolated if auth logic is split carelessly.
- Over-abstracting early may increase complexity without improving testability.

Required automated tests:

- Domain unit tests for list sharing policy and list capability rules.
- Application unit tests for list sharing use cases with fake repositories.
- Infrastructure integration tests or existing route tests proving Postgres sharing behavior.
- Presentation route tests proving unchanged HTTP behavior.
- Auth application/infrastructure tests after auth is split.
- Full API regression tests with `npm run test:api`.
- Type checking with `npm run typecheck`.

Required manual QA:

- None required for the first architecture-only slices if API and e2e contracts remain unchanged.
- Run the existing app manually only if a migrated route changes request/response mapping or if e2e tests indicate a possible app-facing regression.

## Out of Scope

- Replacing Express.
- Replacing Postgres.
- Moving API data access to Supabase Row Level Security.
- Replacing Supabase Auth.
- Adding GraphQL.
- Adding a dependency injection framework.
- Changing public API routes.
- Changing Expo app UI or navigation.
- Changing list sharing product behavior.
- Changing collaborator limits.
- Changing guest mode behavior.
- Changing authentication UX.
- Adding real-time collaboration.
- Adding offline sync conflict resolution.
- Rewriting the entire API in one PR.
- Building a generic enterprise framework around the current API.
- Moving `shared/src` into the domain layer.
- Creating repository interfaces for code that has not started migration.
