import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuditLogs } from "@/modules/admin/tradefair/api/admin.tradefair.api";
import { AdminEmptyState } from "@/modules/admin/tradefair/components/AdminEmptyState";

export default async function TradefairAuditLogPage() {
  const rows = await getAuditLogs();

  if (rows.length === 0) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
        <AdminEmptyState title="No audit logs" message="No audit records are available yet." />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
      <Card className="rounded-3xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-2xl font-black">Tradefair Audit Log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          {rows.map((row) => (
            <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">{row.action}</p>
              <p className="text-slate-600">
                {row.actor} updated {row.entity} ({row.entityId})
              </p>
              <p className="text-slate-500">{row.createdAt}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
