import { Suspense } from "react";

import TradefairConfirmationPage from "@/modules/tradefair/pages/TradefairConfirmationPage";

export default function ConfirmationRoutePage() {
  return (
    <Suspense fallback={null}>
      <TradefairConfirmationPage />
    </Suspense>
  );
}
