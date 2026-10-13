# Spec Delta

## Purpose

Allow contributors and cloud agents to install, start, check, and rebuild the same small application reliably without credentials or external application services.

## ADDED Requirements

### Requirement: Reproducible installation and build commands
From the repository root on Node.js 24 LTS, contributors SHALL be able to install locked dependencies with `npm ci`, check both packages with `npm run typecheck`, and build both with `npm run build`. The repository SHALL declare its runtime version, commit one root lockfile, and document these commands. Failed checks SHALL return a nonzero exit status.

#### Scenario: Fresh checkout build
- **WHEN** a contributor uses the declared runtime and runs `npm ci`, `npm run typecheck`, and `npm run build` in a fresh checkout
- **THEN** both packages are installed, checked, and built successfully without changing tracked dependency declarations or the lockfile

#### Scenario: Check failure propagation
- **WHEN** either package fails a build or type check
- **THEN** the corresponding root command exits nonzero rather than reporting success

### Requirement: Single-command development startup
`npm run dev` from the repository root SHALL start both the frontend and API. Default development ports SHALL be 5173 for the frontend and 3001 for the API, binding to `0.0.0.0` for cloud compatibility. Shutdown SHALL stop both children. Startup failures or occupied ports SHALL be visible and terminate the command rather than silently selecting different ports.

#### Scenario: Start and exercise the app
- **WHEN** the documented installation is complete and `npm run dev` starts with default settings
- **THEN** the frontend is served on port 5173, health responds on port 3001, and a task created through the UI appears in the API collection

#### Scenario: Shutdown and port conflict
- **WHEN** the development command is interrupted, or a required port is already occupied at startup
- **THEN** interruption stops both child services, or startup fails visibly with a nonzero exit status, respectively

### Requirement: Centralized and validated runtime configuration
The project SHALL document a single set of runtime settings: `APP_HOST`, `API_PORT`, `UI_PORT`, and `NODE_ENV`, with defaults `0.0.0.0`, `3001`, `5173`, and `development`. A root `.env.example` SHALL list them without secrets. Both packages SHALL honor port/host overrides, and invalid ports SHALL fail startup clearly. The browser SHALL use same-origin `/api` requests through the development proxy.

#### Scenario: Override ports
- **WHEN** root runtime settings specify valid ports 3101 and 5273
- **THEN** the API and frontend use those ports and frontend task requests reach the API without editing source files

#### Scenario: Invalid port setting
- **WHEN** a configured port is nonnumeric, zero, or greater than 65535
- **THEN** startup fails with a clear configuration error and nonzero status

### Requirement: Health and functional readiness
`GET /health` SHALL return 200 JSON `{ "status": "ok" }` without changing tasks. Setup instructions SHALL verify this response, frontend delivery, and at least one real create/list/update/delete round trip. An open port or running process alone SHALL not count as readiness.

#### Scenario: Health contract
- **WHEN** GET `/health` is requested from the running API
- **THEN** it returns 200 JSON `{ "status": "ok" }` and task data remains unchanged

#### Scenario: Useful cloud readiness check
- **WHEN** documented readiness checks are followed in the cloud environment
- **THEN** health and frontend delivery succeed and a task can be created, observed, renamed, moved, and deleted through the documented UI/API smoke steps

### Requirement: Foundational continuous integration
A GitHub Actions workflow SHALL run locked installation, root type checks, and builds using the declared Node.js LTS version on pull requests to `main` and pushes to `main`. It SHALL require no application credentials. Bootstrap CI SHALL not claim Playwright regression coverage; API/UI test jobs and browser artifacts SHALL be introduced with their later changes.

#### Scenario: Proposal implementation checked in CI
- **WHEN** the implemented foundation is submitted in a pull request targeting `main`
- **THEN** CI installs with `npm ci`, checks both packages, and builds both, reporting a failed job if any command fails

### Requirement: Repeatable isolated test-mode startup guidance
Documentation SHALL describe starting the same application with `NODE_ENV=test` and resetting it through `POST /api/test/reset`. It SHALL explain that a reset affects the whole process-local store, so independent parallel tests require separate API processes. Future deterministic tests SHALL remain separate from MCP exploration; bootstrap SHALL not install/configure those later testing integrations.

#### Scenario: Prepare a test baseline
- **WHEN** a contributor follows the documented test-mode startup and reset steps
- **THEN** health succeeds, reset returns 204, and the next creation starts at ID `1`

#### Scenario: Understand the isolation boundary
- **WHEN** a contributor reads the testing roadmap and startup guidance
- **THEN** they can distinguish the future API suite, UI suite, and MCP exploration, and are warned not to reset a store shared by parallel tests
