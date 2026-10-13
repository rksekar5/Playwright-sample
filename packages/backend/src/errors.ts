import type { ErrorRequestHandler } from 'express';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly field?: string,
  ) { super(message); }
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) { next(error); return; }
  let failure: ApiError;
  if (error instanceof ApiError) {
    failure = error;
  } else if (error instanceof URIError) {
    failure = new ApiError(400, 'invalid_request', 'Request path contains an invalid encoded value.');
  } else if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.parse.failed') {
    failure = new ApiError(400, 'invalid_json', 'Request body must contain valid JSON.');
  } else if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large') {
    failure = new ApiError(413, 'payload_too_large', 'Request body must not exceed 16 KiB.');
  } else if (typeof error === 'object' && error !== null && 'status' in error && error.status === 415) {
    failure = new ApiError(415, 'unsupported_media_type', 'Use uncompressed application/json with UTF-8 encoding.');
  } else {
    console.error('Unexpected API failure:', error);
    failure = new ApiError(500, 'internal_error', 'An unexpected server error occurred.');
  }
  res.status(failure.status).json({ error: {
    code: failure.code, message: failure.message,
    ...(failure.field === undefined ? {} : { field: failure.field }),
  } });
};
