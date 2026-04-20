import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { getEnv } from "@/backend/config/env";
import { adminAuthMiddleware } from "@/backend/middleware/admin-auth";
import { errorHandlerMiddleware } from "@/backend/middleware/error-handler";
import { notFoundMiddleware } from "@/backend/middleware/not-found";
import { requestIdMiddleware } from "@/backend/middleware/request-id";
import adminAuthRouter from "@/modules/admin/auth/routes/admin-auth.routes";
import adminTradefairRouter from "@/modules/tradefair/routes/admin-tradefair.routes";
import publicTradefairRouter from "@/modules/tradefair/routes/public-tradefair.routes";
import tradefairPaymentRouter from "@/modules/tradefair/routes/tradefair-payment.routes";

export function createBackendApp() {
  const app = express();
  const env = getEnv();
  const allowedOrigins = Array.from(
    new Set(
      [
        env.FRONTEND_URL,
        env.TRADEFAIR_FRONTEND_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ].filter(Boolean),
    ),
  );

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`CORS origin not allowed: ${origin}`));
      },
      credentials: true,
    }),
  );
  app.use(morgan("dev"));
  app.use(requestIdMiddleware);

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as express.Request).rawBody = buf.toString("utf-8");
      },
    }),
  );

  app.get("/health", (_req, res) => {
    res.status(200).json({ success: true, data: { ok: true } });
  });

  app.use("/api/tradefair", publicTradefairRouter);
  app.use("/api/tradefair", tradefairPaymentRouter);
  app.use("/api/admin/auth", adminAuthRouter);
  app.use("/api/admin/tradefair", adminAuthMiddleware, adminTradefairRouter);

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}
