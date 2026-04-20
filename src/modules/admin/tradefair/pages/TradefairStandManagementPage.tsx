import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStands } from "@/modules/admin/tradefair/api/admin.tradefair.api";
import { AdminActionPanel } from "@/modules/admin/tradefair/components/AdminActionPanel";
import { StandDetailsDrawer } from "@/modules/admin/tradefair/components/StandDetailsDrawer";

function statusClass(status: string): string {
  if (status === "paid") return "bg-emerald-100 text-emerald-700";
  if (status === "held") return "bg-amber-100 text-amber-700";
  if (status === "blocked") return "bg-slate-900 text-white";
  return "bg-slate-100 text-slate-700";
}

export default async function TradefairStandManagementPage() {
  const stands = await getStands();

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 md:px-6 lg:grid-cols-[1fr_340px]">
      <section className="space-y-6">
        <h1 className="text-3xl font-black text-slate-900">Tradefair Stand Management</h1>
        <Card className="rounded-3xl border-slate-200">
          <CardHeader>
            <CardTitle>Stand occupancy snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stands.map((stand) => (
              <div
                key={stand.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{stand.label}</p>
                    <p className="text-slate-500">{stand.type} stand</p>
                  </div>
                  <Badge className={`rounded-full border-0 ${statusClass(stand.status)}`}>
                    {stand.status}
                  </Badge>
                </div>
                <p className="mt-2 text-slate-600">
                  Occupancy: {stand.occupied}/{stand.capacity}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
      <aside className="space-y-6">
        <StandDetailsDrawer />
        <AdminActionPanel />
      </aside>
    </main>
  );
}
