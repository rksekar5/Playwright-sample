# Proposal

## Why

The repository has no application or testable API, so it cannot yet demonstrate Playwright-based Quality Engineering. A small, deterministic TaskBoard will provide a reproducible system under test before separate changes introduce API tests, UI tests, and AI-driven exploration.

## What Changes

- Establish a TypeScript npm-workspace monorepo with React + Vite in `packages/frontend` and Node.js + Express in `packages/backend`, targeting Node.js 24 LTS.
- Provide task listing, creation, title editing, status changes, and deletion through a documented REST contract and accessible frontend.
- Validate titles and request bodies, return consistent JSON errors, and display validation/API failures without losing user input or showing unconfirmed changes.
- Use process-local in-memory tasks, initially empty, with deterministic IDs and a reset endpoint available only in test mode.
- Centralize runtime settings; document installation, local/cloud startup, readiness, builds, and representative manual smoke checks.
- Plan a small GitHub Actions foundation job for frozen installation, type checking, and builds. Regression test jobs are added with their corresponding later changes.

This pull request contains OpenSpec initialization and planning artifacts only. Application implementation starts only after proposal approval and a new apply request.

Deferred changes, each requiring its own proposal:

1. `add-playwright-api-tests`: positive, negative, and contract-oriented APIRequestContext tests.
2. `add-playwright-ui-tests`: UI functional tests, fixtures, role/label locators, and UI/API integration.
3. `integrate-playwright-mcp`: official Microsoft `@playwright/mcp` configuration and guided Codex exploratory examples, separate from regression tests.

No authentication, authorization, database, external services, drag-and-drop, filtering, deployment, or AI features are included.

## Capabilities

### New Capabilities

- `task-api`: Task REST contracts, validation, error handling, deterministic in-memory storage, and test-only reset behavior.
- `taskboard-ui`: Accessible task management with loading, empty, validation, and API-error states.
- `development-workflow`: Reproducible monorepo commands, centralized configuration, health checks, cloud-compatible startup, and foundational CI checks.

### Modified Capabilities

None. The repository has no existing application specifications.

## Impact

Implementation will add two workspace packages, a root lockfile and scripts, runtime configuration, application documentation, and a build/type-check workflow. Proposed API routes are `GET /api/tasks` (also `/api/tasks/`), `POST /api/tasks`, `PATCH /api/tasks/:id`, `DELETE /api/tasks/:id`, `GET /health`, and test-only `POST /api/test/reset`. Item IDs resolve the shorthand edit/delete paths in the request; a GET-by-ID route is outside this change. No application dependencies, source, tests, or CI workflow are implemented in this proposal PR.
