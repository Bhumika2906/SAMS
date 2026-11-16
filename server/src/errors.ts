import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function badRequest(message: string, details?: unknown): HttpError {
  return new HttpError(400, 'BAD_REQUEST', message, details);
}

export function unauthorized(message = 'Authentication required', details?: unknown): HttpError {
  return new HttpError(401, 'UNAUTHORIZED', message, details);
}

export function forbidden(message = 'Access denied', details?: unknown): HttpError {
  return new HttpError(403, 'FORBIDDEN', message, details);
}

export function notFound(message = 'Resource not found', details?: unknown): HttpError {
  return new HttpError(404, 'NOT_FOUND', message, details);
}

export function conflict(message: string, details?: unknown): HttpError {
  return new HttpError(409, 'CONFLICT', message, details);
}

export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data });
}


export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }
  if (err instanceof ZodError) {
    const flat = err.flatten();
    const fieldMsg = Object.entries(flat.fieldErrors)
      .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
      .join('; ');
    const message = fieldMsg || flat.formErrors.join(', ') || 'Invalid request';

    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message, details: flat },
    });
    return;
  }
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL', message: 'Something went wrong' },
  });
}
