# Tasks

These are future implementation tasks, all unchecked. Begin only after proposal approval and a separate apply request. Follow `specs/api-regression-testing/spec.md` for acceptance behavior and `design.md` for the approach. This change adds regression infrastructure and tests; it does not modify TaskBoard features or archive the foundation.

## 1. API runner and TypeScript configuration

- [ ] 1.1 Add the pinned root `@playwright/test` development dependency, API-only config, root `test:api`/`report:api` scripts, and strict API/config tsconfig integrated into root typecheck; verify frozen installation leaves the lockfile unchanged and type checking succeeds without browser installation. Document the commands and dependency choice.
- [ ] 1.2 Configure the runner-owned backend, dedicated loopback port/default and `API_TEST_PORT` override, health readiness, one worker, independent mode, zero retries, and timeouts; verify configuration resolves one aligned API target and no frontend/browser project, and document ownership/port/timeouts alongside it.

## 2. Fixtures, factories, and contract helpers

- [ ] 2.1 Add automatic per-test health/reset/empty-baseline setup, finally-block reset cleanup, context disposal/aliasing, and resolved-worker guard; add a fixture-backed health case and verify real HTTP execution, deterministic baselines, `--workers=2` rejection before mutation, and owned server shutdown. Document lifecycle and shared-store restrictions.
- [ ] 2.2 Add fresh typed deterministic create/patch factories with explicit overrides and no coercion/random state; verify independent objects/defaults and status-only patch omission behavior with focused checks, and document how negative inputs bypass factories.
- [ ] 2.3 Add small runtime response helpers for exact statuses, JSON/envelope/task/error contracts and empty 204 responses; exercise them against health/reset/created-task responses and a temporary wrong expectation to prove failure diagnostics. Document expected-value assertions separately from shape checks.

## 3. CRUD and negative regression cases

- [ ] 3.1 Add positive collection/alias, create/default/explicit status, trim/duplicates, title-only/status-only/combined patch, full current/target status matrix, creation order, and delete/absence cases; verify nonempty passing API execution with fixture data and document case organization.
- [ ] 3.2 Add named create/PATCH title/status invalid and UTF-16 boundary tables, plus request-shape/raw JSON/media/payload-limit cases; verify exact 400/413/415 codes/fields and collection snapshots around every rejected mutation, with otherwise valid seeded PATCH targets.
- [ ] 3.3 Add missing/malformed ID, invalid encoding, unknown-route, repeated-delete, atomic invalid PATCH, and ID allocation cases; verify exact 400/404 contracts, unchanged data on rejection, no ID consumption by failed create, and no ID reuse after ordinary delete.
- [ ] 3.4 Add repeated reset, rejected nonempty reset-body, next-ID baseline, and health-no-mutation cases; verify 204/empty or 400 contracts and independent post-case cleanup. Document the retained Node-test coverage for non-test-mode reset and generic 500, without claiming new black-box coverage for them.

## 4. Reporting and continuous integration

- [ ] 4.1 Configure terminal/HTML reporters, bounded output paths and non-auto-opening behavior; run a temporary failing assertion and confirm a nonzero exit, useful HTML expected/actual or fixture diagnostics, cleanup, and subsequent clean baseline. Remove the probe, verify `report:api` reads the generated report without rerunning tests, and document report inspection.
- [ ] 4.2 Add a separate Node 24 API job to the existing workflow with frozen install, `test:api`, officially sourced action SHA pins, failure-preserving artifact upload, and 14-day retention; verify the API and foundation jobs pass in GitHub with downloadable reports, and verify failure-path upload/report behavior using a controlled failing CI run before restoring a passing head. Document missing-report/startup failure behavior; add no browser installation or secrets.

## 5. Integrated acceptance and evidence

- [ ] 5.1 Run API regression twice and on an overridden test port; check unsafe workers, an occupied unrelated listener with unchanged data, failure/cleanup paths, and process-tree shutdown. Verify real test counts/outcomes, no shared state/order dependencies, zero-test discovery failure, and no owned listener left running.
- [ ] 5.2 Run frozen installation, existing foundation tests, all strict type checks, builds, API regression, and strict OpenSpec validation; use `openspec-verify-change` to map evidence to every requirement/scenario, record local/GitHub/report results, and confirm no app source changes or permanent failing probes were added.

## Workflow follow-up

- Submit implementation for review and wait for separate merge/archive authorization; do not perform either automatically.
- Keep `add-playwright-ui-tests` and `integrate-playwright-mcp` as separate future changes.
