import { useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, asApiError, statuses, titleError } from './api.js';
import type { Task, TaskStatus } from './api.js';

interface Props {
  task: Task;
  refreshing: boolean;
  onUpdate: (id: string, changes: { title?: string; status?: TaskStatus }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBusy: (id: string, busy: boolean) => void;
}

export function TaskCard({ task, refreshing, onUpdate, onDelete, onBusy }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const lock = useRef(false);
  const inputId = useId();
  const errorId = useId();

  async function mutate(action: () => Promise<void>, afterSuccess?: () => void) {
    if (lock.current || refreshing) return;
    lock.current = true;
    setPending(true);
    onBusy(task.id, true);
    setError(null);
    try { await action(); afterSuccess?.(); }
    catch (failure) { setError(asApiError(failure)); }
    finally { lock.current = false; setPending(false); onBusy(task.id, false); }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = titleError(draft);
    if (validation) { setError(new ApiError(validation, 'invalid_title', 'title')); return; }
    void mutate(() => onUpdate(task.id, { title: draft.trim() }), () => setEditing(false));
  }

  const fieldError = error !== null && error.field === 'title';
  return (
    <article className="task-card" aria-label={`Task ${task.id}`} aria-busy={pending}>
      <span className="task-id">TASK {task.id.padStart(2, '0')}</span>
      <h3>{task.title}</h3>
      {editing ? (
        <form onSubmit={save} noValidate>
          <label htmlFor={inputId}>Task title</label>
          <input id={inputId} value={draft} onChange={event => { setDraft(event.target.value); setError(null); }}
            autoFocus disabled={pending || refreshing} aria-invalid={fieldError} aria-describedby={fieldError ? errorId : undefined} />
          <div className="edit-actions">
            <button type="submit" disabled={pending || refreshing}>Save title</button>
            <button type="button" className="quiet" disabled={pending || refreshing}
              onClick={() => { setEditing(false); setDraft(task.title); setError(null); }}>Cancel</button>
          </div>
        </form>
      ) : (
        <button type="button" className="text-button" disabled={pending || refreshing}
          onClick={() => { setDraft(task.title); setError(null); setEditing(true); }}>Edit title</button>
      )}
      {error && <p role="alert" id={errorId} className="error">{error.message}</p>}
      <div className="card-footer">
        <label className="status-control">Status
          <select value={task.status} disabled={editing || pending || refreshing}
            onChange={event => { void mutate(() => onUpdate(task.id, { status: event.target.value as TaskStatus })); }}>
            {statuses.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
        </label>
        <button type="button" className="delete-button" disabled={editing || pending || refreshing}
          onClick={() => { void mutate(() => onDelete(task.id)); }}>Delete task</button>
      </div>
      {pending && <p className="pending" role="status">Saving changes…</p>}
    </article>
  );
}
