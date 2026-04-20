import { Input } from "@/components/ui/input";
import { getRegistrations } from "@/modules/admin/tradefair/api/admin.tradefair.api";
import { AdminFilterShell } from "@/modules/admin/tradefair/components/AdminFilterShell";
import { RegistrationsTable } from "@/modules/admin/tradefair/components/RegistrationsTable";

interface TradefairRegistrationsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TradefairRegistrationsPage({
  searchParams,
}: TradefairRegistrationsPageProps) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const status = typeof params.status === "string" ? params.status : "all";
  const rows = await getRegistrations();

  const filteredRows = rows.filter((row) => {
    const text = `${row.id} ${row.vendorName} ${row.brandName} ${row.phone} ${row.standLabel} ${row.slotLabel ?? ""}`.toLowerCase();
    const matchesQuery = !query || text.includes(query.toLowerCase());
    const matchesStatus =
      status === "all" ||
      row.registrationStatus === status ||
      row.paymentStatus === status;
    return matchesQuery && matchesStatus;
  });

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 md:px-6">
      <h1 className="text-3xl font-black text-slate-900">Tradefair Registrations</h1>

      <form method="get">
        <AdminFilterShell>
          <Input
            name="q"
            defaultValue={query}
            placeholder="Search by vendor, brand, phone, stand or booking ref"
            className="rounded-2xl"
          />
          <select
            name="status"
            defaultValue={status}
            className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
          >
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="held">Held</option>
            <option value="expired">Expired</option>
            <option value="success">Payment success</option>
            <option value="pending">Payment pending</option>
          </select>
          <button
            type="submit"
            className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400"
          >
            Apply filters
          </button>
        </AdminFilterShell>
      </form>

      <RegistrationsTable rows={filteredRows} />
    </main>
  );
}
