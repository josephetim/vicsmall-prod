"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getConfirmation, verifyPayment } from "@/modules/tradefair/api/tradefair.api";
import type { TradefairConfirmation } from "@/modules/tradefair/types/tradefair.types";

function formatNairaFromKobo(amountKobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amountKobo / 100);
}

function paymentStatusTone(status: TradefairConfirmation["paymentStatus"]) {
  if (status === "success") return "bg-emerald-100 text-emerald-700";
  if (status === "failed" || status === "abandoned" || status === "refunded") {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-amber-100 text-amber-700";
}

export default function TradefairConfirmationPage() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference")?.trim() ?? "";
  const bookingReferenceFromQuery = searchParams.get("bookingReference")?.trim() ?? "";
  const [confirmation, setConfirmation] = useState<TradefairConfirmation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadConfirmation = async () => {
      setLoading(true);
      setError(null);

      try {
        let bookingReference = bookingReferenceFromQuery;
        if (reference) {
          const verifyResult = await verifyPayment(reference);
          if (verifyResult.bookingReference) {
            bookingReference = verifyResult.bookingReference;
          }
        }

        if (!bookingReference) {
          throw new Error("No booking reference was provided for confirmation.");
        }

        const data = await getConfirmation(bookingReference);
        if (!active) return;
        setConfirmation(data);
      } catch (requestError) {
        if (!active) return;
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Unable to load confirmation details.";
        setError(message);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadConfirmation();

    return () => {
      active = false;
    };
  }, [bookingReferenceFromQuery, reference]);

  const statusText = useMemo(() => {
    if (!confirmation) return "pending";
    return confirmation.paymentStatus;
  }, [confirmation]);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6">
      <Card className="rounded-3xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-2xl font-black">Tradefair Confirmation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          {loading ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              Loading confirmation details...
            </p>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
              {error}
            </p>
          ) : null}

          {!loading && !error && confirmation ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Badge className={`rounded-full border-0 ${paymentStatusTone(confirmation.paymentStatus)}`}>
                  {statusText}
                </Badge>
                <span className="text-slate-500">
                  Booking Reference:{" "}
                  <span className="font-semibold text-slate-900">
                    {confirmation.bookingReference}
                  </span>
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Vendor
                  </p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {confirmation.vendor.firstName} {confirmation.vendor.lastName}
                  </p>
                  <p>{confirmation.vendor.brandName}</p>
                  <p>{confirmation.vendor.phone}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Stand
                  </p>
                  <p className="mt-2 font-semibold text-slate-900">{confirmation.stand.label}</p>
                  <p>{confirmation.stand.standCode}</p>
                  <p>{confirmation.stand.standType}</p>
                  {confirmation.slot ? (
                    <p>
                      {confirmation.slot.slotLabel} ({confirmation.slot.slotCode})
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Payment
                </p>
                <p className="mt-2 font-semibold text-slate-900">
                  {formatNairaFromKobo(confirmation.amountPaidKobo)}
                </p>
                <p>Gateway reference: {confirmation.gatewayReference ?? "-"}</p>
                <p>Paid at: {confirmation.paidAt ? new Date(confirmation.paidAt).toLocaleString("en-NG") : "-"}</p>
              </div>

              <p>
                Need help? Contact support on WhatsApp:{" "}
                <a
                  href={`https://wa.me/${confirmation.supportContact.whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-amber-700 underline underline-offset-2"
                >
                  {confirmation.supportContact.whatsapp}
                </a>
              </p>
            </>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}

