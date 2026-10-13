# Spec Delta

## Purpose

Give users an accessible TaskBoard for exercising real task API behavior, with stable controls and visible failure states suitable for later browser automation.

## ADDED Requirements

### Requirement: Task listing and status groups
The frontend SHALL load tasks from the API on entry and display their titles in sections named `To Do`, `In Progress`, and `Done`, mapping statuses `todo`, `in_progress`, and `done` respectively. Tasks SHALL appear in API creation order within each section. Successfully loaded empty sections SHALL display an explicit empty state.

#### Scenario: Populate the board
- **WHEN** the API returns tasks in all three statuses
- **THEN** each title appears in its matching named section and each section preserves API order

#### Scenario: Empty board
- **WHEN** the API successfully returns an empty collection
- **THEN** all three sections remain visible with an explicit empty state and the create form remains usable

### Requirement: Loading and refresh failures
The frontend SHALL display a loading indicator while listing is pending and an announced API-error message if listing fails. It SHALL provide a `Refresh tasks` control to retry. A failed initial load SHALL not be presented as a successful empty board; failed refreshes SHALL retain previously loaded tasks.

#### Scenario: Initial loading and failure
- **WHEN** the initial list request is pending and then fails
- **THEN** a loading indicator is shown while pending, then an error and enabled refresh control appear without a misleading empty state

#### Scenario: Retry and refresh recovery
- **WHEN** the user activates `Refresh tasks` after a failure and the API succeeds
- **THEN** the failure message clears and the board shows the returned tasks

#### Scenario: Preserve data on refresh failure
- **WHEN** a board with loaded tasks is refreshed and the API fails
- **THEN** those tasks remain visible and an API-error message is announced

### Requirement: Create tasks
The frontend SHALL provide a labelled `Task title` input and an `Add task` submit button. A successful submission SHALL create a `todo` task through the API, show the returned task in `To Do`, and clear the input only after success. The form SHALL disable duplicate submission while the request is pending.

#### Scenario: Successful creation
- **WHEN** the user submits a valid title and the API returns a created task
- **THEN** the new title appears in `To Do` and the input is cleared

#### Scenario: Repeated activation while pending
- **WHEN** the user activates `Add task` while its previous submission is still pending
- **THEN** no additional creation request is sent for that pending submission

### Requirement: Title validation and failed creation
Create/edit forms SHALL apply the API's trimmed 1–200 code-unit title rule, identify invalid input through associated readable messages, and make no request for locally invalid titles. API field errors SHALL be shown with their relevant form. Failed creation SHALL preserve the entered title, announce an error, and display no unconfirmed new task.

#### Scenario: Blank or oversized input
- **WHEN** a create/edit form is submitted with an empty, whitespace-only, or oversized trimmed title
- **THEN** it shows an associated validation message, marks the input invalid, and sends no mutation request

#### Scenario: Server-side validation or API failure
- **WHEN** a submitted valid-looking title receives an API validation error or another failed response
- **THEN** the input is preserved, the error is visible and announced, and no task is added to the board

### Requirement: Edit task titles
Each task SHALL provide `Edit title`, a labelled title input while editing, and `Save title` and `Cancel` controls. Saving SHALL send a title-only PATCH and update the displayed title only after API success. Cancel SHALL discard the draft without a mutation. A failed save SHALL retain both the last confirmed title and the editable draft, with a visible error.

#### Scenario: Rename a task
- **WHEN** the user edits a title and the API confirms the saved task
- **THEN** the card displays the trimmed new title with its ID and status unchanged

#### Scenario: Cancel an edit
- **WHEN** the user changes an editable title and activates `Cancel`
- **THEN** the original title remains and no PATCH request is sent

#### Scenario: Failed edit
- **WHEN** the API rejects a title edit
- **THEN** the last confirmed title remains, the draft remains available for correction, and an error is displayed

### Requirement: Change task status
Each task SHALL provide a labelled `Status` control with `To Do`, `In Progress`, and `Done` options. A change SHALL send a status-only PATCH and move the task to the corresponding section only after API success. On failure its confirmed status and section SHALL remain unchanged and an error SHALL be announced.

#### Scenario: Successful status changes
- **WHEN** the user changes a task from `To Do` to `In Progress`, then `Done`, then back to `To Do`, with successful API responses
- **THEN** the task appears in the matching section after each change while retaining its title and ID

#### Scenario: Failed status update
- **WHEN** the API rejects a status change
- **THEN** the control returns to the confirmed status, the task stays in its original section, and an error appears

### Requirement: Delete tasks
Each task SHALL provide a `Delete task` control. The frontend SHALL remove a card only after a successful DELETE response and show the section's empty state when its last task is removed. Failed deletion SHALL retain the card and announce an error. Conflicting actions on the same task SHALL be disabled while a mutation is pending.

#### Scenario: Successful deletion
- **WHEN** the API confirms deletion of the only task in a section
- **THEN** the card disappears and the section displays its empty state

#### Scenario: Failed deletion
- **WHEN** deletion fails or the network request fails
- **THEN** the task remains visible, an error appears, and controls are re-enabled after the request settles

### Requirement: Accessible and stable interaction targets
The frontend SHALL provide semantic headings, named status sections, labelled form controls, keyboard-operable buttons, and a stable accessible task container name `Task <id>`. Errors SHALL use an announced alert; field errors SHALL be associated with their inputs. Core interactions SHALL be identifiable by roles and accessible names without CSS classes or positional selectors.

#### Scenario: Keyboard task workflow
- **WHEN** a user navigates with the keyboard to create, edit, change status, and delete a task
- **THEN** each relevant input and action is reachable, has a meaningful accessible name, and can be activated without a mouse

#### Scenario: Stable task targeting after edits
- **WHEN** task `1` is renamed or moved to another status
- **THEN** its container remains accessible as `Task 1` with its actions and labels scoped inside it

#### Scenario: Error association
- **WHEN** a title is rejected by local or API field validation
- **THEN** its input exposes invalid state and references the visible error message, which is announced to assistive technology
