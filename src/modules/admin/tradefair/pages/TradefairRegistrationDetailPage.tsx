import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRegistrationById } from "@/modules/admin/tradefair/api/admin.tradefair.api";
import { formatNaira } from "@/modules/tradefair/utils/money";

interface TradefairRegistrationDetailPageProps {
  registrationId: string;
}

export default async function TradefairRegistrationDetailPage({
  registrationId,
}: TradefairRegistrationDetailPageProps) {
  const record = await getRegistrationById(registrationId);

  if (!record) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
        <Card className="rounded-3xl border-slate-200">
          <CardHeader>
            <CardTitle className="text-2xl font-black">Registration not found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <p>No registration exists for ID: {registrationId}</p>
            <Button asChild className="rounded-2xl bg-amber-500 text-black hover:bg-amber-400">
              <Link href="/admin/tradefair/registrations">Back to registrations</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
      <Card className="rounded-3xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-2xl font-black">Registration Detail</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
          <p><span className="font-semibold text-slate-900">Booking Ref:</span> {record.id}</p>
          <p><span className="font-semibold text-slate-900">Vendor:</span> {record.vendorName}</p>
          <p><span className="font-semibold text-slate-900">Brand:</span> {record.brandName}</p>
          <p><span className="font-semibold text-slate-900">Phone:</span> {record.phone}</p>
          <p><span className="font-semibold text-slate-900">Stand:</span> {record.standLabel}</p>
          <p><span className="font-semibold text-slate-900">Slot:</span> {record.slotLabel ?? "-"}</p>
          <p><span className="font-semibold text-slate-900">Registration:</span> {record.registrationStatus}</p>
          <p><span className="font-semibold text-slate-900">Payment:</span> {record.paymentStatus}</p>
          <p><span className="font-semibold text-slate-900">Amount:</span> {formatNaira(record.amount)}</p>
          <p><span className="font-semibold text-slate-900">Category:</span> {record.category}</p>
          <p><span className="font-semibold text-slate-900">Created:</span> {record.createdAt}</p>
          <p><span className="font-semibold text-slate-900">Updated:</span> {record.updatedAt}</p>
        </CardContent>
      </Card>
    </main>
  );
}
