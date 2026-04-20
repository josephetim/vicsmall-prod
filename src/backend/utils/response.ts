import type { Response } from "express";

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>,
) {
  const payload: SuccessEnvelope<T> = { success: true, data };
  if (meta) {
    payload.meta = meta;
  }
  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
) {
  const requestId = res.locals.requestId as string | undefined;
  const payload: ErrorEnvelope = {
    success: false,
    error: {
      code,
      message,
      details,
      requestId,
    },
  };

  return res.status(statusCode).json(payload);
}
