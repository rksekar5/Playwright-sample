# Design

## Context

See [proposal.md](proposal.md) for motivation and scope. Inspection found an empty initial commit, no application packages, no lockfile, and no existing specifications. `main` now points to that initial commit; this change is proposed on `codex/bootstrap-testing-lab`.

The cloud machine provides Node.js 24.19.0 and npm 11.9.0. OpenSpec 1.14.1 was installed outside the checkout and initialized with `--tools codex --profile core`; Codex's generated `openspec-propose` skill is the planning workflow. These are observed tooling facts, not application validation. No TaskBoard has been implemented or run.

## Goals / Non-Goals

**Goals:** Two small packages, explicit HTTP contracts, directly observable UI states, and a deterministic baseline that later test changes can exercise. Build and startup commands must propagate errors and work without credentials in Codex Cloud.

**Non-Goals:** Shared domain frameworks, repository/service abstraction layers, generated API clients, optimistic updates, persistent data, and a production hosting model. Future testing tools are architectural consumers of this foundation, not dependencies to add during bootstrap.

## Decisions

### 1. Two npm workspaces on Node.js 24 LTS

Use `packages/frontend` (React + Vite) and `packages/backend` (Express), with strict TypeScript settings, a root `.nvmrc`, `engines`, npm scripts, and one root lockfile. Node 24 is a maintained LTS already present in the cloud environment; it avoids replacing a compatible runtime just to choose Node 22. npm workspaces are sufficient; Nx/Turborepo would add orchestration without a need for it.

Planned structure, not files implemented in this PR:

```text
config/                  # shared, typed runtime settings definition
packages/backend/src/    # app factory, entry point, task routes/store, validation/errors
packages/frontend/src/   # board, forms/cards, small fetch wrapper
openspec/                # approved specs and in-flight planning artifacts
.github/workflows/       # foundation install/typecheck/build job after approval
.env.example             # non-secret runtime settings
package.json             # npm workspaces and root commands
package-lock.json
```

Use React state and the platform fetch API rather than adding a state manager or data-fetching framework. Use plain validation functions rather than a schema dependency for this small contract. Keep the Express application factory separate from the listening entry point for later testing; routes can call a simple store directly.

### 2. A deliberately small task contract

The authoritative behavior is in [task-api/spec.md](specs/task-api/spec.md). A task has only `id`, `title`, and `status`; no timestamps or generated randomness. IDs are decimal strings allocated sequentially from 1. The store starts empty, lists in creation order, retains IDs on updates, and never reuses deleted IDs until reset/restart. Duplicate titles are allowed.

| Method | Route | Input | Successful response |
| --- | --- | --- | --- |
| GET | `/api/tasks` and `/api/tasks/` | None | 200 `{ "tasks": Task[] }` |
| POST | `/api/tasks` | `{ "title": string, "status"?: Status }` | 201 `{ "task": Task }` |
| PATCH | `/api/tasks/:id` | `{ "title"?: string, "status"?: Status }`, at least one | 200 `{ "task": Task }` |
| DELETE | `/api/tasks/:id` | None | 204, no body |
| GET | `/health` | None | 200 `{ "status": "ok" }` |
| POST | `/api/test/reset` | No body; only `NODE_ENV=test` | 204, no body |

`Status` is `todo | in_progress | done`. Titles are trimmed, then limited to 1–200 JavaScript string-length units (UTF-16 code units); the frontend uses the same rule. All status transitions are allowed. The trailing slash in the supplied GET path is treated as a collection alias; PATCH/DELETE use an ID segment because they act on one task. Do not add GET-by-ID, pagination, or filtering in this change.

### 3. Validate first, then mutate atomically

Reject unknown fields instead of silently accepting typos or client-controlled IDs. Validate all patch fields before mutating, preventing partial edits. Determine a missing/empty body before checking its content type; for a present body, reject non-JSON content types, enforce a 16 KiB limit, parse JSON, check object shape/allowed keys, then validate field values and item identity/existence. Existing-item checks use a canonical positive decimal ID. These rules make negative examples predictable without a validation framework.

| Status | Error code | Meaning |
| --- | --- | --- |
| 400 | `invalid_request` | Missing/incorrect object body, unknown keys, empty patch, malformed ID, or reset with a body |
| 400 | `invalid_json` | Malformed JSON |
| 400 | `invalid_title` | Missing required or invalid title; `field: "title"` |
| 400 | `invalid_status` | Supplied status outside the enum; `field: "status"` |
| 404 | `not_found` | Missing task, unknown API route, or disabled reset route |
| 413 | `payload_too_large` | Body exceeds 16 KiB |
| 415 | `unsupported_media_type` | Present create/update body is not JSON |
| 500 | `internal_error` | Unexpected exception; generic public message |

Return a consistent `{ "error": { "code", "message", "field"? } }` envelope with JSON content type. Normalize Express JSON-parser errors so HTML/stack-trace responses do not escape to clients. For multiple invalid fields, return the first error in the documented validation order (title before status); clients rely on codes, not exact message wording. Log unexpected exceptions server-side. Do not add endpoints for provoking failures.

### 4. Test reset is a mode-gated development facility

Mount `POST /api/test/reset` only in `NODE_ENV=test`, ahead of general mutation parsing; it checks that there is no nonempty body, empties the store, and resets ID allocation to 1. Outside test mode, respond with the usual 404 before parsing any reset body, preserving the disabled-route contract. Reset is idempotent, synchronous, and unauthenticated as required by the MVP. A database or seeded fixture framework is unnecessary; future fixtures can reset and create their own data.

This endpoint is not in the UI. Test mode must not be exposed to an untrusted network as a deployed service. Later deterministic suites should use one worker per shared store initially, or separate API processes/ports per worker; serial reset calls alone cannot isolate concurrent tests. MCP exploration uses its own instance or explicitly separate sessions and never controls regression fixtures.

### 5. Accessible UI with confirmed state

The UI contract is in [taskboard-ui/spec.md](specs/taskboard-ui/spec.md). Use a heading and named region for each status, semantic buttons/forms, labelled inputs/selects, and an article/region named `Task <id>` for each card. Scope identical per-card control names inside that container; do not make test selectors depend on mutable titles or CSS.

Use a small fetch wrapper that parses JSON success/error envelopes, recognizes 204 without parsing a body, and turns transport/unexpected-response failures into readable messages. On successful mutation use the returned task or confirmed deletion; on failure keep the prior server-confirmed board state and preserve drafts. Disable duplicate create submissions and conflicting card actions while their request is pending. Handle initial loading, refresh, empty sections, and errors separately. Field errors use `aria-invalid` and `aria-describedby`; general errors use `role="alert"`. A refresh reconciles ambiguous network outcomes, since a lost response does not guarantee the server rejected a mutation.

Optimistic updates were considered but add rollback complexity that obscures educational examples. Drag-and-drop is also unnecessary; a status select is simpler and keyboard accessible.

### 6. Central settings and cloud startup

One typed configuration definition owns settings/defaults and is consumed by the API entry point and Vite configuration. Load an optional root `.env` without overwriting injected process variables; provide a root `.env.example`. Reject invalid integer ports and invalid host configuration before listening. Keep source paths relative to the repo rather than hard-coding `/workspace` in application code.

| Setting | Default | Purpose |
| --- | --- | --- |
| `APP_HOST` | `0.0.0.0` | Cloud-compatible service binding |
| `API_PORT` | `3001` | Backend listener and Vite proxy target |
| `UI_PORT` | `5173` | Vite listener with strict port selection |
| `NODE_ENV` | `development` | Exact `test` value enables reset |

The browser calls relative `/api` URLs. Vite proxies them to `http://127.0.0.1:<API_PORT>`; this avoids a CORS dependency and keeps ports out of browser code. Root `npm run dev` uses `concurrently` to run the two workspace dev commands with child shutdown and failure propagation; backend development uses `tsx`, frontend uses Vite with `strictPort`. Explicit CLI switches and smoke checks must verify the chosen process behavior rather than assuming it. No service, credentials, or application internet access is required after installing packages.

Use `npm run typecheck` and `npm run build` to execute the command in both workspaces and propagate failures. The frontend build emits static assets; the backend build emits runnable JavaScript. Production serving/deployment is deferred; build output is verified for development readiness, not advertised as a deployed full-stack site.

### 7. Incremental validation and CI

Bootstrap acceptance uses frozen installation, type checks, builds, and documented manual HTTP/browser checks: list empty tasks, create with trimming, rename, move status, delete, invalid title/body/status, missing ID, health, reset twice in test mode, and disabled reset in normal mode. Exercise the same workflow with overridden ports and verify shutdown. These checks validate the foundation without introducing a partial Playwright suite under the wrong change name.

After implementation, a GitHub Actions workflow runs on PRs to `main` and pushes to `main`, using read-only repository permissions, Node 24, npm's root-lockfile cache, `npm ci`, typecheck, and build. Pin third-party actions to full commit SHAs selected from their official releases when implementation occurs. Later API/UI changes add their own test jobs/results. This proposal PR adds no CI workflow and claims no application test coverage.

## Risks / Trade-offs

- In-memory data disappears on restart → document the empty baseline and avoid persistence claims.
- A shared reset endpoint can race with other clients → gate by test mode and use isolated instances or serial suites.
- Binding to all interfaces exposes a test-mode reset locally → use only isolated development machines; do not deploy test mode.
- Separate contract types can drift across two small packages → document one contract and introduce contract-oriented API tests in the next change; no third shared package yet.
- A network failure can hide a successful mutation → preserve visible confirmed state and offer refresh before retrying uncertain actions.
- Built-in system Chromium differs from Playwright-pinned browsers → future UI testing installs the lockfile-selected browser and resolves download-domain access; the earlier baseline browser check is not app coverage.
- GitHub API network policy can prevent PR operations → allow `api.github.com` for the required GitHub CLI operations; Git authentication remains platform-provided. Draft PR creation succeeded during proposal preparation.

## Migration Plan

This is a greenfield proposal with no data migration. First review this planning-only PR. Only after approval and a separate apply request, execute the unchecked tasks, demonstrate acceptance, and archive the implemented change to promote delta specifications into `openspec/specs/`. Rollback consists of reverting the implementation commits and stopping its processes; there is no durable data to preserve.
