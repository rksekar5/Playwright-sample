import express from 'express';
import type { RequestHandler } from 'express';
import { ApiError, errorHandler } from './errors.js';
import { TaskStore, validateChanges, validateId } from './tasks.js';

const requireJson: RequestHandler = (req, _res, next) => {
  const length = req.headers['content-length'];
  if (length === '0' || (length === undefined && req.headers['transfer-encoding'] === undefined)) {
    next(new ApiError(400, 'invalid_request', 'Request body is required.'));
  } else if (!req.is('application/json')) {
    next(new ApiError(415, 'unsupported_media_type', 'Use application/json.'));
  } else { next(); }
};
// strict:false lets valid JSON null/scalars reach object-shape validation.
const parseJson = express.json({ limit: '16kb', strict: false, inflate: false });

export function createApp(options: { nodeEnv?: string; store?: TaskStore } = {}) {
  const app = express();
  const store = options.store ?? new TaskStore();
  app.disable('x-powered-by');

  app.get('/health', (_req, res) => { res.json({ status: 'ok' }); });
  app.get('/api/tasks', (_req, res) => { res.json({ tasks: store.list() }); });

  app.post('/api/tasks', requireJson, parseJson, (req, res) => {
    const changes = validateChanges(req.body, true);
    const task = store.create({ ...changes, title: changes.title! });
    res.status(201).json({ task });
  });

  app.patch('/api/tasks/:id', requireJson, parseJson, (req, res) => {
    const changes = validateChanges(req.body, false);
    const task = store.update(validateId(req.params.id), changes);
    res.json({ task });
  });

  app.delete('/api/tasks/:id', (req, res) => {
    store.delete(validateId(req.params.id));
    res.status(204).end();
  });

  if (options.nodeEnv === 'test') {
    app.post('/api/test/reset', (req, res) => {
      // Reject any body, independent of content type, without buffering it.
      let hasBody = false;
      req.on('data', (chunk: Buffer) => {
        if (chunk.length > 0 && !hasBody) {
          hasBody = true;
          res.status(400).json({ error: { code: 'invalid_request', message: 'Reset does not accept a body.' } });
        }
      });
      req.on('end', () => {
        if (!hasBody) { store.reset(); res.status(204).end(); }
      });
      req.resume();
    });
  }

  app.use((_req, _res, next) => { next(new ApiError(404, 'not_found', 'Route not found.')); });
  app.use(errorHandler);
  return app;
}
