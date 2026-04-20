"use client";

import { useState } from "react";

import { initializePayment } from "@/modules/tradefair/api/tradefair.api";
import type { PaymentInitializationResponse } from "@/modules/tradefair/types/tradefair.types";

export function useInitializePayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function initialize(
    reservationId: string,
  ): Promise<PaymentInitializationResponse> {
    setLoading(true);
    setError(null);

    try {
      return await initializePayment(reservationId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to initialize payment");
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { initialize, loading, error };
}
