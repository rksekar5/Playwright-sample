import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { createApp } from '../src/app.js';
import { TaskStore } from '../src/tasks.js';

async function start(t: TestContext, options: Parameters<typeof createApp>[0] = {}) {
  const server = createApp(options).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return (path: string, options?: RequestInit) => fetch(base + path, options);
}
const json = (method: string, value: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });

test('HTTP task lifecycle includes list alias, trimming, duplicate titles, partial edits, and deletion', async t => {
  const request = await start(t);
  assert.deepEqual(await (await request('/api/tasks/')).json(), { tasks: [] });
  let response = await request('/api/tasks', json('POST', { title: '  One  ' }));
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { task: { id: '1', title: 'One', status: 'todo' } });
  assert.equal((await request('/api/tasks', json('POST', { title: 'One', status: 'done' }))).status, 201);
  response = await request('/api/tasks/1', json('PATCH', { title: ' Renamed ', status: 'in_progress' }));
  assert.deepEqual(await response.json(), { task: { id: '1', title: 'Renamed', status: 'in_progress' } });
  for (const status of ['done', 'todo']) {
    const result = await request('/api/tasks/1', json('PATCH', { status }));
    assert.deepEqual(await result.json(), { task: { id: '1', title: 'Renamed', status } });
  }
  const listing = await (await request('/api/tasks')).json();
  assert.deepEqual(listing.tasks.map((task: { id: string }) => task.id), ['1', '2']);
  response = await request('/api/tasks/1', { method: 'DELETE' });
  assert.equal(response.status, 204); assert.equal(await response.text(), '');
  assert.equal((await (await request('/api/tasks', json('POST', { title: 'Three' }))).json()).task.id, '3');
});

test('rejected mutations are atomic and do not consume IDs', async t => {
  const request = await start(t);
  const error = await request('/api/tasks', json('POST', { title: '   ' }));
  assert.equal(error.status, 400);
  assert.deepEqual(await error.json(), { error: { code: 'invalid_title', message: 'Title must contain 1–200 characters after trimming.', field: 'title' } });
  await request('/api/tasks', json('POST', { title: 'Original' }));
  const invalidPatch = await request('/api/tasks/1', json('PATCH', { title: 'Should not change', status: 'blocked' }));
  assert.equal(invalidPatch.status, 400);
  assert.equal((await invalidPatch.json()).error.code, 'invalid_status');
  assert.deepEqual(await (await request('/api/tasks')).json(), { tasks: [{ id: '1', title: 'Original', status: 'todo' }] });
});

test('transport failures and invalid body shapes return JSON errors', async t => {
  const request = await start(t);
  const cases: [RequestInit, number, string][] = [
    [{ method: 'POST' }, 400, 'invalid_request'],
    [{ method: 'POST', body: 'hello', headers: { 'Content-Type': 'text/plain' } }, 415, 'unsupported_media_type'],
    [{ method: 'POST', body: '{broken', headers: { 'Content-Type': 'application/json' } }, 400, 'invalid_json'],
    [json('POST', null), 400, 'invalid_request'],
    [json('POST', []), 400, 'invalid_request'],
    [json('POST', { title: 'Hello', id: '9' }), 400, 'invalid_request'],
    [json('POST', { title: 'x'.repeat(17000) }), 413, 'payload_too_large'],
  ];
  for (const [options, status, code] of cases) {
    const response = await request('/api/tasks', options);
    assert.equal(response.status, status);
    assert.match(response.headers.get('content-type')!, /application\/json/);
    const body = await response.json();
    assert.equal(body.error.code, code);
    assert.ok(body.error.message.length > 0);
    assert.equal('stack' in body.error, false);
  }
  const emptyPatch = await request('/api/tasks/1', json('PATCH', {}));
  assert.equal((await emptyPatch.json()).error.code, 'invalid_request');
  assert.deepEqual(await (await request('/api/tasks')).json(), { tasks: [] });
});

test('health, unknown routes, missing tasks, and malformed IDs have stable contracts', async t => {
  const request = await start(t);
  const health = await request('/health');
  assert.equal(health.status, 200); assert.deepEqual(await health.json(), { status: 'ok' });
  for (const [path, method, status, code] of [
    ['/api/unknown', 'GET', 404, 'not_found'],
    ['/api/tasks/999', 'DELETE', 404, 'not_found'],
    ['/api/tasks/abc', 'DELETE', 400, 'invalid_request'],
    ['/api/tasks/%E0%A4%A', 'DELETE', 400, 'invalid_request'],
    ['/api/tasks/01', 'PATCH', 400, 'invalid_request'],
    ['/api/tasks/999', 'PATCH', 404, 'not_found'],
  ] as const) {
    const response = await request(path, method === 'PATCH' ? json(method, { title: 'Valid' }) : { method });
    assert.equal(response.status, status); assert.equal((await response.json()).error.code, code);
  }
});

test('test reset is repeatable, restarts IDs, and rejects any body without mutation', async t => {
  const request = await start(t, { nodeEnv: 'test' });
  await request('/api/tasks', json('POST', { title: 'One' }));
  for (const body of ['{}', '{invalid', 'anything']) {
    const response = await request('/api/test/reset', { method: 'POST', body });
    assert.equal(response.status, 400); assert.equal((await response.json()).error.code, 'invalid_request');
  }
  assert.equal((await (await request('/api/tasks')).json()).tasks.length, 1);
  for (let i = 0; i < 2; i++) {
    const response = await request('/api/test/reset', { method: 'POST' });
    assert.equal(response.status, 204); assert.equal(await response.text(), '');
  }
  assert.deepEqual(await (await request('/api/tasks')).json(), { tasks: [] });
  assert.equal((await (await request('/api/tasks', json('POST', { title: 'Again' }))).json()).task.id, '1');
});

test('reset is disabled outside test mode even for malformed bodies', async t => {
  for (const nodeEnv of [undefined, 'development', 'production']) {
    const request = await start(t, nodeEnv === undefined ? {} : { nodeEnv });
    await request('/api/tasks', json('POST', { title: 'Keep' }));
    const response = await request('/api/test/reset', { method: 'POST', body: '{invalid', headers: { 'Content-Type': 'application/json' } });
    assert.equal(response.status, 404); assert.equal((await response.json()).error.code, 'not_found');
    assert.equal((await (await request('/api/tasks')).json()).tasks.length, 1);
  }
});

test('unexpected handler failures expose only a generic error', async t => {
  const store = new TaskStore();
  t.mock.method(store, 'list', () => { throw new Error('private implementation detail'); });
  t.mock.method(console, 'error', () => {});
  const request = await start(t, { store });
  const response = await request('/api/tasks');
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: { code: 'internal_error', message: 'An unexpected server error occurred.' } });
});
