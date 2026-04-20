import { Badge } from "@/components/ui/badge";
import { AdminEmptyState } from "@/modules/admin/tradefair/components/AdminEmptyState";
import { AdminTableShell } from "@/modules/admin/tradefair/components/AdminTableShell";
import type { AdminPaymentRecord } from "@/modules/admin/tradefair/types/admin.tradefair.types";
import { formatNaira } from "@/modules/tradefair/utils/money";

interface PaymentTableProps {
  rows: AdminPaymentRecord[];
}

function statusClass(status: string): string {
  if (status === "success") return "bg-emerald-100 text-emerald-700";
  if (status === "pending") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

export function PaymentTable({ rows }: PaymentTableProps) {
  if (rows.length === 0) {
    return (
      <AdminEmptyState
        title="No payments"
        message="No payment transactions are available yet."
      />
    );
  }

  return (
    <AdminTableShell title="Payments" subtitle="Gateway references and transaction outcomes">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Reference</th>
              <th className="px-4 py-3 font-semibold">Vendor</th>
              <th className="px-4 py-3 font-semibold">Brand</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Channel</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-900">{row.reference}</td>
                <td className="px-4 py-3 text-slate-700">{row.vendorName}</td>
                <td className="px-4 py-3 text-slate-700">{row.brandName}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{formatNaira(row.amount)}</td>
                <td className="px-4 py-3 text-slate-700">{row.channel}</td>
                <td className="px-4 py-3">
                  <Badge className={`rounded-full border-0 ${statusClass(row.status)}`}>
                    {row.status}
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
