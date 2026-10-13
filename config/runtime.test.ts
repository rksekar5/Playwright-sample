import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { loadRuntimeConfig, readRuntimeConfig } from './runtime.js';

test('defaults provide matching cloud listeners and internal proxy', () => {
  assert.deepEqual(readRuntimeConfig({}), {
    host: '0.0.0.0', apiPort: 3001, uiPort: 5173, nodeEnv: 'development', apiTarget: 'http://127.0.0.1:3001',
  });
});

test('port and IPv6 overrides reach the same API instance', () => {
  assert.deepEqual(readRuntimeConfig({ APP_HOST: '::1', API_PORT: '3101', UI_PORT: '5273', NODE_ENV: 'test' }), {
    host: '::1', apiPort: 3101, uiPort: 5273, nodeEnv: 'test', apiTarget: 'http://[::1]:3101',
  });
});

test('invalid ports, colliding ports, and invalid hosts fail clearly', () => {
  for (const key of ['API_PORT', 'UI_PORT']) {
    for (const value of ['abc', '', '0', '65536', '-1', '1.5', '3001garbage']) {
      assert.throws(() => readRuntimeConfig({ [key]: value }), new RegExp(key));
    }
  }
  assert.throws(() => readRuntimeConfig({ UI_PORT: '3001' }), /must differ/);
  assert.throws(() => readRuntimeConfig({ APP_HOST: 'http://localhost' }), /APP_HOST/);
});

test('optional root .env is loaded without overriding injected settings', t => {
  const root = mkdtempSync(join(tmpdir(), 'taskboard-config-'));
  t.after(() => rmSync(root, { recursive: true }));
  assert.equal(loadRuntimeConfig(root, {}).apiPort, 3001);
  writeFileSync(join(root, '.env'), 'API_PORT=3101\nUI_PORT=5273\nNODE_ENV=test\n');
  const config = loadRuntimeConfig(root, { API_PORT: '3201', NODE_ENV: 'development' });
  assert.equal(config.apiPort, 3201);
  assert.equal(config.uiPort, 5273);
  assert.equal(config.nodeEnv, 'development');
});
