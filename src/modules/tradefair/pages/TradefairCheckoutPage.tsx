"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { initializePayment } from "@/modules/tradefair/api/tradefair.api";

export default function TradefairCheckoutPage() {
  const searchParams = useSearchParams();
  const registrationId = searchParams.get("registrationId")?.trim() ?? "";
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoStartedRef = useRef(false);

  const canInitialize = useMemo(() => registrationId.length > 0, [registrationId]);

  const startCheckout = useCallback(async () => {
    if (!canInitialize || initializing) return;

    setInitializing(true);
    setError(null);

    try {
      const payment = await initializePayment(registrationId);
      if (!payment.authorizationUrl) {
        throw new Error("Payment gateway did not return a checkout URL.");
      }

      window.location.assign(payment.authorizationUrl);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to initialize payment right now.";
      setError(message);
      setInitializing(false);
    }
  }, [canInitialize, initializing, registrationId]);

  useEffect(() => {
    if (!canInitialize || autoStartedRef.current) return;
    autoStartedRef.current = true;
    void startCheckout();
  }, [canInitialize, startCheckout]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6">
      <Card className="rounded-3xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-2xl font-black">Tradefair Checkout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          {!canInitialize ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
              Missing registrationId. Start from stand registration before checkout.
            </p>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
              {error}
            </p>
          ) : null}

          <p>
            {initializing
              ? "Initializing Paystack test checkout..."
              : "Click below to continue payment if redirect did not start automatically."}
          </p>

          <Button
            onClick={() => void startCheckout()}
            disabled={!canInitialize || initializing}
            className="rounded-2xl bg-amber-500 text-black hover:bg-amber-400"
          >
            {initializing ? "Redirecting..." : "Continue to Paystack"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
