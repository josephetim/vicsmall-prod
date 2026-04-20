import { Card, CardContent } from "@/components/ui/card";

export default function AdminTradefairLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
      <Card className="rounded-3xl border-slate-200">
        <CardContent className="p-6 text-sm text-slate-600">
          Loading admin tradefair module...
        </CardContent>
      </Card>
    </main>
  );
}
