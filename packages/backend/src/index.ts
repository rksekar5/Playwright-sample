import { resolve } from 'node:path';
import { loadRuntimeConfig } from '../../../config/runtime.js';
import { createApp } from './app.js';

// npm workspace commands run with packages/backend as their working directory.
const config = loadRuntimeConfig(resolve(process.cwd(), '../..'));
const server = createApp({ nodeEnv: config.nodeEnv }).listen(config.apiPort, config.host, () => {
  console.log(`TaskBoard API listening on ${config.host}:${config.apiPort} (${config.nodeEnv}).`);
});
server.on('error', error => { console.error(`API startup failed: ${error.message}`); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close(() => { process.exit(0); });
    setTimeout(() => { server.closeAllConnections(); process.exit(0); }, 5000).unref();
  });
}
