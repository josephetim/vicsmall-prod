import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminTradefairNotFound() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6">
      <Card className="rounded-3xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-2xl font-black">Tradefair admin page not found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <p>This tradefair admin page does not exist.</p>
          <Button asChild className="rounded-2xl bg-amber-500 text-black hover:bg-amber-400">
            <Link href="/admin/tradefair">Go to tradefair dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
