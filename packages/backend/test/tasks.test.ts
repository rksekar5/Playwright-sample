import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TaskStore, validateChanges, validateId } from '../src/tasks.js';

test('store is isolated, returns copies, preserves order, and never reuses deleted IDs', () => {
  const store = new TaskStore();
  const first = store.create({ title: 'One' });
  store.create({ title: 'Two' });
  first.title = 'Client mutation';
  store.update('1', { status: 'done' });
  assert.deepEqual(store.list(), [
    { id: '1', title: 'One', status: 'done' }, { id: '2', title: 'Two', status: 'todo' },
  ]);
  assert.deepEqual(new TaskStore().list(), []);
  store.delete('1');
  assert.equal(store.create({ title: 'Three' }).id, '3');
  store.reset(); store.reset();
  assert.deepEqual(store.list(), []);
  assert.equal(store.create({ title: 'Again' }).id, '1');
});

test('validation trims titles and rejects invalid fields before mutation', () => {
  assert.deepEqual(validateChanges({ title: '  Hello  ', status: 'done' }, true), { title: 'Hello', status: 'done' });
  for (const body of [null, [], 1, { id: '1', title: 'Hello' }]) {
    assert.throws(() => validateChanges(body, true), { code: 'invalid_request' });
  }
  for (const title of [undefined, null, 7, '', ' \n ', 'x'.repeat(201)]) {
    assert.throws(() => validateChanges({ title }, true), { code: 'invalid_title', field: 'title' });
  }
  assert.equal(validateChanges({ title: 'x'.repeat(200) }, true).title?.length, 200);
  assert.equal(validateChanges({ title: '😀'.repeat(100) }, true).title?.length, 200);
  assert.throws(() => validateChanges({ title: '😀'.repeat(101) }, true), { code: 'invalid_title' });
  for (const status of [null, 1, 'Done', 'blocked']) {
    assert.throws(() => validateChanges({ title: 'Hello', status }, true), { code: 'invalid_status', field: 'status' });
  }
  assert.deepEqual(validateChanges({ status: 'todo' }, false), { status: 'todo' });
  assert.throws(() => validateChanges({}, false), { code: 'invalid_request' });
  assert.throws(() => validateChanges({}, true), { code: 'invalid_title' });
});

test('canonical positive IDs and missing tasks have distinct failures', () => {
  assert.equal(validateId('999999999999999999999999'), '999999999999999999999999');
  for (const id of ['abc', '0', '01', '-1', '1.5', ' 1', 1, undefined]) {
    assert.throws(() => validateId(id), { code: 'invalid_request' });
  }
  const store = new TaskStore();
  assert.throws(() => store.update('1', { title: 'One' }), { status: 404, code: 'not_found' });
  assert.throws(() => store.delete('1'), { status: 404, code: 'not_found' });
});
