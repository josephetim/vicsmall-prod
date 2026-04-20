"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminTradefairErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminTradefairError({
  error,
  reset,
}: AdminTradefairErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
      <Card className="rounded-3xl border-rose-200">
        <CardHeader>
          <CardTitle className="text-2xl font-black text-rose-700">
            Admin module error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <p>Something went wrong while loading this admin page.</p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={reset} className="rounded-2xl bg-amber-500 text-black hover:bg-amber-400">
              Retry
            </Button>
            <Button asChild variant="outline" className="rounded-2xl">
              <Link href="/admin/tradefair">Back to dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
