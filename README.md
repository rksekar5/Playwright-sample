# Playwright MCP Testing Lab

An educational TaskBoard system under test for TypeScript, React + Vite, Express, Playwright Test, Microsoft's official `@playwright/mcp`, Codex, OpenSpec, and GitHub Actions.

**Current state: proposal only.** There is no application code or runnable project test suite yet. OpenSpec is initialized for Codex, and `bootstrap-testing-lab` is ready for review. Approval and a separate apply request are required before implementation.

## Review the first change

- [Proposal](openspec/changes/bootstrap-testing-lab/proposal.md): scope, capabilities, and deferred work.
- [API specification](openspec/changes/bootstrap-testing-lab/specs/task-api/spec.md): request/response contracts and validation scenarios.
- [UI specification](openspec/changes/bootstrap-testing-lab/specs/taskboard-ui/spec.md): accessible task management and error behavior.
- [Development specification](openspec/changes/bootstrap-testing-lab/specs/development-workflow/spec.md): reproducible commands, cloud startup, and foundational CI.
- [Design](openspec/changes/bootstrap-testing-lab/design.md): architecture and decisions.
- [Tasks](openspec/changes/bootstrap-testing-lab/tasks.md): unchecked implementation and acceptance plan.

## OpenSpec workflow

Use Node.js 24 LTS (the cloud machine currently has 24.19.0). OpenSpec was initialized with release **1.14.1**, the latest npm release at setup time, using `openspec init --tools codex --profile core --no-animation`. Generated Codex skills are committed under `.agents/skills/`.

From the repository root, run the pinned CLI without adding application dependency files:

```sh
npx --yes --package=@fission-ai/openspec@1.14.1 openspec --version
npx --yes --package=@fission-ai/openspec@1.14.1 openspec status --change bootstrap-testing-lab
npx --yes --package=@fission-ai/openspec@1.14.1 openspec validate bootstrap-testing-lab --strict
```

In Codex Cloud, the installed CLI is also available at `/workspace/.tools/openspec/node_modules/.bin/openspec`; add that directory to `PATH` for a task session. Reuse the existing checkout: cloud tasks are already isolated and need no additional Git worktree.

The first proposal was produced with the installed [`openspec-propose`](.agents/skills/openspec-propose/SKILL.md) workflow. It creates planning artifacts and stops for review. After approval and an explicit implementation request, use `$openspec-apply-change bootstrap-testing-lab`; do not archive until implementation and acceptance checks are complete.

## Roadmap

| Separate change | Intended scope |
| --- | --- |
| `bootstrap-testing-lab` | Full-stack app, deterministic in-memory data/reset, accessible UI, startup/build documentation, foundation build/typecheck CI |
| `add-playwright-api-tests` | APIRequestContext positive, negative, and contract-oriented regression tests |
| `add-playwright-ui-tests` | UI functional tests, isolated fixtures, accessible locators, UI/API integration, browser CI |
| `integrate-playwright-mcp` | Official Microsoft `@playwright/mcp` configuration and Codex exploratory examples, separate from regression tests |

Only the first change has been proposed. The later changes will have their own artifacts and reviews.

## Environment notes

Node/npm and baseline Playwright browser tooling were checked during onboarding. A Playwright smoke interaction using the system Chromium passed; this is not TaskBoard or regression-test coverage. Bundled browser downloads were blocked at `cdn.playwright.dev`; later UI testing must install the project's pinned browser with the required network destinations enabled.

The MVP needs no authentication, database, external application APIs, or credentials. Git operations use platform-provided authentication. GitHub CLI pull request operations also need access to `api.github.com`; that destination was added to the environment draft, and draft PR creation succeeded. No credentials belong in these files.
