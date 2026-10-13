# Design

## Context

See [proposal.md](proposal.md) for motivation and scope, and [the regression specification](specs/api-regression-testing/spec.md) for acceptance behavior.

Inspection of `main` at `89b9ccf` confirmed two npm workspaces, Node 24, strict TypeScript, shared settings in `config/runtime.ts`, real task routes in `packages/backend/src/app.ts`, and a process-local store. The existing 18 Node tests include small HTTP smoke checks and an injected generic-500 check. `docs/api.md` documents the HTTP contract; the completed but unarchived `bootstrap-testing-lab` change contains its original acceptance scenarios. `openspec/specs/` has no promoted specs yet. Do not archive or modify that change to create this proposal.

There is no Playwright Test dependency, API config, or API suite. The Foundation workflow currently runs frozen installation, Node tests, type checks, and builds on PRs/pushes to `main`; generated reports/results are already ignored. npm identifies Microsoft `@playwright/test` 1.64.0 as the current release, with Node >=20 support, compatible with the project's Node 24. This metadata was checked; the dependency has not been installed in this proposal.

## Goals / Non-Goals

**Goals:** A readable black-box regression suite, explicit status/body assertions, repeatable fixture lifecycles, bounded runner-owned processes, and useful HTML/CI feedback. Keep request construction, response validation, and fixture responsibilities easy to distinguish.

**Non-Goals:** Client-class hierarchies, schema-generation frameworks, Faker/random data, configurable remote targets, multi-worker process allocation, application mocks, frontend/browser interaction, and artificial server-failure endpoints. Existing app contracts and foundational checks stay intact.

## Decisions

### 1. Root API-only Playwright project

After approval, add an exact root development dependency on `@playwright/test` 1.64.0 and update the single lockfile. Recheck official Node compatibility when installing; do not silently choose an incompatible newer major. Use one named `api` project, matching only `tests/api/**/*.spec.ts`, with `playwright.api.config.ts` at the root. Test modules import the extended Playwright fixture's `test`/`expect` and use APIRequestContext directly. They never import the Express app/store or request the `page`/`browser` fixtures.

Planned structure (not files created by this proposal):

```text
playwright.api.config.ts
tests/api/
  fixtures.ts              # automatic isolation + test-scoped api context alias
  factories.ts             # fresh typed create/patch input objects
  contracts.ts             # small runtime status/JSON/task/error assertions
  tasks.spec.ts            # positive CRUD, transitions, order, allocation
  validation.spec.ts       # field, object, transport, ID and atomicity cases
  reset.spec.ts            # reset contract, repeatability, state preservation
  health.spec.ts           # exact health response and no data mutation
  tsconfig.json            # strict tests/config type checking
```

Use root `test:api` to run `playwright test --config=playwright.api.config.ts` and `report:api` to show `playwright-report/api`. Extend root `typecheck` with the API tests/config tsconfig; keep `npm test` as the existing fast Node suite and run API regression explicitly. No browser installation command is needed. Do not add another npm workspace or an API-client dependency for a handful of routes.

### 2. Runner-owned backend and one independent worker

Use Playwright's documented `webServer` lifecycle to start only `npm run dev --workspace @taskboard/backend`, with `NODE_ENV=test`, `APP_HOST=127.0.0.1`, and default test port **4301**. An optional process variable `API_TEST_PORT` can select another validated port; derive the base URL from it rather than accepting an arbitrary URL. Reuse the existing runtime-settings parser for integer port validation and keep runner base URL, webServer environment, and `/health` readiness URL aligned. Both packages remain unchanged.

Use `reuseExistingServer: false` in local runs and CI. Port occupation must fail before fixtures issue any reset. Wait for `/health` with a 30-second startup bound; the fixture additionally checks the exact health JSON before reset. Enable managed process-tree shutdown with SIGTERM and a five-second grace period, verifying it with socket checks after both success and deliberate failure. Never start the root `dev` command, since that would also launch Vite.

Set `workers: 1`, `fullyParallel: false`, `retries: 0`, and independent default test mode. Do **not** use `test.describe.serial`, which can skip later tests after a failure and encourages state dependencies. The automatic fixture inspects the resolved worker count and rejects any override other than 1 **before reset or data mutations**. Parallel speed is not worth adding per-worker servers at this scale. Two concurrently invoked runners on the same port will fail ownership checks; two intentionally separate runs can use different test ports. Tests use 30-second timeouts, HTTP calls explicitly use a shared 10-second timeout option, and cleanup has a bounded fixture timeout. Do not assume browser action-timeout settings configure API requests.

No `API_BASE_URL`/external-server option is added: reset is destructive to its whole store, so targeting a developer's existing instance is explicitly unsupported. Tests share one runner-owned process sequentially, never with a separate suite or MCP session. The normal application default remains port 3001 and reset-disabled development mode.

### 3. Automatic reset fixture with request-context ownership

Extend Playwright's built-in test-scoped `request` fixture; expose it as `api` for readability instead of creating a context class. Playwright disposes that built-in context, including on fixture errors. An automatic isolation fixture depends on the same request context, checks safe execution settings/health, calls bodyless POST `/api/test/reset`, asserts 204/empty, then GETs an empty collection before allowing the test body to run. Every spec imports this extended `test`, so accidentally omitting the `api` parameter does not bypass isolation.

After safe-worker/owned-server guards pass, wrap the reset/test lifecycle in `try/finally` to attempt reset again after completion, including assertion failures. Do not arm reset cleanup when those safety guards fail. Surface cleanup errors as fixture diagnostics and keep the original test error visible; do not catch and swallow reset failures. Use named `test.step` blocks for setup/cleanup visibility in HTML reports. A setup failure fails before CRUD actions; a cleanup failure makes the run nonzero, and the next independent test still verifies its own baseline. Do not put shared seed state in `beforeAll` or use a global request context.

Reset cases can call reset again inside the test, but automatic final cleanup is still required. Repeated resets restart IDs at 1; nonempty reset bodies return 400 and must preserve a seeded task. Outside-test-mode reset protection is already covered by foundation Node tests; this suite does not start a second non-test server just to duplicate that check.

### 4. Small deterministic factories and transparent requests

Use local test-contract input types rather than importing application implementation types as the source of expected behavior. A create factory defaults to `{ title: 'Example task' }`, omitting status so defaulting is observable, and returns a fresh object with explicit overrides. A patch factory defaults to a valid title edit when called without arguments; explicitly supplied fields are copied as-is so a status-only patch remains status-only. Freeze or copy defaults so caller mutation cannot leak between tests.

No random IDs, UUIDs, dates, counters, or shared mutable arrays are needed. Tests derive resource IDs from successful responses except allocation/reset assertions, which intentionally inspect deterministic IDs. For absent resources, use a canonical positive ID explicitly not created in the current baseline. Duplicate-title cases intentionally reuse the same title while expecting different IDs.

Negative data is written directly in named parameter tables; valid-payload factories must not coerce, trim, repair, or validate away bad test input. Use raw string data with explicit `application/json` for malformed JSON and JSON literals such as `null`/scalar bodies, since request-library serialization could otherwise omit or normalize them. Use an explicit `text/plain` body for 415 and a JSON payload exceeding 16 KiB for 413. The tests specify the application's request contract without introducing request-validation logic into the application.

### 5. Runtime contracts and the regression matrix

`contracts.ts` contains a few plain functions using Playwright `expect`, not AJV/Zod or generated schemas. Assert the exact status before parsing. Check JSON media type, envelope keys and array/object shapes, then exact task keys (`id`, `title`, `status`), canonical ID strings, trimmed 1–200-code-unit titles, enum values, and explicit expected values/order. Runtime checks remain necessary even when a JSON value is cast to a TypeScript type.

For errors assert exact status/code and applicable field, a nonempty message, and only public envelope/error keys. Do not compare exact message prose; use the independently documented code/shape contract. For 204 assert an empty `text()` body and never call `json()`. Assertions stay near requests; small helpers expose actual/expected data and do not turn incorrect statuses into booleans or hide the failing route in a large wrapper.

| Area | Required cases and outcomes |
| --- | --- |
| List/health | Empty list; `/api/tasks/` alias; ordered populated list; health 200 `{ status: 'ok' }` without state change |
| Create | 201 default `todo`, explicit statuses, trimmed titles, duplicate titles/distinct IDs, valid length boundaries |
| PATCH | 200 title-only, status-only, combined changes; omitted fields/ID/order unchanged; a 3×3 current/target status table covers forward, reverse, and same-status edits |
| DELETE | 204/empty, list confirms removal, second delete 404, next creation does not recycle ID |
| Title/status errors | 400 `invalid_title`/`invalid_status` with field; required/blank/type/UTF-16 boundaries; invalid enums/null/non-string statuses |
| Body errors | 400 `invalid_request` for absent/null/scalar/array/unknown-key/empty-PATCH bodies; malformed JSON 400 `invalid_json` |
| Transport errors | text/plain 415 `unsupported_media_type`; above-16-KiB JSON 413 `payload_too_large` |
| Identity/routes | PATCH and DELETE malformed IDs 400; absent valid IDs 404; malformed encoding 400; unknown route 404 |
| Side effects | Collection snapshots around rejection; atomic invalid PATCH; failed create does not consume an ID |
| Reset | Repeated bodyless reset 204/empty, empty collection/next ID 1; any nonempty reset body 400 without mutation |

Keep each table case named and independently fixture-isolated; do not depend on execution order. Seed a valid existing task before negative PATCH cases so the error is the intended field/shape failure rather than missing data. Invalid-title/status tests use otherwise valid object shapes; malformed-ID PATCH uses an otherwise valid body. This respects the backend's observed validation order and avoids ambiguous combined-error expectations.

Unexpected 500 behavior has no deterministic public trigger. Retain its existing injected foundation test and document that boundary; do not add fault endpoints or pretend 500 black-box coverage was executed. If regression tests discover an application defect, report it for a separately authorized code fix rather than changing the contract or weakening assertions.

### 6. Reports and GitHub Actions

Configure list and HTML reporters, HTML `open: 'never'`, HTML output `playwright-report/api`, and test results `test-results/api`. These fit the existing ignore rules. Use clear test titles and setup/cleanup steps; add a small JSON/text attachment only when it improves a failing request diagnostic. Browser traces/screenshots/video are unnecessary for this API-only change. `report:api` opens the generated report locally without rerunning tests.

Add an `api-tests` job to `.github/workflows/foundation.yml`, retaining its existing job. Reuse its pinned checkout/setup-node actions, `.nvmrc` Node 24 selection, npm lockfile cache, and read-only permissions. The new job runs `npm ci` and `npm run test:api`; the existing job covers foundation tests, all strict type checks (including API code), and builds. Set `CI` behavior to reject focused `.only` tests; do not allow zero-test passes or continue-on-error on the API step.

Use an official release SHA-pinned `actions/upload-artifact` selected during implementation. Upload existing HTML/results after test success or failure (condition `!cancelled()`), with **14-day** retention and a clear API artifact name. If installation/startup produces no report, retain the failed job/logs and handle missing files explicitly without claiming report coverage. Artifact upload must not override a failing test outcome. CI installs no browser binaries and needs no application secrets. Do not publish reports to a public site or add notifications.

### 7. Verification before completion

After implementation, run frozen installation, foundation checks, strict API/config type checks, and nonempty API runs twice; record actual case counts and test outcomes. Run on default and overridden test ports, reject `--workers=2` before mutation, verify occupied-port refusal without touching another server's data, and check owned listener shutdown after success/failure. Demonstrate a temporary deliberately failing assertion, nonzero status, visible HTML diagnostics, cleanup, and a following clean baseline; remove that probe before committing. Verify HTML report access and the GitHub API job/artifact conditions, then record scenario evidence using `openspec-verify-change`. No application code changes are required to perform these checks.

## Risks / Trade-offs

- Reset clears the entire process store → runner-owned test server, no server reuse/external URL, one worker, and automatic setup/cleanup.
- CLI parallelism could override config defaults → inspect resolved worker count in the automatic fixture before mutation and exercise that failure path.
- Request serialization could repair or omit negative data → use explicit raw payloads/media types and verify exact error codes/state.
- Contract helpers could mirror application mistakes → use the documented independent contract, runtime assertions, and explicit expected values instead of importing store logic.
- Cleanup can fail during a failing test → preserve primary diagnostics, surface cleanup failure, dispose contexts, and verify the next baseline independently.
- Additional API coverage overlaps Node smoke checks → retain the fast Node layer; API tests exercise the separately launched real service and broader public-contract matrix.
- Reports may be absent after install/startup failure → show failed step/logs and never label that as a passing or executed suite.
- One worker limits throughput → appropriate for this small lab; multi-process worker isolation can be a later change if justified.

## Migration Plan

This proposal PR adds only planning artifacts. After approval and a separate apply request, add the runner/dependency, fixtures, contracts, tests, and CI/docs incrementally. There is no application or data migration. Reverting the future test/config/CI dependency changes removes the regression layer while leaving TaskBoard and foundation checks usable. Keep this and the foundation changes active until explicitly authorized to archive; do not merge automatically.
