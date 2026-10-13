# Proposal

## Why

TaskBoard is implemented, but its automated coverage is limited to foundational Node tests. A focused API regression suite will demonstrate maintainable Playwright APIRequestContext testing against the real Express service and give contributors repeatable feedback on its HTTP contracts.

## What Changes

- Add a TypeScript Playwright Test API project and a root `npm run test:api` command on Node.js 24, exercising the existing service through APIRequestContext without launching a browser.
- Cover positive CRUD, request-validation boundaries, negative mutations, status codes, JSON response/error contracts, and state preservation after rejected requests.
- Add small deterministic request-data factories, reusable API fixtures, and explicit runtime contract assertions; use direct requests instead of an API-client class hierarchy.
- Have the runner own a dedicated test-mode backend, reject server reuse and unsafe parallelism, and reset before/after each test for deterministic setup and cleanup.
- Generate HTML and terminal reports; publish bounded CI artifacts on successful and failed test runs without hiding the test exit status.
- Extend GitHub Actions with a separate API-test job, preserving the existing foundation checks. Document local/cloud commands, test isolation, diagnostics, and report access.

This PR contains planning artifacts only. No tests, dependency changes, runner configuration, or CI changes are implemented before proposal approval and a separate apply request.

The separate `add-playwright-ui-tests` and `integrate-playwright-mcp` changes remain deferred. No authentication, databases, application features, endpoint changes, fault-injection endpoints, remote-environment testing, or parallel-worker infrastructure are included.

## Capabilities

### New Capabilities

- `api-regression-testing`: Real-service API regression execution, contract assertions, deterministic fixtures/factories, isolation, reporting, and CI feedback.

### Modified Capabilities

None. TaskBoard's application/API behavior is unchanged. The completed foundation's contract is still in its unarchived change; this proposal neither archives it nor duplicates its `task-api` capability.

## Impact

Implementation will add a root Playwright API configuration, `tests/api/` fixtures/factories/contract helpers/specs and type-check configuration, a locked `@playwright/test` development dependency, root API-test/report scripts, documentation, and an API job in the existing GitHub Actions workflow. Express/React source and the current foundational Node tests remain unchanged. `POST /api/test/reset` is reused only on a runner-owned `NODE_ENV=test` instance; no browser binaries, secrets, external services, or database are needed.
