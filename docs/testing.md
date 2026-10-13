# Foundation checks

The committed automated checks use Node's runner, not Playwright Test. They cover configuration, storage/validation, a small real-HTTP API smoke layer, and frontend transport/error handling. Each HTTP test creates a fresh app with an ephemeral port and closes it afterward. The separate APIRequestContext suite, browser regression suite, and MCP exploration are deferred.

## Installation, builds, and readiness

From the root on Node 24:

```sh
npm ci
npm run check
NODE_ENV=test npm run dev
```

In another terminal, run the [documented HTTP round trip](api.md#executable-http-smoke-example). Check that `/health` returns 200 `{ "status": "ok" }`, frontend delivery works on port 5173, and task operations reach the API. A PID or port is insufficient evidence.

Repeat with `API_PORT=3101 UI_PORT=5273 NODE_ENV=test npm run dev`, adjusting HTTP commands to 3101 and browser tools to 5273. Interrupt the root dev command and verify both listeners close. Starting with an occupied API/UI port or `API_PORT=abc` must fail clearly with a nonzero exit status. Builds do not start services. `npm run start --workspace @taskboard/backend` verifies the compiled API after `npm run build`.

## Browser acceptance smoke

Use a dedicated test-mode instance and reset it before starting. The board exposes named `To Do`, `In Progress`, and `Done` regions and stable `Task <id>` articles. Identical action names are scoped to each article; CSS classes and card positions are not locator contracts.

1. Verify the three empty sections. Submit **Task title** `  Browser smoke  ` with **Add task**; check a trimmed title in To Do and confirm it in GET `/api/tasks`.
2. Submit blank/whitespace and over-200-code-unit titles; verify an announced field error, `aria-invalid`, and `aria-describedby`, with no mutation request. Correct the title and verify the error clears.
3. In `Task 1`, choose **Edit title**. Change the draft and **Cancel**; observe no PATCH and the old heading. Edit again and **Save title**; verify the confirmed heading changes while ID/status stay stable.
4. Use **Status** to move through In Progress, Done, then To Do. Confirm each move through the API, preserving title/ID and per-column creation order.
5. Delete the task; its card disappears after the 204 response and its section shows the empty state.
6. Use keyboard Tab/Shift+Tab, Enter/Space, and arrow keys through these actions. Inspect the accessibility tree for headings, regions, articles, labels, buttons, and alerts; check mobile-width layout as well.

## Failure and pending-state checks

Use browser developer tools' network blocking/offline features, or temporary browser-tool request interception on the dedicated instance. Remove the interception after each check. These are implementation acceptance checks, not a committed regression suite.

- Delay the initial list request: loading status appears; fail it: show an alert and enabled **Refresh tasks**, without pretending the board loaded an empty collection. Retry successfully. Fail a subsequent refresh and verify existing cards remain.
- Reject a create with a JSON `invalid_title` field error and then with a general API/network failure: the draft remains, its error is visible, and no new card appears. Delay creation and verify the input/submit are disabled and duplicate pending submissions send no extra request.
- Reject title editing: the confirmed heading and editable draft remain. Reject status changes: the previous selection and section remain. Reject deletion: the card remains. Settle the request and verify its controls recover.
- Delay a card mutation: conflicting actions on that card are disabled, and refresh is disabled until mutations settle. A failed/lost response can mask a server-side success: refresh before retrying uncertain operations.
- Return non-JSON or invalid success shapes: the UI displays a readable unexpected-response error instead of crashing.

## Continuous integration

The Foundation workflow installs the frozen root lockfile, runs the same Node tests, typechecks both workspaces/shared configuration, and builds both packages. It runs on PRs to main and pushes to main using Node 24 and official release SHA-pinned actions. Tests need no credentials or application internet access. Browser installation, Playwright reports, and MCP are not part of this job.

See the change's [verification report](../openspec/changes/bootstrap-testing-lab/verification.md) for executed checks, scenario evidence, GitHub CI results, and any remaining limits. Do not treat future roadmap suites as executed coverage.
