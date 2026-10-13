export type TaskStatus = 'todo' | 'in_progress' | 'done';
export interface Task { id: string; title: string; status: TaskStatus }

export const statuses: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

export class ApiError extends Error {
  constructor(message: string, public readonly code: string, public readonly field?: string) { super(message); }
}

const unexpected = () => new ApiError('The API returned an unexpected response. Refresh tasks and try again.', 'unexpected_response');
function object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object'; }
function task(value: unknown): Task {
  if (!object(value) || typeof value.id !== 'string' || !/^[1-9]\d*$/.test(value.id) || typeof value.title !== 'string' ||
      !statuses.some(status => status.value === value.status)) throw unexpected();
  return value as unknown as Task;
}

async function request(path: string, options: RequestInit, expectedStatus: number): Promise<unknown> {
  let response: Response;
  try { response = await fetch(`/api${path}`, options); }
  catch { throw new ApiError('Could not reach the API. Check the server and refresh before retrying.', 'network_error'); }
  if (response.ok && response.status === 204 && expectedStatus === 204) return undefined;
  let body: unknown;
  try { body = await response.json(); } catch { throw unexpected(); }
  if (!response.ok) {
    if (object(body) && object(body.error) && typeof body.error.message === 'string' && typeof body.error.code === 'string') {
      throw new ApiError(body.error.message, body.error.code, typeof body.error.field === 'string' ? body.error.field : undefined);
    }
    throw unexpected();
  }
  if (response.status !== expectedStatus) throw unexpected();
  return body;
}

function mutation(method: string, body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export const api = {
  async list(): Promise<Task[]> {
    const body = await request('/tasks', {}, 200);
    if (!object(body) || !Array.isArray(body.tasks)) throw unexpected();
    return body.tasks.map(task);
  },
  async create(title: string): Promise<Task> {
    const body = await request('/tasks', mutation('POST', { title }), 201);
    if (!object(body)) throw unexpected();
    return task(body.task);
  },
  async update(id: string, changes: { title?: string; status?: TaskStatus }): Promise<Task> {
    const body = await request(`/tasks/${encodeURIComponent(id)}`, mutation('PATCH', changes), 200);
    if (!object(body)) throw unexpected();
    return task(body.task);
  },
  async delete(id: string): Promise<void> { await request(`/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' }, 204); },
};

export function titleError(title: string): string | undefined {
  if (title.trim().length < 1 || title.trim().length > 200) return 'Title must contain 1–200 characters after trimming.';
  return undefined;
}

export function asApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : unexpected();
}
