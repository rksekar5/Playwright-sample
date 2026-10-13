import { ApiError } from './errors.js';

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export interface Task { id: string; title: string; status: TaskStatus }
export interface TaskChanges { title?: string; status?: TaskStatus }

/** A store belongs to one app instance. Never share it across independent tests. */
export class TaskStore {
  private tasks = new Map<string, Task>();
  private nextId = 1n;

  list(): Task[] { return [...this.tasks.values()].map(task => ({ ...task })); }

  create(input: TaskChanges & { title: string }): Task {
    const task: Task = { id: String(this.nextId++), title: input.title, status: input.status ?? 'todo' };
    this.tasks.set(task.id, task);
    return { ...task };
  }

  update(id: string, changes: TaskChanges): Task {
    const existing = this.tasks.get(id);
    if (!existing) throw new ApiError(404, 'not_found', 'Task not found.');
    const task = { ...existing, ...changes };
    this.tasks.set(id, task);
    return { ...task };
  }

  delete(id: string): void {
    if (!this.tasks.delete(id)) throw new ApiError(404, 'not_found', 'Task not found.');
  }

  reset(): void { this.tasks.clear(); this.nextId = 1n; }
}

export function validateChanges(body: unknown, creating: boolean): TaskChanges {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'invalid_request', 'Request body must be a JSON object.');
  }
  const record = body as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.some(key => key !== 'title' && key !== 'status') || (!creating && keys.length === 0)) {
    throw new ApiError(400, 'invalid_request', 'Use only title and status; updates need at least one field.');
  }
  const changes: TaskChanges = {};
  if (creating || Object.hasOwn(record, 'title')) {
    if (typeof record.title !== 'string' || record.title.trim().length < 1 || record.title.trim().length > 200) {
      throw new ApiError(400, 'invalid_title', 'Title must contain 1–200 characters after trimming.', 'title');
    }
    changes.title = record.title.trim();
  }
  if (Object.hasOwn(record, 'status')) {
    if (record.status !== 'todo' && record.status !== 'in_progress' && record.status !== 'done') {
      throw new ApiError(400, 'invalid_status', 'Status must be todo, in_progress, or done.', 'status');
    }
    changes.status = record.status;
  }
  return changes;
}

export function validateId(id: unknown): string {
  if (typeof id !== 'string' || !/^[1-9]\d*$/.test(id)) {
    throw new ApiError(400, 'invalid_request', 'Task ID must be a positive decimal string without leading zeros.');
  }
  return id;
}
