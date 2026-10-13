# Playwright MCP Testing Lab

A small TaskBoard system under test for learning Quality Engineering with TypeScript, React + Vite, Express, Playwright, Codex, and OpenSpec.

The `bootstrap-testing-lab` foundation implements task CRUD, an accessible board, deterministic in-memory storage, and a test-only reset. The full Playwright API suite, UI suite, and Microsoft `@playwright/mcp` integration remain separate future changes. There is no authentication, database, external API, or AI feature in the app.

## Quick start

Use **Node.js 24 LTS** (`nvm use` if you use nvm). From the repository root:

```sh
npm ci
npm run dev
```

The frontend listens on port **5173** and the API on **3001**, binding to `0.0.0.0` for cloud compatibility. Vite forwards same-origin `/api` requests to the API. Use a local browser or your cloud agent's browser tools to exercise the frontend. Interrupt the root command to stop both services; occupied ports fail startup instead of selecting different ports.

The board starts empty. Create a task with **Task title** and **Add task**; use **Edit title**, **Status**, and **Delete task** on its card. Data disappears on API restart. Errors preserve drafts and the last confirmed board state; **Refresh tasks** reconciles server state after network failures. Vite reloads frontend edits; restart the dev command after backend or runtime-setting changes.

## Configuration

The single settings definition lives in [`config/runtime.ts`](config/runtime.ts). Both workspace startup commands load the optional root `.env`; injected process variables take precedence. Copy `.env.example` if you want a local file. Do not commit `.env`.

| Variable | Default | Meaning |
| --- | --- | --- |
| `APP_HOST` | `0.0.0.0` | Binding IP address or `localhost` |
| `API_PORT` | `3001` | Backend port and frontend proxy target |
| `UI_PORT` | `5173` | Frontend port |
| `NODE_ENV` | `development` | Exact `test` enables the reset endpoint |

Ports must be distinct integers from 1 to 65535. For example:

```sh
API_PORT=3101 UI_PORT=5273 NODE_ENV=test npm run dev
```

Root npm commands delegate to workspace commands; their working directories are the relevant package roots. Run the compiled API with `npm run start --workspace @taskboard/backend` after building. Production full-stack hosting is outside this foundation.

## Checks

```sh
npm test
npm run typecheck
npm run build
# Or run all three:
npm run check
```

Foundational tests use Node's built-in test runner with `tsx`: runtime settings, store/validation behavior, small live-HTTP API smoke checks, and the frontend fetch wrapper. Each API test starts its own app on an ephemeral port. These are not the future Playwright APIRequestContext or browser regression suites. Both packages use strict TypeScript, and root commands propagate failures. Builds emit `packages/backend/dist/` and `packages/frontend/dist/`.

The [Foundation GitHub Actions workflow](.github/workflows/foundation.yml) runs `npm ci`, tests, type checks, and builds on pull requests to `main` and pushes to `main`, with Node 24 and read-only repository permissions. Action references are pinned to official release commit SHAs. No browser or MCP job is included yet.

## API and test isolation

See [API contracts and executable curl examples](docs/api.md), [manual UI/cloud checks](docs/testing.md), and [OpenSpec verification evidence](openspec/changes/bootstrap-testing-lab/verification.md).

Start a dedicated test-mode instance and reset it without a request body:

```sh
NODE_ENV=test npm run dev
curl --fail-with-body -i -X POST http://127.0.0.1:3001/api/test/reset
curl --fail-with-body http://127.0.0.1:3001/health
curl --fail-with-body http://127.0.0.1:3001/api/tasks
```

Expected results are 204 with no body, `{ "status": "ok" }`, and `{ "tasks": [] }`. The next task gets ID `1`. Outside test mode reset returns 404 and leaves tasks unchanged. Reset affects the **whole process-local store**: use serial tests against a shared instance or separate instances/ports for parallel workers. Keep MCP exploratory sessions separate from deterministic regression fixtures. Do not deploy or expose test mode as a public service.

## OpenSpec

The approved [proposal](openspec/changes/bootstrap-testing-lab/proposal.md), [design](openspec/changes/bootstrap-testing-lab/design.md), [task checklist](openspec/changes/bootstrap-testing-lab/tasks.md), and capability specifications remain in the active change. Implementation is not automatically archived or merged.

OpenSpec **1.14.1** initialized Codex support. Use the committed `$openspec-apply-change` and `$openspec-verify-change` skills (equivalents of apply/verify in this release). The verify skill was added with the supported custom workflow profile. Run the pinned CLI from the root:

```sh
npx --yes --package=@fission-ai/openspec@1.14.1 openspec status --change bootstrap-testing-lab
npx --yes --package=@fission-ai/openspec@1.14.1 openspec validate bootstrap-testing-lab --strict
```

Codex Cloud already isolates each task; use its existing checkout and do not create a worktree unless explicitly requested. The environment also installs the pinned CLI outside the checkout at `/workspace/.tools/openspec/node_modules/.bin/openspec`.

## Separate roadmap changes

| Change | Scope |
| --- | --- |
| `bootstrap-testing-lab` | App, deterministic reset, accessible UI, foundational Node tests, build/typecheck CI |
| `add-playwright-api-tests` | Positive, negative, and contract-oriented APIRequestContext regression tests |
| `add-playwright-ui-tests` | UI regression tests, fixtures, accessible locators, UI/API integration, browser CI |
| `integrate-playwright-mcp` | Official Microsoft `@playwright/mcp` configuration and Codex exploration examples |

Later UI testing must install its lockfile-selected Playwright browser and enable the official download destinations in cloud settings. System Chromium can be used for one-off implementation smoke checks; it is not the future pinned regression-browser setup.
