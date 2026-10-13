import assert from 'node:assert/strict';
import { test } from 'node:test';
import { api, titleError } from '../src/api.js';

test('client uses same-origin requests and validates task responses', async t => {
  const task = { id: '1', title: 'One', status: 'todo' };
  const calls: [unknown, RequestInit | undefined][] = [];
  t.mock.method(globalThis, 'fetch', async (url: unknown, options?: RequestInit) => {
    calls.push([url, options]);
    return Response.json({ task }, { status: options?.method === 'POST' ? 201 : 200 });
  });
  assert.deepEqual(await api.create('One'), task);
  assert.deepEqual(await api.update('1', { status: 'done' }), task);
  assert.deepEqual(calls.map(([url]) => url), ['/api/tasks', '/api/tasks/1']);
  assert.equal(calls[0]?.[1]?.body, '{"title":"One"}');
  assert.equal(calls[1]?.[1]?.body, '{"status":"done"}');
});

test('delete handles an empty 204 response without JSON parsing', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 204 }));
  assert.equal(await api.delete('1'), undefined);
});

test('server field errors, network failures, and malformed successes remain readable', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({ error: { code: 'invalid_title', message: 'Bad title', field: 'title' } }, { status: 400 }));
  await assert.rejects(api.create('One'), { message: 'Bad title', code: 'invalid_title', field: 'title' });
  mock.mock.mockImplementation(async () => { throw new Error('Socket failure'); });
  await assert.rejects(api.list(), { code: 'network_error' });
  mock.mock.mockImplementation(async () => new Response('<html>Not JSON</html>'));
  await assert.rejects(api.list(), { code: 'unexpected_response' });
  mock.mock.mockImplementation(async () => Response.json({ tasks: [{ id: '1', title: 'One', status: 'blocked' }] }));
  await assert.rejects(api.list(), { code: 'unexpected_response' });
});

test('frontend title validation follows the trimmed UTF-16 boundary', () => {
  assert.ok(titleError('  '));
  assert.ok(titleError('x'.repeat(201)));
  assert.equal(titleError('  valid  '), undefined);
  assert.equal(titleError('😀'.repeat(100)), undefined);
  assert.ok(titleError('😀'.repeat(101)));
});
