# PLAN — mia-users-management

## Context

Plugin CRUD to manage MIA users and their tokens.

**Users**
- Create, read, update, delete users via Container key **`auth-db`** (`AuthDatabase` from package `mia`).
- Username is **immutable** (never updated).
- Updatable fields: password, admin flag (and any other non-name fields exposed by AuthDatabase).

**Tokens**
- Read and delete only (no create, no update).
- A user may only list/delete **their own** tokens, unless they are **admin** (admins may list/delete any user’s tokens).

**Front visibility**
- Hidden if current user is **not admin**: add user, edit user, delete user, read another user’s tokens, delete another user’s tokens.
- Hidden if current user is **not the concerned user** (and not covered by admin rules above): edit self, delete self, read own tokens, delete own tokens — i.e. self-actions only when identity matches; admin-only actions only for admins.

**No Server events** expected for this scope (Mediator only unless later required).

## Steps

### a) OpenAPI — ~2h

Update `lib/data/Descriptor.json`:

- Users: list, get by name, create (`put`), update (`post`, **no name change**), delete.
- Tokens: list by user, delete by token value in **body** (never in path/query).
- Auth/permission rules reflected in operation descriptions (Mediator enforces them).
- Schemas: reuse `User` component where shared; one-off payloads/objects declared **inline** (no single-use components).
- Follow put/201, get/post/delete 200|204 conventions; Error schema via `default`.

### b) Back-office — ~3h

- `npm run transpile-openapi-back`.
- Resolve `auth-db` from Container in `_initWorkSpace`.
- Implement Mediator operations against `AuthDatabase` (`getUsers`, `getUserByName`, `addUser`, `editUserPassword`, `editUserIsAdmin`, `removeUser`, `getTokensByUserName`, `removeToken`).
- Do **not** validate request parameters (host / Server) and do **not** re-implement host authentication.
- **Do** enforce this plugin’s authorization rules: create user = admin; update/delete user = self or admin (`isAdmin` change = admin only); list/delete tokens = self/owner or admin.
- `npm run lint-back` then `npm run build-back`.

### c) Unit tests — ~3h

- Mocha under `test/` (numeric prefixes) covering Mediator: CRUD users, token list/delete, and authorization matrix (self vs admin vs other). No OpenAPI param-validation / host-auth tests.
- Mediator coverage ≥ 95% via `npm run unit-tests-local`.
- `npm run build-back` then `npm run unit-tests` (**blocking** before front).

### d) Front SDK — ~1.5h

- `npm run transpile-openapi-front`.
- Expose user/token operations on `public/src/SDK.ts` with Descriptor types.
- `npm run lint-front` (SDK scope).

### e) Front components — ~3h

- React/Bootstrap/Fontawesome UI under `public/src/components/`: user list, create/edit/delete (gated), token list/delete (gated by self/admin).
- Hide controls per rules in Context.
- Coherent workflow; `npm run lint-front` then `npm run build-front`.

### f) README — ~0.5h

- Preserve template prefix (title, Badges, OpenAPI link to `./lib/data/Descriptor.json`).
- Short user-facing purpose + workflows (admin vs self); **no** technical implementation details.

### g) Review — ~1h

- Quality/security pass, OpenAPI ↔ back ↔ tests ↔ front ↔ README consistency.
- Optional Snyk/Sonar; `npm run tests` green.

## Step status

- [x] a) OpenAPI
- [x] b) Back-office
- [x] c) Unit tests
- [x] d) Front SDK
- [x] e) Front components
- [ ] f) README
- [ ] g) Review
