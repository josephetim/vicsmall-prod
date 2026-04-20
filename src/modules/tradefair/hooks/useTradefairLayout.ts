"use client";

import { useEffect, useState } from "react";

import { getTradefairLayout } from "@/modules/tradefair/api/tradefair.api";
import type { TradefairLayout } from "@/modules/tradefair/types/tradefair.types";

export function useTradefairLayout() {
  const [layout, setLayout] = useState<TradefairLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getTradefairLayout()
      .then((response) => {
        if (!active) return;
        setLayout(response);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load layout");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { layout, loading, error };
}
