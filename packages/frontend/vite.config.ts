import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { loadRuntimeConfig } from '../../config/runtime.js';

export default defineConfig(() => {
  const config = loadRuntimeConfig(fileURLToPath(new URL('../../', import.meta.url)));
  return {
    plugins: [react()],
    server: { host: config.host, port: config.uiPort, strictPort: true, proxy: { '/api': config.apiTarget } },
  };
});
