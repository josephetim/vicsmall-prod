import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  exportPayments,
  exportRegistrations,
  exportStands,
} from "@/modules/admin/tradefair/api/admin.tradefair.api";
import { ExportPanel } from "@/modules/admin/tradefair/components/ExportPanel";

export default async function TradefairExportsPage() {
  const [registrationsExport, paymentsExport, standsExport] = await Promise.all([
    exportRegistrations("csv"),
    exportPayments("csv"),
    exportStands("csv"),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 md:px-6">
      <h1 className="text-3xl font-black text-slate-900">Tradefair Exports</h1>
      <ExportPanel />
      <Card className="rounded-3xl border-slate-200">
        <CardHeader>
          <CardTitle>Prepared export endpoints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>Registrations: {registrationsExport.url}</p>
          <p>Payments: {paymentsExport.url}</p>
          <p>Stands: {standsExport.url}</p>
        </CardContent>
      </Card>
    </main>
  );
}
