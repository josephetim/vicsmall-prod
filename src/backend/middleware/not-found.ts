import type { NextFunction, Request, Response } from "express";

import { notFound } from "@/backend/utils/http-error";

export function notFoundMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  return next(notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}
