import { getEnv } from "@/backend/config/env";
import { expireHoldsJob } from "@/modules/tradefair/jobs/expire-holds.job";
import { reconcilePaymentsJob } from "@/modules/tradefair/jobs/reconcile-payments.job";

let started = false;

export function startJobs() {
  if (started) return;
  started = true;

  const env = getEnv();
  const runIfNotTest = env.NODE_ENV !== "test";
  if (!runIfNotTest) return;

  setInterval(() => {
    expireHoldsJob().catch((error) => {
      console.error("[jobs:expire-holds] failed", error);
    });
  }, 60 * 1000);

  setInterval(() => {
    reconcilePaymentsJob().catch((error) => {
      console.error("[jobs:reconcile-payments] failed", error);
    });
  }, 15 * 60 * 1000);
}
