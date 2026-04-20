import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminNotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center px-4 py-8 md:px-6">
      <Card className="w-full rounded-3xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-2xl font-black">Admin page not found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <p>The admin resource you requested does not exist or has moved.</p>
          <Button asChild className="rounded-2xl bg-amber-500 text-black hover:bg-amber-400">
            <Link href="/admin/tradefair">Return to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
