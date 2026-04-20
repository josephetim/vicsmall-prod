"use client";

import { useState } from "react";

import { verifyPayment } from "@/modules/tradefair/api/tradefair.api";
import type { PaymentVerificationResponse } from "@/modules/tradefair/types/tradefair.types";

export function useVerifyPayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify(reference: string): Promise<PaymentVerificationResponse> {
    setLoading(true);
    setError(null);

    try {
      return await verifyPayment(reference);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to verify payment");
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { verify, loading, error };
}
