import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminHelpPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 md:px-6">
      <h1 className="text-3xl font-black text-slate-900">Admin Support</h1>
      <Card className="rounded-3xl border-slate-200">
        <CardHeader>
          <CardTitle>Help and escalation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-7 text-slate-600">
          <p>Use this section to keep runbooks, reconciliation procedures, and escalation contacts.</p>
          <p>Prototype support line: +234 904 936 3602</p>
          <p>Email: admin-support@vicsmall.example</p>
        </CardContent>
      </Card>
    </main>
  );
}
