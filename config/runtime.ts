import { readFileSync } from 'node:fs';
import { isIP } from 'node:net';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

export interface RuntimeConfig {
  host: string;
  apiPort: number;
  uiPort: number;
  nodeEnv: string;
  apiTarget: string;
}

function port(name: string, value: string): number {
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
    throw new Error(`${name} must be an integer from 1 to 65535.`);
  }
  return Number(value);
}

export function readRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const host = env.APP_HOST ?? '0.0.0.0';
  if (!isIP(host) && host !== 'localhost') {
    throw new Error('APP_HOST must be an IP address or localhost.');
  }
  const apiPort = port('API_PORT', env.API_PORT ?? '3001');
  const uiPort = port('UI_PORT', env.UI_PORT ?? '5173');
  if (apiPort === uiPort) throw new Error('API_PORT and UI_PORT must differ.');
  const targetHost = host === '0.0.0.0' ? '127.0.0.1' : host === '::' ? '::1' : host;
  return {
    host, apiPort, uiPort,
    nodeEnv: env.NODE_ENV ?? 'development',
    apiTarget: `http://${isIP(targetHost) === 6 ? `[${targetHost}]` : targetHost}:${apiPort}`,
  };
}

/** Root .env is optional; injected process settings always take precedence. */
export function loadRuntimeConfig(repositoryRoot: string, env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  let fileSettings: NodeJS.ProcessEnv = {};
  try {
    fileSettings = parseEnv(readFileSync(resolve(repositoryRoot, '.env'), 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const injected = Object.fromEntries(Object.entries(env).filter(([, value]) => value !== undefined));
  return readRuntimeConfig({ ...fileSettings, ...injected });
}
