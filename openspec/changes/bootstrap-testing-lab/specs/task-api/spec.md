# Spec Delta

## Purpose

Provide a small, predictable task API that supports TaskBoard interactions and a repeatable system under test for future automated API and browser tests.

## ADDED Requirements

### Requirement: Task representation and listing
The API SHALL represent tasks with exactly `id` (positive decimal string), `title` (trimmed string), and `status` (`todo`, `in_progress`, or `done`). `GET /api/tasks` and `GET /api/tasks/` SHALL return HTTP 200 JSON `{ "tasks": [...] }` in creation order. A newly started process SHALL contain no tasks.

#### Scenario: Empty collection and trailing slash
- **WHEN** a newly started API receives GET requests to `/api/tasks` and `/api/tasks/`
- **THEN** both return 200 with `{ "tasks": [] }`

#### Scenario: Stable representation and order
- **WHEN** two tasks have been created and the first task is edited
- **THEN** GET `/api/tasks` returns both in their original creation order, each with exactly `id`, `title`, and `status`

### Requirement: Task creation
`POST /api/tasks` SHALL accept a JSON object containing required `title` and optional `status`, default status to `todo`, and return 201 JSON `{ "task": { "id", "title", "status" } }`. Successful creations SHALL receive consecutive IDs starting at `"1"`; failed requests SHALL neither create tasks nor consume IDs. Duplicate valid titles SHALL be allowed.

#### Scenario: Create with default status and trim title
- **WHEN** POST `/api/tasks` receives `{ "title": "  Write a test  " }` on an empty store
- **THEN** it returns 201 with `{ "task": { "id": "1", "title": "Write a test", "status": "todo" } }` and listing includes that task

#### Scenario: Explicit status and duplicate titles
- **WHEN** two valid creations use the same title and the second supplies `"status": "done"`
- **THEN** both succeed with different consecutive IDs and the second task has status `done`

### Requirement: Title and status validation
Titles SHALL be strings containing 1–200 UTF-16 code units after trimming whitespace. Missing required, empty, whitespace-only, non-string, or oversized titles SHALL return 400 `invalid_title` with field `title`. Supplied statuses SHALL exactly match `todo`, `in_progress`, or `done`; all other values SHALL return 400 `invalid_status` with field `status`. Rejected requests SHALL leave the store unchanged.

#### Scenario: Invalid titles
- **WHEN** a creation omits `title`, or a create/edit supplies null, a number, an empty or whitespace-only title, or 201 code units after trimming
- **THEN** it returns 400 with error code `invalid_title` and field `title`, without storing a change

#### Scenario: Maximum length
- **WHEN** a creation supplies a title of exactly 200 code units after trimming
- **THEN** it succeeds with that trimmed title

#### Scenario: Invalid statuses
- **WHEN** a create/edit supplies status `"Done"`, `"blocked"`, null, or a number
- **THEN** it returns 400 with error code `invalid_status` and field `status`, without storing a change

### Requirement: Atomic task updates
`PATCH /api/tasks/:id` SHALL accept a JSON object containing `title`, `status`, or both, require at least one field, and return 200 `{ "task": ... }` with the updated task. Omitted fields and the ID SHALL remain unchanged. The API SHALL validate the entire request before applying any change; all three valid statuses SHALL be reachable from any current status.

#### Scenario: Rename and change status
- **WHEN** PATCH `/api/tasks/1` receives a valid title and status `in_progress` for an existing task
- **THEN** it returns 200 with the same ID, trimmed new title, and status `in_progress`

#### Scenario: Status-only edit and reverse transition
- **WHEN** a task in `done` is patched with only `"status": "todo"`
- **THEN** its title and ID remain unchanged and its status becomes `todo`

#### Scenario: Partial validation failure
- **WHEN** an existing task is patched with a valid new title and invalid status
- **THEN** the API returns 400 and both original title and status remain unchanged

### Requirement: Deletion and item identity
`DELETE /api/tasks/:id` SHALL remove an existing task and return 204 with no body. Item IDs SHALL be canonical positive decimal strings; malformed IDs SHALL return 400 `invalid_request`. A valid ID absent from the store SHALL return 404 `not_found` for PATCH and DELETE. Deletion SHALL not reuse IDs before a reset or process restart.

#### Scenario: Delete a task
- **WHEN** DELETE `/api/tasks/1` targets an existing task
- **THEN** it returns 204 with an empty body and subsequent listing omits that task

#### Scenario: Unknown and malformed IDs
- **WHEN** valid PATCH/DELETE requests target absent ID `999` or malformed ID `abc`, `0`, or `01`
- **THEN** absent IDs return 404 `not_found` and malformed IDs return 400 `invalid_request`, without changing tasks

#### Scenario: IDs are not reused after deletion
- **WHEN** task `1` is created and deleted, followed by another valid creation
- **THEN** the new task receives ID `2`

### Requirement: Request shape and transport validation
Create/update requests SHALL use `application/json` and object bodies with only `title` and `status`. Arrays, null, unknown properties, empty PATCH objects, or absent bodies SHALL return 400 `invalid_request`. Malformed JSON SHALL return 400 `invalid_json`; unsupported media types SHALL return 415 `unsupported_media_type`; bodies above 16 KiB SHALL return 413 `payload_too_large`. All failures SHALL preserve state.

#### Scenario: Invalid object shape
- **WHEN** a create/update sends an array, null, an unknown property such as `id`, an absent body, or an empty PATCH object
- **THEN** it returns 400 `invalid_request` without changing tasks

#### Scenario: Invalid JSON or media type
- **WHEN** a mutation sends malformed JSON with JSON content type, or a body with `text/plain`
- **THEN** it returns 400 `invalid_json` or 415 `unsupported_media_type`, respectively, without changing tasks

#### Scenario: Oversized request
- **WHEN** a JSON mutation body exceeds 16 KiB
- **THEN** it returns 413 `payload_too_large` without changing tasks

### Requirement: Consistent error responses
API failures SHALL return JSON `{ "error": { "code": "...", "message": "...", "field"?: "..." } }` with a stable code and nonempty human-readable message. Unknown API routes SHALL return 404 `not_found`. Unexpected failures SHALL return 500 `internal_error` with a generic message; responses SHALL not expose stack traces or internal exception details.

#### Scenario: Field validation error contract
- **WHEN** a request contains an invalid title
- **THEN** it returns a JSON error object with code `invalid_title`, a nonempty message, and field `title`

#### Scenario: Unknown API route
- **WHEN** GET `/api/unknown` is requested
- **THEN** it returns 404 with JSON error code `not_found`

#### Scenario: Unexpected server failure
- **WHEN** an internal request handler unexpectedly fails
- **THEN** the response is 500 JSON with code `internal_error` and a generic message that contains no stack trace or exception details

### Requirement: Deterministic test reset
Only when started with `NODE_ENV=test`, the API SHALL expose `POST /api/test/reset`, accepting no request body and returning 204 with no body. Each reset SHALL clear all tasks and restart ID allocation at `1`. In all other modes the route SHALL return 404 `not_found` and preserve tasks. Process restart SHALL also restore the empty baseline.

#### Scenario: Reset and repeat
- **WHEN** tasks have been created in test mode and the reset endpoint is called twice
- **THEN** both resets return 204, listing is empty, and the next valid creation receives ID `1`

#### Scenario: Reset with a body
- **WHEN** a test-mode reset request includes a nonempty body
- **THEN** it returns 400 `invalid_request` and leaves the current store unchanged

#### Scenario: Reset unavailable outside test mode
- **WHEN** the reset endpoint is requested with `NODE_ENV` unset, `development`, or `production`
- **THEN** it returns 404 `not_found` and does not change tasks

#### Scenario: No durable persistence
- **WHEN** the API process is stopped and restarted after creating tasks
- **THEN** listing is empty and the next creation receives ID `1`
