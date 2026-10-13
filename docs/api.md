# Task API

All tasks are process-local and initially empty. `Task` is exactly `{ id: string, title: string, status: "todo" | "in_progress" | "done" }`. IDs are canonical positive decimal strings allocated in creation order, starting at `"1"`. Updates keep their position; deletion does not reuse IDs. Duplicate titles are allowed. Restart or a successful test reset clears tasks and restarts IDs at 1.

| Method | Route | Request | Success |
| --- | --- | --- | --- |
| GET | `/api/tasks` or `/api/tasks/` | No body | 200 `{ "tasks": Task[] }` |
| POST | `/api/tasks` | JSON `{ "title": string, "status"?: Status }` | 201 `{ "task": Task }`; default status `todo` |
| PATCH | `/api/tasks/:id` | JSON title, status, or both | 200 `{ "task": Task }` |
| DELETE | `/api/tasks/:id` | No body | 204, empty body |
| GET | `/health` | No body | 200 `{ "status": "ok" }`; no data changes |
| POST | `/api/test/reset` | No body; only `NODE_ENV=test` | 204, empty body |

The request's shorthand item routes are implemented with `:id`. GET-by-ID is intentionally outside the approved scope. All three status transitions are reversible.

## Validation and failures

Titles must be strings, trimmed before validating, with 1–200 UTF-16 code units (JavaScript `.length`). Create requires title; PATCH requires at least one of title/status. Unknown properties, arrays, null, and scalar bodies are rejected. Media type must be `application/json` (UTF-8, uncompressed); maximum JSON body size is 16 KiB.

Validation order is absent body, media type, size/JSON parsing, object shape/allowed keys, title, status, then item ID/existence. A valid empty POST object fails required-title validation. Entire patches are validated before mutation; failed requests change no tasks and consume no IDs. Errors have JSON shape `{ "error": { "code": string, "message": string, "field"?: string } }`. Messages are human-readable; rely on stable codes rather than exact prose.

| HTTP status | Code | Trigger |
| --- | --- | --- |
| 400 | `invalid_request` | Absent/invalid object, unknown keys, empty PATCH, malformed item ID, reset with a body |
| 400 | `invalid_json` | Malformed JSON |
| 400 | `invalid_title` | Missing/blank/non-string/oversized title; field `title` |
| 400 | `invalid_status` | Invalid status; field `status` |
| 404 | `not_found` | Missing task, unknown route, reset outside test mode |
| 413 | `payload_too_large` | JSON body above 16 KiB |
| 415 | `unsupported_media_type` | Unsupported media type/encoding |
| 500 | `internal_error` | Unexpected failure; generic message, no exception details/stack |

## Executable HTTP smoke example

Start `NODE_ENV=test npm run dev` in a separate terminal. Run these commands against a dedicated instance; the reset clears all its data. They use the default API port.

```sh
curl --fail-with-body -sS -i -X POST http://127.0.0.1:3001/api/test/reset
curl --fail-with-body -sS http://127.0.0.1:3001/health
curl --fail-with-body -sS http://127.0.0.1:3001/api/tasks/
curl --fail-with-body -sS -i -H 'Content-Type: application/json' -d '{"title":"  Write a test  "}' http://127.0.0.1:3001/api/tasks
curl --fail-with-body -sS -i -X PATCH -H 'Content-Type: application/json' -d '{"title":"Review the test","status":"in_progress"}' http://127.0.0.1:3001/api/tasks/1
curl --fail-with-body -sS http://127.0.0.1:3001/api/tasks
curl --fail-with-body -sS -i -X DELETE http://127.0.0.1:3001/api/tasks/1
curl --fail-with-body -sS http://127.0.0.1:3001/api/tasks
```

Expected sequence: reset 204/empty; health `ok`; empty list; create 201 with ID `1`, trimmed title `Write a test` and `todo`; PATCH 200 with title `Review the test` and `in_progress`; listing includes that task; DELETE 204/empty; listing is empty again.

Negative examples deliberately omit curl's `--fail-with-body` so their responses can be inspected:

```sh
curl -sS -i -H 'Content-Type: application/json' -d '{"title":"   "}' http://127.0.0.1:3001/api/tasks
curl -sS -i -H 'Content-Type: application/json' -d '{"title":"Valid","status":"blocked"}' http://127.0.0.1:3001/api/tasks
curl -sS -i -H 'Content-Type: application/json' -d '{invalid' http://127.0.0.1:3001/api/tasks
curl -sS -i -H 'Content-Type: text/plain' -d 'not JSON' http://127.0.0.1:3001/api/tasks
curl -sS -i -X DELETE http://127.0.0.1:3001/api/tasks/999
curl --fail-with-body -sS -i -X POST http://127.0.0.1:3001/api/test/reset
curl --fail-with-body -sS -i -X POST http://127.0.0.1:3001/api/test/reset
```

Expected errors: 400 `invalid_title`/field `title`; 400 `invalid_status`/field `status`; 400 `invalid_json`; 415 `unsupported_media_type`; 404 `not_found`. Both repeated resets return 204, and the next creation gets ID `1`. Restart without `NODE_ENV=test` and request reset again: it returns 404 even if a malformed body is supplied, preserving stored tasks.

## Isolation boundary

App factories own separate stores. A test reset is unauthenticated, affects the entire instance, and is not a UI feature. Run one worker per shared instance, or one instance/port per parallel worker. Use a separate instance for future MCP exploration. Never expose test mode as a public deployment.
