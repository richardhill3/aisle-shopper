# Clean Architecture Implementation Issues

Generated from `features/cleanarch-PRD.md` after reviewing the current Express API modules in `api/src`, shared API contracts in `shared/src/index.ts`, existing API tests in `api/tests`, and the completed auth/sharing backlog in `features/auth-Issues.md`.

# Issue 1: Add Clean Architecture Boundary Skeleton and Guardrails

## Status

Done

## Commit

324ca6b - chore: add clean architecture guardrails

## Type

AFK

## Goal

Create the minimum clean-layer structure and conventions needed for vertical migration without changing current API behavior.

## Scope

- Add `api/src/domain`, `api/src/application`, `api/src/infrastructure`, `api/src/presentation`, and `api/src/main` folders with initial README or index placeholders only where needed.
- Add small shared domain/application error primitives that do not import Express, `pg`, Supabase, config, or shared HTTP DTOs.
- Add architecture notes to `api/README.md` describing allowed dependency directions and where new code should live.
- Add a lightweight import-boundary test or static check that proves domain/application modules do not import forbidden outer-layer dependencies.
- Leave existing `api/src/routes.ts`, `api/src/listsRepository.ts`, `api/src/auth.ts`, and `api/src/profilesRepository.ts` behavior intact.

## Acceptance Criteria

- New layer folders exist and compile.
- Documentation clearly states dependency direction and layer responsibilities.
- A failing import-boundary example would be caught by an automated test or check.
- Existing API routes and response contracts are unchanged.

## Testing Requirements

- Add or update API tests for layer-boundary enforcement.
- Run `npm run test:api` and `npm run typecheck`.

## Blocked By

[]

## Notes

Keep this intentionally small. This issue should not move all existing code or create broad repository interfaces before a migrated use case needs them.

# Issue 2: Extract List Sharing Domain Policy

## Status

Done

## Commit

8c3ddde - feat: extract list sharing domain policy

## Type

AFK

## Goal

Move list-sharing business rules into pure domain code that can be tested without Express, Postgres, Supabase, or HTTP fixtures.

## Scope

- Add domain list/profile/auth types needed by sharing rules, such as list access role, collaborator profile, and current actor identity.
- Add a `ListSharingPolicy` or equivalent pure functions for:
  - owners can manage sharing.
  - collaborators and guests cannot manage sharing.
  - owners cannot add themselves as collaborators.
  - duplicate collaborators are rejected.
  - a list can have at most 5 collaborators.
  - unknown target profiles are rejected by the application layer using a domain-safe error.
- Add domain errors for forbidden, not found, conflict/invalid sharing cases without HTTP status codes.
- Do not import `shared/src`, Express, `pg`, Supabase, or environment config from domain code.

## Acceptance Criteria

- Sharing rules can be tested by constructing plain TypeScript objects.
- Domain errors are framework-free and specific enough for presentation mapping later.
- Current runtime sharing routes still use legacy code until the application slice is wired.

## Testing Requirements

- Add domain unit tests for every sharing rule in the PRD.
- Add an import-boundary assertion covering new domain files.
- Run `npm run test:api` and `npm run typecheck`.

## Blocked By

[1]

## Notes

This is a pure extraction issue. Do not touch SQL or route wiring except for test setup if required.

# Issue 3: Add List Sharing Use Cases with Fake Repository Tests

## Status

Done

## Commit

a7682ce - feat: add list sharing use cases

## Type

AFK

## Goal

Introduce application-level list-sharing use cases that coordinate domain policy through interfaces instead of direct SQL repository calls.

## Scope

- Add application use cases for `listMembers`, `addListMember`, and `removeListMember`.
- Define narrow application/domain-facing ports for list access lookup, member lookup, profile lookup by normalized email, member persistence, and transaction execution if needed.
- Enforce owner-only authorization in the use cases using the domain sharing policy.
- Keep use-case outputs domain/application shaped, not shared HTTP DTOs.
- Cover unknown email, owner self-add, duplicate member, over-limit, collaborator forbidden, guest unauthorized, and successful add/remove/list.

## Acceptance Criteria

- Sharing use cases can run against in-memory fake repositories in unit tests.
- Use cases do not import Express, SQL strings, `pg`, Supabase, or shared HTTP response DTOs.
- Rule behavior matches existing API behavior before presentation mapping.

## Testing Requirements

- Add application unit tests with fake repositories for all sharing success and failure paths.
- Add import-boundary tests for application files.
- Run `npm run test:api` and `npm run typecheck`.

## Blocked By

[2]

## Notes

Do not wire Express routes yet unless the infrastructure adapter also exists. This issue proves the application seam independently.

# Issue 4: Implement Postgres Adapters for List Sharing

## Status

Done

## Commit

a3e9e9b - feat: add postgres list sharing adapter

## Type

AFK

## Goal

Move Postgres-specific list-sharing persistence behind infrastructure adapters while preserving current schema and transaction behavior.

## Scope

- Add `PostgresListSharingRepository` or equivalent under `api/src/infrastructure/postgres`.
- Move only the SQL needed for member listing, owner access lookup, collaborator lookup/count, profile lookup by email, add member, and remove member.
- Reuse existing `pool`, `transaction`, and `oneOrNull` behavior, either by wrapping `api/src/db.ts` or placing an infrastructure facade around it.
- Preserve email normalization expectations and existing `list_memberships` schema.
- Keep legacy repository exports in place until route wiring switches over.

## Acceptance Criteria

- Infrastructure adapter implements the ports introduced for sharing use cases.
- SQL and row mapping are isolated outside domain/application.
- Transaction boundaries for adding a collaborator still prevent partial writes.
- No schema changes are required.

## Testing Requirements

- Add focused infrastructure integration coverage where useful, or extend existing route/API setup to exercise the adapter through a thin test harness.
- Keep existing list sharing API tests passing.
- Run `npm run test:api` and `npm run typecheck`.

## Blocked By

[3]

## Notes

This is infrastructure-only but still attached to the sharing vertical slice. Avoid migrating unrelated list CRUD SQL in this issue.

# Issue 5: Route List Sharing Through Presentation Controllers and Use Cases

## Status

Done

## Commit

9a92ecb - feat: route list sharing through use cases

## Type

AFK

## Goal

Complete the pilot vertical slice by making `/lists/:listId/members` routes call clean application use cases while preserving public API behavior.

## Scope

- Add presentation controller functions for:
  - `GET /api/v1/lists/:listId/members`
  - `POST /api/v1/lists/:listId/members`
  - `DELETE /api/v1/lists/:listId/members/:profileId`
- Add DTO mappers for member responses using existing shared contract shapes.
- Add an error mapper from domain/application errors to the current API error response shapes and status codes.
- Add a small composition module that wires sharing controllers to use cases and Postgres adapters.
- Update route registration so migrated member routes use the new controller path.
- Keep response bodies and statuses stable, including `400`, `401`, `403`, `404`, `201`, and `204`.

## Acceptance Criteria

- List-sharing routes no longer call sharing functions in `api/src/listsRepository.ts`.
- Public request/response contracts for member routes are unchanged.
- Error responses match existing route tests.
- Legacy sharing functions are unused by routes and can be removed in a later cleanup issue.

## Testing Requirements

- Add or update presentation/API tests for successful add/list/remove collaborators.
- Add route tests for unknown email, duplicate member, owner-as-member, over-limit, collaborator forbidden, unrelated forbidden, unauthenticated rejection, and missing list behavior.
- Run `npm run test:api` and `npm run typecheck`.

## Blocked By

[4]

## Notes

This is the first true tracer bullet: domain policy, application use case, Postgres adapter, presentation controller, composition, and regression tests all meet in one migrated feature.

# Issue 6: Remove Legacy Sharing Code from Lists Repository

## Status

Done

## Commit

59dd13e - refactor: remove legacy list sharing repository code

## Type

AFK

## Goal

Delete the list-sharing responsibilities left behind in `api/src/listsRepository.ts` after the clean sharing slice is live.

## Scope

- Remove legacy `listMembers`, `addListMember`, `removeListMember`, sharing row mappers, and sharing-only SQL from `api/src/listsRepository.ts`.
- Keep non-sharing list behavior unchanged.
- Update imports so routes/controllers only reference the clean sharing path.
- Confirm no duplicated sharing rules remain in the repository.

## Acceptance Criteria

- Sharing rules exist only in domain/application code.
- Sharing SQL exists only in infrastructure adapters.
- `api/src/listsRepository.ts` no longer owns member-management behavior.
- All API sharing tests still pass.

## Testing Requirements

- Run `npm run test:api` and `npm run typecheck`.
- Use `rg` or equivalent to verify removed legacy exports are not referenced.

## Blocked By

[5]

## Notes

This is a cleanup issue intentionally separated from the route migration to keep the pilot PR reviewable.

# Issue 7: Migrate Current Profile Resolution and `/me` Use Cases

## Status

Done

## Commit

bce8d9e - feat: migrate profile use cases

## Type

AFK

## Goal

Separate profile application behavior from Postgres persistence and keep `/me` API behavior unchanged.

## Scope

- Add profile domain types and a `ProfileRepository` port.
- Add application use cases for `getCurrentProfile`, `updateCurrentProfile`, and profile upsert/resolution from a verified identity.
- Implement a Postgres profile repository under infrastructure.
- Move profile SQL out of `api/src/profilesRepository.ts` into infrastructure.
- Add presentation controller functions for `GET /me` and `PATCH /me`.
- Preserve display-name validation and current shared profile DTO shape.

## Acceptance Criteria

- `/api/v1/me` still returns the same profile fields.
- `PATCH /api/v1/me` still supports setting display name to a trimmed string or `null`.
- Unauthenticated `/me` requests still return `401`.
- Application profile use cases do not import Express, `pg`, Supabase, or shared DTOs.

## Testing Requirements

- Add application unit tests for current-profile fetch/update using fake repositories.
- Keep API profile route tests passing.
- Run `npm run test:api` and `npm run typecheck`.

## Blocked By

[1]

## Notes

This can run after the boundary skeleton without waiting for the list-sharing pilot, as long as it does not alter shared auth behavior.

# Issue 8: Split Auth Verification from Express Middleware

## Status

Done

## Commit

f7153fa - feat: split auth verification use case

## Type

AFK

## Goal

Move Supabase JWT verification and deterministic test identity resolution behind clean interfaces while keeping Express middleware as a thin adapter.

## Scope

- Add auth domain/application types for verified identity and current profile.
- Add an `AuthVerifier` port and application use case that resolves the current profile from a request-independent auth credential.
- Implement `SupabaseAuthVerifier` in infrastructure using the existing Supabase `getClaims` behavior and issuer validation.
- Preserve deterministic test auth bypass behavior exactly, including `API_ENABLE_TEST_AUTH_BYPASS=true` and production rejection.
- Keep Express middleware responsible only for reading headers, calling the auth/profile use case, and attaching `request.currentProfile`.

## Acceptance Criteria

- Supabase-specific client setup is outside `api/src/auth.ts` presentation middleware.
- Test auth bypass remains disabled unless explicitly configured and remains rejected in production.
- Invalid bearer headers and invalid tokens keep current `401` behavior.
- Auth application code does not import Express, Supabase client APIs, `pg`, or HTTP response DTOs.

## Testing Requirements

- Add unit tests for auth verifier/application behavior with mocked verifier/profile repository.
- Keep or update `api/tests/auth.test.ts` for production bypass rejection, disabled bypass rejection, invalid header behavior, and Supabase JWT behavior.
- Run `npm run test:api` and `npm run typecheck`.

## Blocked By

[7]

## Notes

Profile resolution and auth verification are coupled today in `api/src/auth.ts`; migrate them together only where necessary to preserve behavior.

# Issue 9: Migrate List Summary and Detail Read Use Cases

## Status

Done

## Commit

4553a10 - feat: migrate list read use cases

## Type

AFK

## Goal

Move list summary/detail read behavior, role calculation, and capability mapping into clean domain/application code without changing API contracts.

## Scope

- Add domain helpers for list role and capability calculation for owners, collaborators, and guests.
- Add application use cases for `listSummaries`, recent list summaries, and `getList`.
- Add Postgres adapter methods for summary/detail loading and membership-aware access queries.
- Add presentation DTO mappers that convert domain/application list outputs into existing shared `ShoppingList` and `ShoppingListSummary` shapes.
- Preserve unauthenticated transitional list behavior.

## Acceptance Criteria

- Owner, collaborator, and guest role/capability mapping stays stable.
- `GET /api/v1/lists`, `/lists/recent`, and `/lists/:listId` responses are unchanged.
- Domain/application tests cover role and capability rules without database setup.
- Existing API tests for list reads still pass.

## Testing Requirements

- Add domain unit tests for capability mapping.
- Add application unit tests for summary/detail use cases using fake repositories.
- Add or update API route tests for owner, collaborator, unrelated user, and guest list read behavior.
- Run `npm run test:api` and `npm run typecheck`.

## Blocked By

[5]

## Notes

This issue creates the clean read model before mutating list structure. It should not migrate item/section writes yet.

# Issue 10: Migrate List Create, Rename, and Delete Use Cases

## Status

Done

## Commit

bfe342d - feat: migrate list write use cases

## Type

AFK

## Goal

Move top-level list write behavior into application use cases while preserving owner/collaborator permissions and guest compatibility.

## Scope

- Add use cases for `createList`, `updateList`, and `deleteList`.
- Add an ID generator port with a Node `randomUUID` infrastructure implementation.
- Move top-level list SQL for create/rename/delete into Postgres adapters.
- Keep delete owner-only for authenticated lists and keep collaborator delete rejection hidden/denied consistently with current behavior.
- Preserve shared response DTOs through presentation mappers.

## Acceptance Criteria

- Authenticated owners can create, rename, and delete owned lists.
- Collaborators can rename shared lists but cannot delete them.
- Unrelated users cannot mutate lists.
- Guest transitional create/rename/delete behavior remains unchanged.
- Routes no longer call legacy repository functions for migrated top-level list writes.

## Testing Requirements

- Add application unit tests with fake repositories for create, rename, delete, owner/collaborator/unrelated/guest cases.
- Add or update API tests for top-level list write routes.
- Run `npm run test:api` and `npm run typecheck`.

## Blocked By

[9]

## Notes

Keep list delete behavior carefully aligned with existing `404` versus `403` expectations from the current tests.

# Issue 11: Migrate Section Use Cases with Transaction-Safe Positioning

## Status

Done

## Commit

306d0fc - feat: migrate section use cases

## Type

AFK

## Goal

Move section add, rename, delete, and move behavior into clean use cases while preserving ordering, locking, and response behavior.

## Scope

- Add use cases for `addSection`, `updateSection`, `deleteSection`, and `moveSection`.
- Add Postgres adapter methods for section mutations, list/section locking, next-position calculation, reindexing, and list touch behavior.
- Keep transaction boundaries around multi-step section mutations.
- Keep presentation route parsing and direction validation in the HTTP layer.
- Preserve current no-op behavior when moving a section past the first or last position.

## Acceptance Criteria

- Section routes return unchanged `ShoppingList` response bodies.
- Section positions remain stable and reindexed after delete.
- Concurrent-position safety is no worse than current locking behavior.
- Collaborators retain edit permission, unrelated users do not.

## Testing Requirements

- Add application unit tests for section add/update/delete/move paths.
- Add or update API tests for ordering and permissions on representative section routes.
- Run `npm run test:api` and `npm run typecheck`.

## Blocked By

[9]

## Notes

This issue should keep SQL in infrastructure and not introduce generic ordering abstractions beyond sections/items needs.

# Issue 12: Migrate Item and Shopping-State Use Cases

## Status

Done

## Commit

664bc21 - feat: migrate item use cases

## Type

AFK

## Goal

Move item add, update, delete, and reset-checked behavior into clean use cases while preserving shopping behavior.

## Scope

- Add use cases for `addItem`, `updateItem`, `deleteItem`, and `resetCheckedItems`.
- Add Postgres adapter methods for item mutation, section/list locking, item reindexing, section/list touch behavior, and checked-state reset.
- Keep HTTP validation for required item name, optional item name, and boolean checked values in presentation.
- Preserve existing checked-state and response DTO behavior for owners, collaborators, and guests.

## Acceptance Criteria

- Item routes return unchanged `ShoppingList` response bodies.
- Updating item name, checked state, or both preserves current behavior.
- Reset checked clears all items in a list and updates timestamps as before.
- Collaborators retain shop/edit permission, unrelated users do not.

## Testing Requirements

- Add application unit tests for item add/update/delete/reset behavior.
- Add or update API tests for representative item permissions, missing item/section behavior, and reset checked.
- Run `npm run test:api` and `npm run typecheck`.

## Blocked By

[9]

## Notes

This can run in parallel with section migration if adapter write areas are kept separate and route wiring is coordinated carefully.

# Issue 13: Consolidate Presentation Routes and Composition Root

## Status

Done

## Commit

f263b94 - refactor: consolidate api composition

## Type

AFK

## Goal

Turn Express routes into thin presentation adapters and add a clear composition root for wiring use cases to infrastructure implementations.

## Scope

- Move route handlers from `api/src/routes.ts` into controller modules under `api/src/presentation/http/controllers`.
- Keep request validation, route params, query params, status codes, and DTO mapping in presentation.
- Add `api/src/main/container.ts` for constructing repositories, gateways, ID generators, use cases, and controllers.
- Add `api/src/main/app.ts` and optionally `api/src/main/server.ts`, while keeping existing `api/src/app.ts` and `api/src/server.ts` as compatibility entrypoints if needed.
- Keep `createApp()` responsible for Express setup, middleware, route mounting, and error handling.

## Acceptance Criteria

- Routes/controllers are thin and contain no SQL, Supabase verification, or domain rule implementations.
- Composition is explicit and hand-written; no DI framework is introduced.
- Existing scripts `npm run api:dev`, `npm run api:build`, and tests continue to use working entrypoints.
- Existing `/api/v1` routes and `/health` behavior are unchanged.

## Testing Requirements

- Keep full API route test suite passing.
- Run `npm run api:build`, `npm run test:api`, and `npm run typecheck`.

## Blocked By

[5, 7, 8, 9, 10, 11, 12]

## Notes

This issue is mostly consolidation after enough slices have proven the pattern. Do not make it the first PR.

# Issue 14: Retire Legacy Repository-Service Modules

## Type

AFK

## Goal

Remove or split legacy repository-service exports after migrated use cases fully cover list, sharing, profile, and auth behavior.

## Scope

- Delete remaining application/business logic from `api/src/listsRepository.ts` and `api/src/profilesRepository.ts`.
- Move any reusable Postgres helpers to infrastructure modules with narrower names.
- Keep compatibility wrappers only if existing entrypoints still need them during a transition, and document their removal path.
- Use `rg` to verify routes no longer import legacy repository functions.
- Confirm no domain/application code imports infrastructure or presentation modules.

## Acceptance Criteria

- Legacy repository-service modules are removed or reduced to infrastructure-only compatibility shims.
- All migrated route behavior flows through presentation -> application -> domain/infrastructure.
- No duplicated business rules remain in legacy modules.
- Full API regression tests pass.

## Testing Requirements

- Run `npm run test:api`, `npm run typecheck`, and `npm run api:build`.
- Run `npm run test` if shared contract or app-facing DTO mapping changes during cleanup.

## Blocked By

[13]

## Notes

This cleanup should happen only after route usage has fully moved. Avoid combining it with new behavior.

# Issue 15: Add Clean Architecture Regression Documentation

## Type

Human-in-the-Loop

## Goal

Document the migrated backend architecture so future feature work follows the new boundaries instead of re-growing legacy coupling.

## Scope

- Update `api/README.md` with concrete examples of where to add a new domain rule, use case, Postgres query, controller, and DTO mapper.
- Optionally update root `AGENTS.md` with backend layer rules after the migration pattern is proven.
- Document test expectations for domain unit tests, application fake-repository tests, infrastructure/route tests, and full API regressions.
- Include guidance for preserving shared API contracts in `shared/src/index.ts`.

## Acceptance Criteria

- A developer can place new backend behavior in the right layer by reading the docs.
- Documentation names the actual modules created during migration, not only theoretical target folders.
- Guardrails explain that `shared/src` is an external API contract boundary, not a domain model.
- Human review confirms the guidance is clear enough for future issue work.

## Testing Requirements

- No automated tests required beyond any documentation linting already present.
- Run `npm run typecheck` if examples include checked code snippets.

## Blocked By

[13]

## Notes

This is human-in-the-loop because the docs should reflect the final shape that actually emerged from implementation, not just the PRD's initial proposal.

# Final Review

- The first implementation feedback loop is the list-sharing pilot: Issues 2-5 create a complete domain + application + infrastructure + presentation + test slice before broader migration.
- Horizontal-only work is limited to the smallest necessary guardrail setup in Issue 1 and late consolidation in Issues 13-15.
- Parallel work is possible after Issue 1: sharing policy/use cases can proceed first, while profile/auth migration can start independently once the boundary skeleton exists.
- High-risk behavior is covered early: sharing rules, `401`/`403`/`404` mapping, test auth bypass, role/capability mapping, and transaction-sensitive position changes all have explicit tests.
- The backlog avoids a full rewrite. Existing route behavior stays in place until each vertical slice has clean use cases, adapters, presentation mapping, and regression coverage.
