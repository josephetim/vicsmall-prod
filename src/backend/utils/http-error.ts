export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNPROCESSABLE_ENTITY"
  | "PAYMENT_REQUIRED"
  | "INTERNAL_SERVER_ERROR";

export class HttpError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(message: string, details?: unknown): HttpError {
  return new HttpError(400, "BAD_REQUEST", message, details);
}

export function unauthorized(message = "Unauthorized"): HttpError {
  return new HttpError(401, "UNAUTHORIZED", message);
}

export function forbidden(message = "Forbidden"): HttpError {
  return new HttpError(403, "FORBIDDEN", message);
}

export function notFound(message: string): HttpError {
  return new HttpError(404, "NOT_FOUND", message);
}

export function conflict(message: string, details?: unknown): HttpError {
  return new HttpError(409, "CONFLICT", message, details);
}

export function unprocessableEntity(
  message: string,
  details?: unknown,
): HttpError {
  return new HttpError(422, "UNPROCESSABLE_ENTITY", message, details);
}

export function internalServerError(message = "Internal server error"): HttpError {
  return new HttpError(500, "INTERNAL_SERVER_ERROR", message);
}
