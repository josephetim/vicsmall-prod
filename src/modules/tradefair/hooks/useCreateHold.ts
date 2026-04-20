"use client";

import { useState } from "react";

import { createHold } from "@/modules/tradefair/api/tradefair.api";
import type {
  CreateHoldPayload,
  CreateHoldResponse,
} from "@/modules/tradefair/types/tradefair.types";

export function useCreateHold() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitHold(payload: CreateHoldPayload): Promise<CreateHoldResponse> {
    setLoading(true);
    setError(null);

    try {
      return await createHold(payload);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create hold");
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { submitHold, loading, error };
}
