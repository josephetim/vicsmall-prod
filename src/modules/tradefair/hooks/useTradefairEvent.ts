"use client";

import { useEffect, useState } from "react";

import { getTradefairEvent } from "@/modules/tradefair/api/tradefair.api";
import type { EventSummary } from "@/modules/tradefair/types/tradefair.types";

export function useTradefairEvent() {
  const [event, setEvent] = useState<EventSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getTradefairEvent()
      .then((response) => {
        if (!active) return;
        setEvent(response);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load event");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { event, loading, error };
}
