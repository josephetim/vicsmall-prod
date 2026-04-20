import { createBackendApp } from "@/backend/app";
import { getEnv } from "@/backend/config/env";
import { connectMongo } from "@/backend/db/mongo";
import { startJobs } from "@/backend/jobs/scheduler";

async function bootstrap() {
  const env = getEnv();
  await connectMongo();
  const port = Number(process.env.PORT ?? env.PORT ?? env.BACKEND_PORT);
  const host = env.BACKEND_HOST;

  const app = createBackendApp();
  app.listen(port, host, () => {
    console.log(`[backend] listening on http://${host}:${port}`);
  });

  startJobs();
}

bootstrap().catch((error) => {
  console.error("[backend] failed to start", error);
  process.exit(1);
});
