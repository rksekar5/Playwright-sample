# Spec Delta

## Purpose

Provide a repeatable, readable API regression workflow that detects TaskBoard HTTP contract failures against its real service and produces useful local and CI diagnostics.

## ADDED Requirements

### Requirement: Reproducible API-only execution
On Node.js 24, a frozen installation followed by `npm run test:api` SHALL execute a nonempty TypeScript API suite against the real local Express service without a browser, credentials, or external services. Assertion, fixture, startup, and zero-test failures SHALL produce a nonzero exit status. Existing foundation commands/checks SHALL remain available.

#### Scenario: Fresh API run
- **WHEN** a contributor runs `npm ci` and `npm run test:api` from the repository root
- **THEN** real HTTP API tests execute without installing browser binaries or starting the React frontend

#### Scenario: Broken expectation or empty discovery
- **WHEN** an API assertion fails or no API tests are discovered
- **THEN** the command exits nonzero and identifies the failure instead of reporting a passing run

### Requirement: Positive CRUD regression coverage
The suite SHALL verify collection GET and its trailing-slash alias, creation with default/explicit status, title trimming, duplicate valid titles, partial/combined PATCH, all reversible status transitions, creation order, and DELETE. It SHALL use IDs returned by creation for item actions and verify persistence through a subsequent collection GET.

#### Scenario: Create and list
- **WHEN** tests create trimmed titles, explicit/default statuses, and duplicate titles
- **THEN** they assert 201 responses, unique IDs, normalized values, and matching ordered tasks through both list routes

#### Scenario: Rename and move
- **WHEN** tests patch title only, status only, and both fields, including reverse transitions
- **THEN** they assert 200 responses, unchanged omitted fields/IDs, correct stored values, and preserved creation order

#### Scenario: Delete and confirm absence
- **WHEN** a test deletes a created task
- **THEN** it asserts 204 with an empty body and confirms the task is absent from the collection

### Requirement: Title and status request validation coverage
Create/PATCH negative tests SHALL cover missing required title, blank/whitespace-only, non-string, and over-limit titles, and invalid status values. Boundary tests SHALL cover trimmed lengths 1, 200, and 201 UTF-16 code units, including non-BMP text. Invalid field requests SHALL assert 400, the matching error code/field, and no stored mutation.

#### Scenario: Invalid field matrix
- **WHEN** valid-shaped requests contain invalid titles or statuses
- **THEN** tests assert `invalid_title`/field `title` or `invalid_status`/field `status`, with exact 400 responses

#### Scenario: Title boundaries
- **WHEN** tests send trimmed 1/200-code-unit titles and a 201-code-unit title, including emoji-based boundaries
- **THEN** valid boundaries succeed and the oversized title is rejected according to the existing contract

### Requirement: Request shape and transport validation coverage
The suite SHALL assert 400 `invalid_request` for absent bodies, null/scalar/array bodies, unknown properties, and empty PATCH; 400 `invalid_json` for malformed JSON; 415 `unsupported_media_type` for non-JSON media; and 413 `payload_too_large` above 16 KiB. Negative tests SHALL send deliberate invalid bytes/headers without helpers repairing them.

#### Scenario: Invalid object shape
- **WHEN** tests send each invalid object/body case to the relevant create/update routes
- **THEN** they assert 400 `invalid_request` and verify the store remains unchanged

#### Scenario: Raw invalid transport
- **WHEN** tests send malformed JSON, a text/plain body, or an oversized JSON body
- **THEN** they assert the exact 400/415/413 status and error code without creating or updating a task

### Requirement: Item identity and not-found coverage
The suite SHALL verify malformed IDs produce 400 `invalid_request`, absent valid IDs produce 404 `not_found` for PATCH/DELETE, repeated deletion produces 404, and an unknown API route produces 404. It SHALL distinguish failed identity validation from missing-resource behavior without relying on a GET-by-ID endpoint.

#### Scenario: Invalid and missing IDs
- **WHEN** tests use malformed IDs such as `abc`, `0`, `01`, or invalid encoding, and a valid absent ID
- **THEN** they assert the corresponding 400 or 404 contract and unchanged task state

#### Scenario: Deleted resource and unknown route
- **WHEN** tests delete an item twice or request an unknown API route
- **THEN** the later delete and unknown route return the asserted 404 JSON error contract

### Requirement: Runtime response and error contract assertions
Tests SHALL check exact expected HTTP statuses and JSON media type, then validate envelopes, exact task fields, canonical string IDs, normalized titles, status values, and array contents at runtime. Error assertions SHALL validate stable code, nonempty message, applicable field, and absence of extra/internal details. DELETE/reset 204 bodies SHALL be checked as empty without JSON parsing.

#### Scenario: Success contract drift
- **WHEN** a successful response changes status, envelope, field types/keys, ID format, or a task value
- **THEN** the corresponding contract/value assertion fails with useful expected/actual diagnostics

#### Scenario: Error contract drift
- **WHEN** a negative response changes its code/field, loses its readable message, includes internal fields, or returns non-JSON
- **THEN** the corresponding runtime assertion fails without depending on exact human-readable message wording

### Requirement: Rejected mutations preserve state and IDs
Negative mutation tests SHALL compare collection state before and after rejection. The suite SHALL verify a PATCH containing one valid and one invalid field does not apply either field, and failed creations do not consume IDs. It SHALL also verify ordinary deletion does not recycle IDs before reset.

#### Scenario: Atomic rejected patch
- **WHEN** a test submits a valid title together with an invalid status to an existing task
- **THEN** it asserts rejection and exact preservation of the original task/collection

#### Scenario: Allocation after failure and deletion
- **WHEN** tests reject a creation or delete a successfully created item before creating another
- **THEN** they assert failed creation consumed no ID and deletion did not reuse the prior ID

### Requirement: Deterministic test data factories
Factories SHALL return fresh valid create/update payloads with deterministic defaults and explicit per-test overrides. Mutating one generated payload SHALL not change another or the defaults. Negative cases SHALL remain explicit invalid data. Tests SHALL not depend on randomness, time, shared mutable counters, or earlier tests' tasks.

#### Scenario: Independent factory values
- **WHEN** two payloads are generated and one is changed or supplied with overrides
- **THEN** the other/default payload remains unchanged and rerunning the test produces the same intended data

### Requirement: Isolated API fixture lifecycle
Each test SHALL receive a test-scoped request context and an empty baseline via bodyless POST `/api/test/reset`, verified as 204 followed by an empty GET. Cleanup SHALL attempt reset after the test even on assertion failure, surface failures, and dispose contexts. Explicit reset coverage SHALL verify repeated resets restore empty data/next ID 1 and reset bodies are rejected without mutation.

#### Scenario: Independent setup and failed-test cleanup
- **WHEN** a test creates data and passes or fails, followed by another independent test
- **THEN** cleanup is attempted and the next test verifies an empty baseline without sharing the prior context/data

#### Scenario: Reset contract and repeatability
- **WHEN** reset tests repeat a bodyless reset or submit a nonempty reset body
- **THEN** they assert 204/empty with restarted IDs or 400 `invalid_request` with preserved data, respectively

#### Scenario: Fixture failure
- **WHEN** setup/cleanup cannot reset the owned instance or obtain the expected baseline
- **THEN** the run reports a fixture failure, exits nonzero, and does not hide the original test failure

### Requirement: Owned server and bounded execution
The runner SHALL own a dedicated local backend started with `NODE_ENV=test`, wait for health, and stop its process tree on completion/failure. It SHALL not reuse an existing listener or target an arbitrary external URL. Tests SHALL run independently with exactly one worker, no shared-store parallelism, and zero retries; unsafe worker overrides SHALL fail before reset/data mutations. Timeouts SHALL bound startup/requests/tests.

#### Scenario: Existing listener or unsafe workers
- **WHEN** the chosen port is occupied or execution is configured with more than one worker
- **THEN** the run fails visibly before resetting/mutating another instance and leaves unrelated services untouched

#### Scenario: Repeat and stop
- **WHEN** the suite is run twice or completes with a test/startup failure
- **THEN** each run owns its baseline, reports its actual result, and leaves no owned server listening afterward

### Requirement: HTML and terminal reporting
Every completed test run, including assertion failures, SHALL produce a terminal summary and HTML report identifying test outcomes and assertion/fixture diagnostics. CI SHALL not automatically open a report server. A documented local report command SHALL open the existing HTML report without rerunning tests. Passed, failed, skipped, and unrun results SHALL remain distinct.

#### Scenario: Inspect a failed run
- **WHEN** an assertion fails and the contributor opens the generated report
- **THEN** the report names the failing case and expected/actual or fixture error, while the test command remains nonzero

### Requirement: GitHub Actions API regression integration
A separate API-test job SHALL run frozen installation and the same root API command on PRs to `main` and pushes to `main` using Node 24, preserving foundation checks. It SHALL fail for assertion/setup failures, publish available HTML/results artifacts on success and failure with bounded retention, and require no browser installation or application secrets.

#### Scenario: CI success and failure feedback
- **WHEN** the API job runs a passing or deliberately failing test suite
- **THEN** its job status reflects the test result and generated reports/results are downloadable in either case

#### Scenario: Startup fails before results exist
- **WHEN** installation or startup fails before producing an HTML report
- **THEN** CI remains failed, its logs identify the failing step, and missing artifacts do not masquerade as passing test coverage
