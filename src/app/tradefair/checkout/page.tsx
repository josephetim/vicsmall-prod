import { Suspense } from "react";

import TradefairCheckoutPage from "@/modules/tradefair/pages/TradefairCheckoutPage";

export default function CheckoutRoutePage() {
  return (
    <Suspense fallback={null}>
      <TradefairCheckoutPage />
    </Suspense>
  );
}
