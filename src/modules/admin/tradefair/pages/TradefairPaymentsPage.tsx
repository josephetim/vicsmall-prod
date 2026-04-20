import { Input } from "@/components/ui/input";
import { getPayments } from "@/modules/admin/tradefair/api/admin.tradefair.api";
import { AdminFilterShell } from "@/modules/admin/tradefair/components/AdminFilterShell";
import { PaymentTable } from "@/modules/admin/tradefair/components/PaymentTable";

interface TradefairPaymentsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TradefairPaymentsPage({
  searchParams,
}: TradefairPaymentsPageProps) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const status = typeof params.status === "string" ? params.status : "all";
  const rows = await getPayments();

  const filteredRows = rows.filter((row) => {
    const text = `${row.reference} ${row.vendorName} ${row.brandName} ${row.channel}`.toLowerCase();
    const matchesQuery = !query || text.includes(query.toLowerCase());
    const matchesStatus = status === "all" || row.status === status;
    return matchesQuery && matchesStatus;
  });

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 md:px-6">
      <h1 className="text-3xl font-black text-slate-900">Tradefair Payments</h1>

      <form method="get">
        <AdminFilterShell>
          <Input
            name="q"
            defaultValue={query}
            placeholder="Search by reference, vendor, brand, or channel"
            className="rounded-2xl"
          />
          <select
            name="status"
            defaultValue={status}
            className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
          >
            <option value="all">All statuses</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <button
            type="submit"
            className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400"
          >
            Apply filters
          </button>
        </AdminFilterShell>
      </form>

      <PaymentTable rows={filteredRows} />
    </main>
  );
}
