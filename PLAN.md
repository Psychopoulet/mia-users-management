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

**Server / push events** (this maintain batch)

Live events after successful user create/delete (template envelope `{ id, plugin, command, data? }`):

| Command | Schema | `data` |
| --- | --- | --- |
| `"user.added"` | `PushEventUserAdded` | existing reusable `User` (name, isAdmin, createdAt) |
| `"user.removed"` | `PushEventUserRemoved` | same `User` snapshot taken **before** delete (so the UI still has `name` / identity) |

Both `data` payloads **reuse** `#/components/schemas/User` (no one-off user-lite schema). `command` enums are exactly `"user.added"` and `"user.removed"`.

Planned surface (do not invent extra APIs):

- `lib/data/DescriptorEvents.json` — new schemas; `$ref` `User` from `Descriptor.json` like `Error` / `PluginName`.
- `lib/data/Descriptor.json` — `$ref` the new schemas in `components.schemas` like the other `PushEvent*`.
- Mediator — emit after successful `addUser` / `removeUser` (same event names as `command`).
- Server — `on` / `off` in `_initWorkSpace` / `_releaseWorkSpace`, then `this.push(command, data)`.
- SDK — extend `tEvents`, EventEmitter types, and `onmessage` switch; emit typed events.
- Front — subscribe (primarily `UsersManagement`) to refresh the list and close stale modals.

**This maintain batch:** **mia-openapi** → **mia-back** → **mia-front-sdk** → **mia-front-ui** → **mia-review**. Skip **mia-tests** (step c unchanged). Skip **mia-readme** (live refresh is UX, not a new user-facing workflow).

## Steps

### a) OpenAPI — ~2.5h (~2h existing + ~0.5h events)

Update `lib/data/Descriptor.json`:

- Users: list, get by name, create (`put`), update (`post`, **no name change**), delete.
- Tokens: list by user, delete by token value in **body** (never in path/query).
- Auth/permission rules reflected in operation descriptions (Mediator enforces them).
- Schemas: reuse `User` component where shared; one-off payloads/objects declared **inline** (no single-use components).
- Follow put/201, get/post/delete 200|204 conventions; Error schema via `default`.

**Events delta (this batch):**

- In `lib/data/DescriptorEvents.json`, add `PushEventUserAdded` and `PushEventUserRemoved` matching `PushEventPlugin*` (`id`, `plugin`, `command`, `data`):
  - `command` enum **exactly** `"user.added"` / `"user.removed"`.
  - `data` required, `$ref` `./Descriptor.json#/components/schemas/User` (same User as REST).
  - Required: `id`, `plugin`, `command`, `data`.
- In `lib/data/Descriptor.json` `components.schemas`, `$ref` both new schemas from `DescriptorEvents.json` (same pattern as `PushEventPluginInitialized` / `Released` / `Error`).
- Do **not** change REST paths/operations for this delta.

### b) Back-office — ~4h (~3h existing + ~1h events)

- `npm run transpile-openapi-back`.
- Resolve `auth-db` from Container in `_initWorkSpace`.
- Implement Mediator operations against `AuthDatabase` (`getUsers`, `getUserByName`, `addUser`, `editUserPassword`, `editUserIsAdmin`, `removeUser`, `getTokensByUserName`, `removeToken`).
- Do **not** validate request parameters (host / Server) and do **not** re-implement host authentication.
- **Do** enforce this plugin’s authorization rules: create user = admin; update/delete user = self or admin (`isAdmin` change = admin only); list/delete tokens = self/owner or admin.
- `npm run lint-back` then `npm run build-back`.

**Events delta (this batch):**

- Mediator: after **successful** create, `emit("user.added", user)` with the serialized `User` already returned by `createUser`. After **successful** delete, `emit("user.removed", user)` with a serialized `User` captured **before** `removeUser`. Emit only on success (not on conflict / not-found / auth failure). Event names = command strings.
- Server: in `_initWorkSpace` / `_releaseWorkSpace`, `on` / `off` `"user.added"` and `"user.removed"` (keep existing initialized / released / error). Handlers call `this.push("user.added", data)` and `this.push("user.removed", data)` with typed `data` from the new PushEvent schemas.
- Still no request-parameter validation and no host-auth reimplementation.

### c) Unit tests — ~3h

- Mocha under `test/` (numeric prefixes) covering Mediator: CRUD users, token list/delete, and authorization matrix (self vs admin vs other). No OpenAPI param-validation / host-auth tests.
- Mediator coverage ≥ 95% via `npm run unit-tests-local`.
- `npm run build-back` then `npm run unit-tests` (**blocking** before front).

**This maintain batch: out of scope.** Do **not** add mocha tests for `user.added` / `user.removed`. Leave existing tests as-is; skip **mia-tests**.

### d) Front SDK — ~2h (~1.5h existing + ~0.5h events)

- `npm run transpile-openapi-front`.
- Expose user/token operations on `public/src/SDK.ts` with Descriptor types.
- `npm run lint-front` (SDK scope).

**Events delta (this batch):**

- Extend `tEvents` with `PushEventUserAdded` and `PushEventUserRemoved`.
- Extend EventEmitter generics: `"user.added": [ components["schemas"]["User"] ]` and `"user.removed": [ components["schemas"]["User"] ]`.
- In `onmessage`, handle `command` `"user.added"` / `"user.removed"` and `emit` the typed `data` (keep initialized / released / error).
- Do not invent extra SDK methods beyond parse/emit of these events.

### e) Front components — ~4h (~3h existing + ~1h events)

- React/Bootstrap/Fontawesome UI under `public/src/components/`: user list, create/edit/delete (gated), token list/delete (gated by self/admin).
- Hide controls per rules in Context.
- Coherent workflow; `npm run lint-front` then `npm run build-front`.

**Events delta (this batch):**

- In `UsersManagement` (preferred over `App`): subscribe on mount / unsubscribe on unmount to SDK `"user.added"` and `"user.removed"`.
- On either event: refresh the user list (`_loadUsers` / equivalent).
- On `"user.removed"`: if edit / delete / tokens modal is open for that user (`data.name`), close it so the UI is not left on a stale user.
- Keep existing create/edit/delete REST flows; events are for **other sessions / concurrent** updates as well as the local actor.

### f) README — ~0.5h

- Preserve template prefix (title, Badges, OpenAPI link to `./lib/data/Descriptor.json`).
- Short user-facing purpose + workflows (admin vs self); **no** technical implementation details.

**This maintain batch: skip.** Live list refresh is not a new user-facing workflow; do not mention Server/push internals in README.

### g) Review — ~1h

- Quality/security pass, OpenAPI ↔ back ↔ tests ↔ front ↔ README consistency.
- Optional Snyk/Sonar; `npm run tests` green.

**This maintain batch:** re-run after events. Check DescriptorEvents ↔ Descriptor `$ref`s ↔ Mediator emit ↔ Server `push` ↔ SDK parse/emit ↔ UI subscribe/refresh. Tests/README unchanged for this delta.

## Step status

- [x] a) OpenAPI
- [x] b) Back-office
- [x] c) Unit tests
- [x] d) Front SDK
- [x] e) Front components
- [x] f) README
- [ ] g) Review
