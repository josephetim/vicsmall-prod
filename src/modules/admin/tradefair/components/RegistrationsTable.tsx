import { Badge } from "@/components/ui/badge";
import { AdminEmptyState } from "@/modules/admin/tradefair/components/AdminEmptyState";
import { AdminTableShell } from "@/modules/admin/tradefair/components/AdminTableShell";
import type { AdminRegistrationRecord } from "@/modules/admin/tradefair/types/admin.tradefair.types";
import { formatNaira } from "@/modules/tradefair/utils/money";

interface RegistrationsTableProps {
  rows: AdminRegistrationRecord[];
}

function statusClass(status: string): string {
  if (status === "paid" || status === "success") return "bg-emerald-100 text-emerald-700";
  if (status === "held" || status === "pending") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

export function RegistrationsTable({ rows }: RegistrationsTableProps) {
  if (rows.length === 0) {
    return (
      <AdminEmptyState
        title="No registrations"
        message="No vendor registrations match the current filters."
      />
    );
  }

  return (
    <AdminTableShell
      title="Registrations"
      subtitle="Latest vendor registration and payment state"
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Booking Ref</th>
              <th className="px-4 py-3 font-semibold">Vendor</th>
              <th className="px-4 py-3 font-semibold">Stand</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Registration</th>
              <th className="px-4 py-3 font-semibold">Payment</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-900">{row.id}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{row.vendorName}</p>
                  <p className="text-slate-500">{row.brandName}</p>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {row.standLabel}
                  {row.slotLabel ? ` / ${row.slotLabel}` : ""}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{formatNaira(row.amount)}</td>
                <td className="px-4 py-3">
                  <Badge className={`rounded-full border-0 ${statusClass(row.registrationStatus)}`}>
                    {row.registrationStatus}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge className={`rounded-full border-0 ${statusClass(row.paymentStatus)}`}>
                    {row.paymentStatus}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminTableShell>
  );
}
