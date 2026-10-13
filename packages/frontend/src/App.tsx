import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { api, ApiError, asApiError, statuses, titleError } from './api.js';
import type { Task, TaskStatus } from './api.js';
import { TaskCard } from './TaskCard.js';

export function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [title, setTitle] = useState('');
  const [createError, setCreateError] = useState<ApiError | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyIds, setBusyIds] = useState(new Set<string>());
  const createLock = useRef(false);
  const refreshLock = useRef(false);
  const busyRef = useRef(new Set<string>());
  const titleId = useId();
  const createErrorId = useId();

  async function refresh() {
    if (refreshLock.current || createLock.current || busyRef.current.size > 0) return;
    refreshLock.current = true;
    setRefreshing(true);
    setLoadError(null);
    try { setTasks(await api.list()); setLoaded(true); }
    catch (error) { setLoadError(asApiError(error)); }
    finally { refreshLock.current = false; setRefreshing(false); }
  }

  useEffect(() => { void refresh(); }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createLock.current || refreshLock.current || !loaded) return;
    const validation = titleError(title);
    if (validation) { setCreateError(new ApiError(validation, 'invalid_title', 'title')); return; }
    createLock.current = true;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await api.create(title.trim());
      setTasks(current => [...current, created].sort((a, b) => BigInt(a.id) < BigInt(b.id) ? -1 : 1));
      setTitle('');
    } catch (error) { setCreateError(asApiError(error)); }
    finally { createLock.current = false; setCreating(false); }
  }

  async function update(id: string, changes: { title?: string; status?: TaskStatus }) {
    const updated = await api.update(id, changes);
    setTasks(current => current.map(task => task.id === id ? updated : task));
  }

  async function remove(id: string) {
    await api.delete(id);
    setTasks(current => current.filter(task => task.id !== id));
  }

  function busy(id: string, value: boolean) {
    if (value) busyRef.current.add(id); else busyRef.current.delete(id);
    setBusyIds(new Set(busyRef.current));
  }

  const titleInvalid = createError?.field === 'title';
  const completed = tasks.filter(task => task.status === 'done').length;
  return (
    <>
      <header className="site-header">
        <a className="brand" href="/" aria-label="TaskBoard home"><span className="brand-icon" aria-hidden="true">▦</span>TaskBoard</a>
        <span className="lab-badge">TESTING LAB</span>
      </header>
      <main>
        <div className="board-heading">
          <div><p className="eyebrow">YOUR WORK, AT A GLANCE</p><h1>TaskBoard</h1><p className="subtitle">A little structure for what comes next.</p></div>
          <div className="board-summary"><strong>{tasks.length}</strong> tasks<span aria-hidden="true"> · </span><strong>{completed}</strong> done</div>
        </div>
        <form className="create-form" onSubmit={event => { void create(event); }} noValidate>
          <div className="create-field"><label htmlFor={titleId}>Task title</label>
            <input id={titleId} placeholder="What needs to get done?" value={title}
              onChange={event => { setTitle(event.target.value); setCreateError(null); }} disabled={creating || refreshing || !loaded}
              aria-invalid={titleInvalid} aria-describedby={titleInvalid ? createErrorId : undefined} />
          </div>
          <button type="submit" disabled={creating || refreshing || !loaded}>{creating ? 'Adding…' : 'Add task'}</button>
          {createError && <p role="alert" id={createErrorId} className="error create-error">{createError.message}</p>}
        </form>
        <div className="board-toolbar"><span className="workspace-label"><span className="live-dot" aria-hidden="true" />In-memory workspace</span>
          <button type="button" className="quiet" disabled={refreshing || creating || busyIds.size > 0} onClick={() => { void refresh(); }}>Refresh tasks</button>
        </div>
        {refreshing && <p role="status" className="load-status">Loading tasks…</p>}
        {loadError && <p role="alert" className="error load-error">{loadError.message}</p>}
        <div className="board">
          {statuses.map(status => {
            const items = tasks.filter(task => task.status === status.value);
            return (
              <section key={status.value} className={`column column-${status.value}`} aria-labelledby={`heading-${status.value}`}>
                <div className="column-heading"><h2 id={`heading-${status.value}`}><span className="status-dot" aria-hidden="true" />{status.label}</h2><span className="count" aria-label={`${items.length} tasks`}>{items.length}</span></div>
                {items.map(task => <TaskCard key={task.id} task={task} refreshing={refreshing} onUpdate={update} onDelete={remove} onBusy={busy} />)}
                {loaded && items.length === 0 && <div className="empty-state"><span aria-hidden="true">＋</span><p>No tasks here yet</p><small>{status.value === 'todo' ? 'Add a task to get started.' : 'Move a task here when it’s ready.'}</small></div>}
              </section>
            );
          })}
        </div>
        <footer className="board-footer"><span>Simple tasks. Visible progress.</span><span>Data resets when the API restarts.</span></footer>
      </main>
    </>
  );
}
