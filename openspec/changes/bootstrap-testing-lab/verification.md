# Verification Report: bootstrap-testing-lab

## Scope and workflow

The approved proposal was merged into `main` at `21f7098`. Implementation uses the generated OpenSpec 1.14.1 `openspec-apply-change` workflow on `codex/implement-bootstrap-testing-lab`. The supported `openspec-verify-change` workflow is enabled for the final completeness/correctness/coherence review. No merge or archive is performed.

The implementation request adds foundational automated tests to the approved app scope. There are no Playwright Test suites, APIRequestContext fixtures, browser CI jobs, or Microsoft MCP configuration in this change. Browser acceptance below is a one-off implementation check using the cloud's existing Playwright library/system Chromium; reproducible manual steps are in `docs/testing.md`.

## Executed evidence

Validation in Codex Cloud used Node.js **24.19.0**, npm **11.9.0**, and OpenSpec **1.14.1**.

| Check | Result |
| --- | --- |
| Frozen installation repeated after implementation | `npm ci` succeeded; root lockfile unchanged |
| Foundational automated tests | 18 passed: 4 configuration, 10 backend, 4 frontend; zero failed/skipped/cancelled |
| Shared configuration and both workspace type checks | Passed with strict TypeScript |
| Backend and frontend builds | Passed; runnable backend JavaScript and Vite static assets emitted |
| Documented API examples | All 15 curl commands executed with expected 200/201/204 and 400/404/415 contracts |
| Default development startup | Both services started; health, frontend delivery, proxy, and real UI/API CRUD passed |
| Overridden startup (`3101` API, `5273` UI) | Same proxy and full browser acceptance passed |
| Invalid settings / occupied API / occupied UI port | Each failed with nonzero status; sibling services stopped |
| Shutdown | SIGINT to the development supervisor/process group closed both listeners; no validation service left running |
| Compiled API startup | Passed in development, production, and test modes; health preserved data, disabled reset preserved tasks, restart restored empty data/ID 1 |
| Browser acceptance | Keyboard create/edit/cancel/status/delete, trimming, local/API errors, failed mutations, delayed requests, refresh/retry, and confirmed-state guards passed |
| Accessibility / responsive layout | Named regions/articles, role/label controls, field associations/alerts, and 390px layout checked; no browser runtime errors |
| GitHub Actions foundation job | Pending first PR run; update this row only after a successful GitHub result |

Lockfile SHA-256 before/after repeated installation: `e7e88f3ec608ac5717ba9379d0fd0373d41ede3084a7c55f13a7789674b08343`.

## Requirement and scenario mapping

Every delta requirement is ADDED. No REMOVED/RENAMED behavior needs verification. The table maps all **22 requirements and 53 scenarios** to implementation and evidence, keeping persistent automated tests distinct from one-off browser/process checks.

| Requirement | Scenarios | Implementation | Evidence |
| --- | --- | --- | --- |
| Task representation and listing | Empty collection/trailing slash; stable representation/order | `backend/src/app.ts`, `tasks.ts` | HTTP lifecycle and store tests; curl listing |
| Task creation | Default status/trim; explicit status/duplicate titles | `backend/src/app.ts`, `tasks.ts` | HTTP lifecycle; duplicate create and exact response assertions |
| Title/status validation | Invalid titles; maximum length; invalid statuses | `backend/src/tasks.ts` | Validation boundary tables including UTF-16; atomic HTTP rejection; negative curl examples |
| Atomic task updates | Rename/status; status-only reverse transition; partial validation failure | `backend/src/app.ts`, `tasks.ts` | HTTP lifecycle and rejected-mutation tests |
| Deletion/item identity | Delete; unknown/malformed IDs; non-reused IDs | `backend/src/tasks.ts`, `app.ts` | Store and HTTP tests, including malformed URL encoding |
| Request shape/transport | Invalid object; JSON/media type; oversized body | `backend/src/app.ts`, `errors.ts` | HTTP error table checks JSON errors, status, unchanged store |
| Consistent error responses | Field error; unknown route; unexpected failure | `backend/src/errors.ts` | Exact field response; unknown route; deliberately throwing store returns generic 500 |
| Deterministic reset | Repeat reset; body rejection; disabled modes; no durable persistence | `backend/src/app.ts`, `tasks.ts` | Test/reset HTTP tests and compiled process restart checks |
| Task listing/status groups | Populated board; empty board | `frontend/src/App.tsx` | One-off browser checks and live API integration; status-filter/order code review |
| Loading/refresh failures | Initial failure; retry; data preserved on failed refresh | `frontend/src/App.tsx` | Delayed/failed GET interception, empty-state distinction, recovery and retained-card checks |
| Create tasks | Success; repeated pending activation | `frontend/src/App.tsx` | Keyboard creation, empty input after success; delayed POST with duplicate form submissions yields one request |
| Title validation/failed creation | Blank/oversized input; server/API failure | `frontend/src/App.tsx`, `api.ts` | Local validation/no POST; server field error, aborted transport, invalid response preserve draft/cards |
| Edit titles | Rename; cancel; failed edit | `frontend/src/TaskCard.tsx` | Keyboard save/cancel and PATCH observation; intercepted field rejection retains heading/draft |
| Change status | Reversible transitions; failed update | `frontend/src/TaskCard.tsx` | Keyboard transitions verified in API; rejected status keeps original selection/section |
| Delete tasks | Success; failure | `frontend/src/TaskCard.tsx`, `api.ts` | Keyboard deletion/204 and empty section; failed deletion retains card; fetch-wrapper 204 unit test |
| Accessible stable targets | Keyboard workflow; stable target after edits; error association | `frontend/src/App.tsx`, `TaskCard.tsx` | Keyboard interactions, accessibility snapshot, stable Task 1 scope, aria-invalid/describedby/alerts |
| Reproducible install/build | Fresh checkout build; failure propagation | Root/workspace scripts and tsconfigs | Frozen install/hash; root check/build; initial type failure exited nonzero before build |
| Single-command startup | Start/function; shutdown/port conflict | Root dev script, backend entry point, Vite config | Default/override functional checks; independent occupied-port and SIGINT checks |
| Central config | Overrides; invalid setting | `config/runtime.ts` | Four config tests; actual overridden listeners/proxy; invalid-port startup failure |
| Health/functional readiness | Health contract; useful readiness | `backend/src/app.ts`, documented checks | Health exact JSON and unchanged data; real UI/API CRUD plus frontend response |
| Foundational CI | Implemented foundation checked in CI | `.github/workflows/foundation.yml` | Local identical commands passed; GitHub result pending |
| Isolated test-mode guidance | Reset baseline; understand isolation | README, `docs/api.md`, `docs/testing.md` | Executed bodyless repeated resets/ID restart; documented per-instance reset and separate roadmap |

Source paths in the table are relative to `packages/` unless they start with `config/`, a dot, or name a root document. The 53 scenarios describe acceptance behavior; they are not 53 committed test cases. No claim of comprehensive browser regression coverage is made.

## OpenSpec verification scorecard

| Dimension | Current status |
| --- | --- |
| Completeness | App/docs/tests implemented; task 4.1 awaits real GitHub CI, task 5.2 awaits final documentation/checklist confirmation |
| Correctness | All 22 requirements mapped; automated foundation and one-off functional acceptance passed; CI outcome not yet verified |
| Coherence | Two workspaces, shared settings, plain validation, same-origin proxy, confirmed UI state, test-mode reset, no deferred integration added |

Final verify assessment and GitHub run evidence will be recorded after PR checks complete. No merge or archive is authorized by this report.
