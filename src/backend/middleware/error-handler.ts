import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { HttpError, internalServerError } from "@/backend/utils/http-error";
import { sendError } from "@/backend/utils/response";

export function errorHandlerMiddleware(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  void next;
  if (error instanceof ZodError) {
    return sendError(
      res,
      422,
      "UNPROCESSABLE_ENTITY",
      "Validation failed",
      error.flatten(),
    );
  }

  if (error instanceof HttpError) {
    return sendError(
      res,
      error.statusCode,
      error.code,
      error.message,
      error.details,
    );
  }

  const fallback = internalServerError();
  console.error("[backend:error]", error);
  return sendError(res, fallback.statusCode, fallback.code, fallback.message);
}
