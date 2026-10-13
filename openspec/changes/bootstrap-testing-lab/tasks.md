# Tasks

These are future implementation tasks. None have been implemented or verified in this planning-only change. Begin only after proposal approval and an explicit apply request. The acceptance contracts are in `specs/`; implementation choices are in `design.md`.

## 1. Workspace and runtime foundation

- [ ] 1.1 Add frontend/backend npm workspaces, strict TypeScript configuration, Node 24 runtime declaration, minimal dependencies, and a root lockfile; verify a clean `npm ci` succeeds without modifying the lockfile.
- [ ] 1.2 Add centralized runtime settings and root `.env.example`, honoring injected variables before optional root `.env` values; verify default/overridden ports and that invalid ports fail startup clearly.
- [ ] 1.3 Add root dev/typecheck/build commands and initial Vite proxy/backend startup entry point; verify both services start, port conflicts exit nonzero, and interrupting the root command stops both children. Document these commands and settings alongside this work.

## 2. Task API and reset

- [ ] 2.1 Implement the empty in-memory store, task representation, consecutive non-reused IDs, list aliases, create, atomic PATCH, and DELETE; verify documented HTTP round trips return the specified bodies/statuses and creation order stays stable.
- [ ] 2.2 Implement title/status, object-shape, canonical ID, media-type, JSON, and payload-size validation in the documented order; verify representative invalid requests return the expected codes and fields without mutating tasks or consuming IDs.
- [ ] 2.3 Add JSON not-found/error handling and `/health`; verify unknown routes return 404 JSON, health returns the exact 200 body without changing data, and review error middleware to confirm unexpected exceptions cannot expose stack traces.
- [ ] 2.4 Add bodyless test-mode reset; verify repeated resets return 204, empty the collection, and restart IDs at 1, reset bodies return 400 without mutation, and normal/production modes return 404 without clearing tasks. Verify process restart also restores the baseline.
- [ ] 2.5 Document the API contract and executable curl examples for CRUD, validation, health, and reset; run the examples as written and record expected status/body outcomes. Explain the process-local/parallel-isolation boundary.

## 3. Accessible TaskBoard frontend

- [ ] 3.1 Add the fetch wrapper, named status sections, initial listing/empty state, refresh control, and create form; manually verify live API-backed listing, title trimming, successful creation, and proper 204 handling in the wrapper.
- [ ] 3.2 Add per-task title editing/cancel, status selection, and deletion; verify successful API responses update the board, all status transitions work, cancellation sends no request, and cards retain stable `Task <id>` names.
- [ ] 3.3 Add associated local/API field validation, loading/error states, preserved drafts, and pending-action guards; use browser developer tools to observe requests and simulate API/network failures, verifying no unconfirmed card changes and no duplicate pending submission.
- [ ] 3.4 Verify the create/edit/status/delete workflow by keyboard and inspect the accessibility tree for headings, named regions, labels, invalid state, described errors, and alerts; document the manual UI smoke steps and failure-recovery behavior.

## 4. Foundational CI

- [ ] 4.1 Add a GitHub Actions workflow for pull requests to `main` and pushes to `main`, with read-only permissions, officially sourced action SHA pins, Node 24, npm cache, `npm ci`, typecheck, and build; verify its job succeeds in GitHub and document exactly which checks it runs. Do not add Playwright or MCP jobs yet.

## 5. Integrated acceptance

- [ ] 5.1 In Codex Cloud, follow the documented default and overridden-port startup instructions and complete a real UI/API create/list/rename/status/delete round trip; record health/frontend responses and functional results, then stop only processes started for validation.
- [ ] 5.2 Repeat root frozen installation, type checking, and builds after the complete implementation; verify no unintended tracked changes, document the results, and map the completed smoke checks to each specification's scenarios without claiming deferred regression coverage.

## Workflow follow-up

- Submit implementation for review after the tracked work passes; archive only when implementation review requirements are satisfied.
- Propose `add-playwright-api-tests`, `add-playwright-ui-tests`, and `integrate-playwright-mcp` separately in that order; do not complete them as part of bootstrap.
