"use client";

import { type ComponentType, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  Eye,
  Phone,
  RefreshCcw,
  Search,
  Shield,
  Tent,
  Users,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api-client";

type RegistrationStatus =
  | "draft"
  | "held"
  | "pending_payment"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled"
  | "refunded";

type PaymentStatus =
  | "initialized"
  | "pending"
  | "success"
  | "failed"
  | "abandoned"
  | "refunded";

type StandType = "premium" | "single" | "shared";
type StandStatus = "available" | "held" | "paid" | "blocked";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: {
    message?: string;
  };
}

interface EventSummaryApi {
  id: string;
  slug: string;
  name: string;
  venue: string;
  status: string;
  eventDate: string;
  supportContact?: {
    whatsapp?: string;
    phone?: string;
    email?: string;
  };
}

interface DashboardApi {
  metrics: {
    premiumSold: number;
    premiumRemaining: number;
    singleSold: number;
    singleRemaining: number;
    sharedSlotsSold: number;
    sharedSlotsRemaining: number;
    activeHolds: number;
    expiredHolds: number;
    failedPayments: number;
    abandonedPayments: number;
    totalRevenueKobo: number;
  };
}

interface RegistrationRow {
  registrationId: string;
  bookingReference: string;
  registrationStatus: RegistrationStatus;
  standType: StandType;
  amountKobo: number;
  categories: string[];
  createdAt: string;
  vendor: {
    firstName: string;
    lastName: string;
    phone: string;
    brandName: string;
    businessCategory: string[];
  } | null;
  stand: {
    id: string;
    standCode: string;
    label: string;
  } | null;
  slot: {
    id: string;
    slotCode: string;
    slotLabel: string;
  } | null;
  payment: {
    paymentId: string;
    status: PaymentStatus;
    reference: string;
    channel: string | null;
  } | null;
}

interface PaymentRow {
  paymentId: string;
  status: PaymentStatus;
  reference: string;
  amountKobo: number;
  channel: string | null;
  createdAt: string;
  registration: {
    id: string;
    bookingReference: string;
  } | null;
  vendor: {
    firstName: string;
    lastName: string;
    phone: string;
    brandName: string;
  } | null;
  stand: {
    id: string;
    standCode: string;
    label: string;
    standType: StandType;
  } | null;
  slot: {
    id: string;
    slotCode: string;
    slotLabel: string;
  } | null;
}

interface StandRow {
  id: string;
  standCode: string;
  label: string;
  standType: StandType;
  occupancyStatus: StandStatus;
  capacity: number;
  occupiedSlots: number;
  heldSlots: number;
  isBlocked: boolean;
  slots: Array<{
    id: string;
    slotCode: string;
    slotLabel: string;
    status: StandStatus;
    vendor: {
      firstName: string;
      lastName: string;
      brandName: string;
      phone: string;
    } | null;
  }>;
}

interface AuditLogRow {
  id: string;
  actorType: "admin" | "system" | "vendor";
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

interface DetailLine {
  label: string;
  value: string;
}

interface DetailItem {
  title: string;
  subtitle: string;
  status: string;
  amount?: string;
  lines: DetailLine[];
}

const EVENT_SLUG = process.env.NEXT_PUBLIC_TRADEFAIR_EVENT_SLUG ?? "iuo-2026-tradefair";

function formatNairaFromKobo(amountKobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amountKobo / 100);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-NG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatVendorName(vendor: {
  firstName?: string;
  lastName?: string;
  brandName?: string;
} | null) {
  if (!vendor) return "Unassigned";
  const fullName = [vendor.firstName, vendor.lastName].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  return vendor.brandName ?? "Unassigned";
}

function statusClass(status: string) {
  if (status === "paid" || status === "success") {
    return "border-emerald-200 bg-emerald-100 text-emerald-700";
  }
  if (status === "held" || status === "pending" || status === "pending_payment" || status === "initialized") {
    return "border-amber-200 bg-amber-100 text-amber-700";
  }
  if (status === "blocked") {
    return "border-slate-900 bg-slate-900 text-white";
  }
  if (status === "failed" || status === "expired" || status === "abandoned" || status === "cancelled" || status === "refunded") {
    return "border-rose-200 bg-rose-100 text-rose-700";
  }
  return "border-slate-200 bg-slate-100 text-slate-700";
}

async function getData<T>(path: string, init?: RequestInit): Promise<T> {
  const payload = await apiFetch<ApiEnvelope<T>>(path, init);
  if (!payload.success) {
    throw new Error(payload.error?.message ?? "Request failed.");
  }
  return payload.data;
}

function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  hint: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-3xl border-0 shadow-lg shadow-black/5">
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <h3 className="mt-1 text-2xl font-black text-slate-900">{value}</h3>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
        <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusPill({ value }: { value: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(value)}`}>
      {value}
    </span>
  );
}

export default function TradefairDashboardPage() {
  const [adminTab, setAdminTab] = useState("dashboard");
  const [event, setEvent] = useState<EventSummaryApi | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);

  const [dashboard, setDashboard] = useState<DashboardApi | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [stands, setStands] = useState<StandRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);

  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [registrationsLoading, setRegistrationsLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [standsLoading, setStandsLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(true);

  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [registrationsError, setRegistrationsError] = useState<string | null>(null);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [standsError, setStandsError] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  const [registrationSearch, setRegistrationSearch] = useState("");
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState("all");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [selectedDetail, setSelectedDetail] = useState<DetailItem | null>(null);

  const [exporting, setExporting] = useState<"registrations" | "payments" | "stands" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      setDashboardLoading(true);
      setRegistrationsLoading(true);
      setPaymentsLoading(true);
      setStandsLoading(true);
      setAuditLoading(true);

      setDashboardError(null);
      setRegistrationsError(null);
      setPaymentsError(null);
      setStandsError(null);
      setAuditError(null);

      try {
        const eventData = await getData<EventSummaryApi>(`/api/tradefair/events/${EVENT_SLUG}`);
        if (cancelled) return;

        setEvent(eventData);
        setEventId(eventData.id);

        void (async () => {
          try {
            const data = await getData<DashboardApi>(
              `/api/admin/tradefair/events/${eventData.id}/dashboard`,
            );
            if (!cancelled) setDashboard(data);
          } catch {
            if (!cancelled) setDashboardError("Failed to load dashboard data.");
          } finally {
            if (!cancelled) setDashboardLoading(false);
          }
        })();

        void (async () => {
          try {
            const data = await getData<RegistrationRow[]>(
              `/api/admin/tradefair/events/${eventData.id}/registrations`,
            );
            if (!cancelled) setRegistrations(data);
          } catch {
            if (!cancelled) setRegistrationsError("Failed to load registrations.");
          } finally {
            if (!cancelled) setRegistrationsLoading(false);
          }
        })();

        void (async () => {
          try {
            const data = await getData<PaymentRow[]>(
              `/api/admin/tradefair/events/${eventData.id}/payments`,
            );
            if (!cancelled) setPayments(data);
          } catch {
            if (!cancelled) setPaymentsError("Failed to load payments.");
          } finally {
            if (!cancelled) setPaymentsLoading(false);
          }
        })();

        void (async () => {
          try {
            const standPayload = await getData<{ stands: StandRow[] }>(
              `/api/admin/tradefair/events/${eventData.id}/stands`,
            );
            if (!cancelled) setStands(standPayload.stands);
          } catch {
            if (!cancelled) setStandsError("Failed to load stand data.");
          } finally {
            if (!cancelled) setStandsLoading(false);
          }
        })();

        void (async () => {
          try {
            const data = await getData<AuditLogRow[]>(
              `/api/admin/tradefair/events/${eventData.id}/audit-logs?limit=100`,
            );
            if (!cancelled) setAuditLogs(data);
          } catch {
            if (!cancelled) setAuditError("Failed to load audit activity.");
          } finally {
            if (!cancelled) setAuditLoading(false);
          }
        })();
      } catch {
        if (cancelled) return;
        setDashboardError("Failed to load dashboard data.");
        setRegistrationsError("Failed to load registrations.");
        setPaymentsError("Failed to load payments.");
        setStandsError("Failed to load stand data.");
        setAuditError("Failed to load audit activity.");

        setDashboardLoading(false);
        setRegistrationsLoading(false);
        setPaymentsLoading(false);
        setStandsLoading(false);
        setAuditLoading(false);
      }
    };

    void loadAll();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRegistrations = useMemo(() => {
    const query = registrationSearch.trim().toLowerCase();
    return registrations.filter((row) => {
      const rowText = [
        row.bookingReference,
        formatVendorName(row.vendor),
        row.vendor?.brandName ?? "",
        row.vendor?.phone ?? "",
        row.stand?.label ?? "",
        row.slot?.slotLabel ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const queryMatch = !query || rowText.includes(query);
      const statusMatch =
        registrationStatusFilter === "all" ||
        row.registrationStatus === registrationStatusFilter ||
        row.payment?.status === registrationStatusFilter;

      return queryMatch && statusMatch;
    });
  }, [registrations, registrationSearch, registrationStatusFilter]);

  const filteredPayments = useMemo(() => {
    const query = paymentSearch.trim().toLowerCase();
    return payments.filter((row) => {
      const rowText = [
        row.reference,
        formatVendorName(row.vendor),
        row.vendor?.brandName ?? "",
        row.channel ?? "",
        row.registration?.bookingReference ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const queryMatch = !query || rowText.includes(query);
      const statusMatch = paymentStatusFilter === "all" || row.status === paymentStatusFilter;
      return queryMatch && statusMatch;
    });
  }, [payments, paymentSearch, paymentStatusFilter]);

  const paymentPendingCount = useMemo(
    () =>
      payments.filter(
        (payment) => payment.status === "pending" || payment.status === "initialized",
      ).length,
    [payments],
  );

  const recentActivity = useMemo(() => auditLogs.slice(0, 5), [auditLogs]);

  const standsByType = useMemo(() => {
    const sorted = [...stands].sort((a, b) => a.standCode.localeCompare(b.standCode));
    return {
      premium: sorted.filter((stand) => stand.standType === "premium"),
      single: sorted.filter((stand) => stand.standType === "single"),
      shared: sorted.filter((stand) => stand.standType === "shared"),
    };
  }, [stands]);

  const openRegistrationDetail = (row: RegistrationRow) => {
    setSelectedDetail({
      title: row.bookingReference,
      subtitle: "Registration detail",
      status: row.registrationStatus,
      amount: formatNairaFromKobo(row.amountKobo),
      lines: [
        { label: "Vendor", value: formatVendorName(row.vendor) },
        { label: "Brand", value: row.vendor?.brandName ?? "-" },
        { label: "Phone", value: row.vendor?.phone ?? "-" },
        { label: "Stand", value: row.stand?.label ?? "-" },
        { label: "Slot", value: row.slot?.slotLabel ?? "-" },
        { label: "Payment", value: row.payment?.status ?? "pending" },
        { label: "Created", value: formatDate(row.createdAt) },
      ],
    });
  };

  const openPaymentDetail = (row: PaymentRow) => {
    setSelectedDetail({
      title: row.reference,
      subtitle: "Payment detail",
      status: row.status,
      amount: formatNairaFromKobo(row.amountKobo),
      lines: [
        { label: "Booking Ref", value: row.registration?.bookingReference ?? "-" },
        { label: "Vendor", value: formatVendorName(row.vendor) },
        { label: "Brand", value: row.vendor?.brandName ?? "-" },
        { label: "Channel", value: row.channel ?? "-" },
        { label: "Stand", value: row.stand?.label ?? "-" },
        { label: "Created", value: formatDate(row.createdAt) },
      ],
    });
  };

  const openStandDetail = (stand: StandRow) => {
    setSelectedDetail({
      title: `${stand.standCode} - ${stand.label}`,
      subtitle: "Stand detail",
      status: stand.occupancyStatus,
      lines: [
        { label: "Type", value: stand.standType },
        { label: "Capacity", value: String(stand.capacity) },
        {
          label: "Occupancy",
          value:
            stand.standType === "shared"
              ? `${stand.occupiedSlots + stand.heldSlots}/${stand.capacity}`
              : stand.occupancyStatus === "available"
                ? "0/1"
                : "1/1",
        },
        { label: "Blocked", value: stand.isBlocked ? "Yes" : "No" },
      ],
    });
  };

  const openSlotDetail = (
    stand: StandRow,
    slot: StandRow["slots"][number],
  ) => {
    setSelectedDetail({
      title: `${stand.standCode} - ${slot.slotLabel}`,
      subtitle: "Shared slot detail",
      status: slot.status,
      lines: [
        { label: "Slot code", value: slot.slotCode },
        { label: "Vendor", value: formatVendorName(slot.vendor) },
        { label: "Brand", value: slot.vendor?.brandName ?? "-" },
        { label: "Phone", value: slot.vendor?.phone ?? "-" },
      ],
    });
  };

  const handleExport = async (resource: "registrations" | "payments" | "stands") => {
    if (!eventId) return;

    setExporting(resource);
    setExportError(null);

    try {
      const csvText = await apiFetch<string>(
        `/api/admin/tradefair/events/${eventId}/export/${resource}?format=csv`,
      );

      const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `${resource}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      setExportError(`Failed to export ${resource}.`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed,white_30%,#f8fafc_75%)] text-slate-900">
      <section className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-black shadow-lg shadow-amber-500/30">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">
                  Admin Platform Module
                </p>
                <h1 className="text-2xl font-black md:text-3xl">
                  {event?.name ?? "Vicsmall Trade Fair Admin"}
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="rounded-full bg-slate-900 px-3 py-1 text-white hover:bg-slate-900">
                {event?.status ?? "loading"}
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {event?.venue ?? "Venue pending"}
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Admin / Events
              </Badge>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
              <BadgeCheck className="h-4 w-4" /> Live tradefair operations
            </div>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight md:text-5xl">
              Manage registrations, stands, payments, and audit activity.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              This dashboard now renders database-backed state only. Empty sections stay
              empty until real activity is created from public registrations and admin
              actions.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button
                variant="outline"
                className="justify-start rounded-2xl"
                onClick={() => setAdminTab("audit")}
              >
                <Download className="mr-2 h-4 w-4" /> Export records
              </Button>
              <Button
                variant="outline"
                className="justify-start rounded-2xl"
                onClick={() => setAdminTab("payments")}
              >
                <RefreshCcw className="mr-2 h-4 w-4" /> Reconcile payments
              </Button>
            </div>
          </div>

          <Card className="rounded-3xl border-slate-200 shadow-lg shadow-black/5">
            <CardContent className="space-y-3 p-6">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Event Date
                </p>
                <p className="mt-1 text-lg font-black text-slate-900">
                  {event ? formatDate(event.eventDate) : "-"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Support Contact
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Phone className="h-4 w-4 text-amber-600" />
                  {event?.supportContact?.phone ?? "Not configured"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Current Holds
                </p>
                <p className="mt-1 text-lg font-black text-slate-900">
                  {dashboard?.metrics.activeHolds ?? 0}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 md:px-6">
        <Card className="rounded-3xl border-0 shadow-xl shadow-black/5">
          <CardContent className="p-4 md:p-6">
            <Tabs value={adminTab} onValueChange={setAdminTab}>
              <TabsList className="grid w-full grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 md:grid-cols-5">
                <TabsTrigger value="dashboard" className="rounded-2xl">
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="stands" className="rounded-2xl">
                  Stand Manager
                </TabsTrigger>
                <TabsTrigger value="registrations" className="rounded-2xl">
                  Registrations
                </TabsTrigger>
                <TabsTrigger value="payments" className="rounded-2xl">
                  Payments
                </TabsTrigger>
                <TabsTrigger value="audit" className="rounded-2xl">
                  Audit & Exports
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="mt-6 space-y-6">
                {dashboardLoading ? (
                  <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    loading dashboard...
                  </p>
                ) : dashboardError ? (
                  <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    {dashboardError}
                  </p>
                ) : dashboard ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                      <MetricCard
                        title="Revenue tracked"
                        value={formatNairaFromKobo(dashboard.metrics.totalRevenueKobo)}
                        hint="Total verified revenue"
                        icon={CreditCard}
                      />
                      <MetricCard
                        title="Active holds"
                        value={dashboard.metrics.activeHolds}
                        hint="Held / pending payment"
                        icon={Clock3}
                      />
                      <MetricCard
                        title="Single stands left"
                        value={dashboard.metrics.singleRemaining}
                        hint={`${dashboard.metrics.singleSold} sold`}
                        icon={Tent}
                      />
                      <MetricCard
                        title="Shared slots left"
                        value={dashboard.metrics.sharedSlotsRemaining}
                        hint={`${dashboard.metrics.sharedSlotsSold} sold`}
                        icon={Users}
                      />
                      <MetricCard
                        title="Failed / expired"
                        value={
                          dashboard.metrics.failedPayments +
                          dashboard.metrics.abandonedPayments +
                          dashboard.metrics.expiredHolds
                        }
                        hint="Failed payments + expired holds"
                        icon={XCircle}
                      />
                    </div>

                    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                      <Card className="rounded-3xl border border-slate-200 shadow-none">
                        <CardHeader>
                          <CardTitle className="text-xl font-black">
                            Operational summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                          <div className="rounded-2xl border border-slate-200 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                              Premium
                            </p>
                            <p className="mt-2 font-semibold">
                              Sold: {dashboard.metrics.premiumSold}
                            </p>
                            <p className="font-semibold">
                              Remaining: {dashboard.metrics.premiumRemaining}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                              Single
                            </p>
                            <p className="mt-2 font-semibold">
                              Sold: {dashboard.metrics.singleSold}
                            </p>
                            <p className="font-semibold">
                              Remaining: {dashboard.metrics.singleRemaining}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                              Shared Slots
                            </p>
                            <p className="mt-2 font-semibold">
                              Sold: {dashboard.metrics.sharedSlotsSold}
                            </p>
                            <p className="font-semibold">
                              Remaining: {dashboard.metrics.sharedSlotsRemaining}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                              Payment watch
                            </p>
                            <p className="mt-2 font-semibold">
                              Pending: {paymentPendingCount}
                            </p>
                            <p className="font-semibold">
                              Failed:{" "}
                              {dashboard.metrics.failedPayments + dashboard.metrics.abandonedPayments}
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="rounded-3xl border border-slate-200 shadow-none">
                        <CardHeader>
                          <CardTitle className="text-xl font-black">Recent activity</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {auditLoading ? (
                            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                              loading dashboard...
                            </p>
                          ) : auditError ? (
                            <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                              {auditError}
                            </p>
                          ) : recentActivity.length === 0 ? (
                            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                              No recent activity yet.
                            </p>
                          ) : (
                            recentActivity.map((log) => (
                              <div
                                key={log.id}
                                className="rounded-2xl border border-slate-200 bg-white p-4"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-semibold text-slate-900">{log.action}</p>
                                  <StatusPill value={log.actorType} />
                                </div>
                                <p className="mt-1 text-sm text-slate-600">
                                  {log.entityType} ({log.entityId})
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {formatDate(log.createdAt)}
                                </p>
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </>
                ) : null}
              </TabsContent>

              <TabsContent value="stands" className="mt-6 space-y-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-2xl font-black">Stand manager</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Actual stand and slot status from backend records.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      Available
                    </Badge>
                    <Badge className="rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-amber-700 hover:bg-amber-100">
                      Held
                    </Badge>
                    <Badge className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-emerald-700 hover:bg-emerald-100">
                      Paid
                    </Badge>
                  </div>
                </div>

                {standsLoading ? (
                  <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    loading stands...
                  </p>
                ) : standsError ? (
                  <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    {standsError}
                  </p>
                ) : stands.length === 0 ? (
                  <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    No stand layout data available yet.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {(["premium", "single", "shared"] as const).map((type) => {
                      const rows = standsByType[type];
                      if (rows.length === 0) return null;

                      return (
                        <Card key={type} className="rounded-3xl border border-slate-200 shadow-none">
                          <CardHeader>
                            <CardTitle className="text-lg font-black capitalize">
                              {type} stands
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {rows.map((stand) => (
                              <div
                                key={stand.id}
                                className="rounded-2xl border border-slate-200 bg-white p-4"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <button
                                    className="text-left"
                                    onClick={() => openStandDetail(stand)}
                                  >
                                    <p className="font-bold text-slate-900">
                                      {stand.standCode} - {stand.label}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {stand.standType} / cap {stand.capacity}
                                    </p>
                                  </button>
                                  <StatusPill value={stand.occupancyStatus} />
                                </div>
                                <p className="mt-2 text-xs text-slate-600">
                                  Occupied:{" "}
                                  {stand.standType === "shared"
                                    ? `${stand.occupiedSlots + stand.heldSlots}/${stand.capacity}`
                                    : stand.occupancyStatus === "available"
                                      ? "0/1"
                                      : "1/1"}
                                </p>

                                {stand.standType === "shared" ? (
                                  <div className="mt-3 grid gap-2">
                                    {stand.slots.length === 0 ? (
                                      <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                        No slots configured.
                                      </p>
                                    ) : (
                                      stand.slots.map((slot) => (
                                        <button
                                          key={slot.id}
                                          onClick={() => openSlotDetail(stand, slot)}
                                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left"
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-semibold text-slate-800">
                                              {slot.slotLabel}
                                            </span>
                                            <StatusPill value={slot.status} />
                                          </div>
                                          <p className="mt-1 text-xs text-slate-600">
                                            {slot.vendor ? formatVendorName(slot.vendor) : "Unassigned"}
                                          </p>
                                        </button>
                                      ))
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="registrations" className="mt-6 space-y-5">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={registrationSearch}
                      onChange={(event) => setRegistrationSearch(event.target.value)}
                      placeholder="Search by vendor, brand, phone, stand or booking ref"
                      className="rounded-2xl pl-10"
                    />
                  </div>
                  <Select
                    value={registrationStatusFilter}
                    onValueChange={setRegistrationStatusFilter}
                  >
                    <SelectTrigger className="w-full rounded-2xl lg:w-[220px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="held">Held</SelectItem>
                      <SelectItem value="pending_payment">Pending payment</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="success">Payment success</SelectItem>
                      <SelectItem value="pending">Payment pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {registrationsLoading ? (
                  <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    loading registrations...
                  </p>
                ) : registrationsError ? (
                  <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    {registrationsError}
                  </p>
                ) : filteredRegistrations.length === 0 ? (
                  <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    No registrations yet.
                  </p>
                ) : (
                  <Card className="rounded-3xl border border-slate-200 shadow-none">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-slate-50 text-left text-slate-500">
                            <tr>
                              <th className="px-4 py-3 font-semibold">Booking Ref</th>
                              <th className="px-4 py-3 font-semibold">Vendor</th>
                              <th className="px-4 py-3 font-semibold">Brand</th>
                              <th className="px-4 py-3 font-semibold">Stand</th>
                              <th className="px-4 py-3 font-semibold">Amount</th>
                              <th className="px-4 py-3 font-semibold">Status</th>
                              <th className="px-4 py-3 font-semibold">Payment</th>
                              <th className="px-4 py-3 font-semibold">Created</th>
                              <th className="px-4 py-3 font-semibold"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredRegistrations.map((row) => (
                              <tr key={row.registrationId} className="border-t border-slate-100">
                                <td className="px-4 py-3 font-semibold text-slate-900">
                                  {row.bookingReference}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-slate-900">
                                    {formatVendorName(row.vendor)}
                                  </div>
                                  <div className="text-slate-500">{row.vendor?.phone ?? "-"}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-slate-900">
                                    {row.vendor?.brandName ?? "-"}
                                  </div>
                                  <div className="text-slate-500">
                                    {row.vendor?.businessCategory?.join(", ") ||
                                      row.categories.join(", ") ||
                                      "-"}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  {row.stand?.label ?? "-"}
                                  {row.slot ? ` / ${row.slot.slotLabel}` : ""}
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-900">
                                  {formatNairaFromKobo(row.amountKobo)}
                                </td>
                                <td className="px-4 py-3">
                                  <StatusPill value={row.registrationStatus} />
                                </td>
                                <td className="px-4 py-3">
                                  <StatusPill value={row.payment?.status ?? "pending"} />
                                </td>
                                <td className="px-4 py-3 text-slate-500">
                                  {formatDate(row.createdAt)}
                                </td>
                                <td className="px-4 py-3">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full"
                                    onClick={() => openRegistrationDetail(row)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="payments" className="mt-6 space-y-5">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={paymentSearch}
                      onChange={(event) => setPaymentSearch(event.target.value)}
                      placeholder="Search by reference, vendor, brand or channel"
                      className="rounded-2xl pl-10"
                    />
                  </div>
                  <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                    <SelectTrigger className="w-full rounded-2xl lg:w-[220px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="initialized">Initialized</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="abandoned">Abandoned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentsLoading ? (
                  <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    loading payments...
                  </p>
                ) : paymentsError ? (
                  <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    {paymentsError}
                  </p>
                ) : filteredPayments.length === 0 ? (
                  <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    No payments have been recorded yet.
                  </p>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-3">
                      <MetricCard
                        title="Successful payments"
                        value={payments.filter((row) => row.status === "success").length}
                        hint="Verified transactions"
                        icon={CheckCircle2}
                      />
                      <MetricCard
                        title="Pending payments"
                        value={paymentPendingCount}
                        hint="Pending / initialized"
                        icon={AlertTriangle}
                      />
                      <MetricCard
                        title="Failed payments"
                        value={payments.filter((row) => row.status === "failed" || row.status === "abandoned").length}
                        hint="Needs follow-up"
                        icon={XCircle}
                      />
                    </div>

                    <Card className="rounded-3xl border border-slate-200 shadow-none">
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-left text-slate-500">
                              <tr>
                                <th className="px-4 py-3 font-semibold">Reference</th>
                                <th className="px-4 py-3 font-semibold">Vendor</th>
                                <th className="px-4 py-3 font-semibold">Brand</th>
                                <th className="px-4 py-3 font-semibold">Booking Ref</th>
                                <th className="px-4 py-3 font-semibold">Amount</th>
                                <th className="px-4 py-3 font-semibold">Channel</th>
                                <th className="px-4 py-3 font-semibold">Status</th>
                                <th className="px-4 py-3 font-semibold">Created</th>
                                <th className="px-4 py-3 font-semibold"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredPayments.map((row) => (
                                <tr key={row.paymentId} className="border-t border-slate-100">
                                  <td className="px-4 py-3 font-semibold text-slate-900">
                                    {row.reference}
                                  </td>
                                  <td className="px-4 py-3 text-slate-700">
                                    {formatVendorName(row.vendor)}
                                  </td>
                                  <td className="px-4 py-3 text-slate-700">
                                    {row.vendor?.brandName ?? "-"}
                                  </td>
                                  <td className="px-4 py-3 text-slate-700">
                                    {row.registration?.bookingReference ?? "-"}
                                  </td>
                                  <td className="px-4 py-3 font-medium text-slate-900">
                                    {formatNairaFromKobo(row.amountKobo)}
                                  </td>
                                  <td className="px-4 py-3 text-slate-700">{row.channel ?? "-"}</td>
                                  <td className="px-4 py-3">
                                    <StatusPill value={row.status} />
                                  </td>
                                  <td className="px-4 py-3 text-slate-500">
                                    {formatDate(row.createdAt)}
                                  </td>
                                  <td className="px-4 py-3">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="rounded-full"
                                      onClick={() => openPaymentDetail(row)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>

              <TabsContent value="audit" className="mt-6 space-y-5">
                <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                  <Card className="rounded-3xl border border-slate-200 shadow-none">
                    <CardHeader>
                      <CardTitle className="text-xl font-black">Exports</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button
                        className="w-full justify-start rounded-2xl bg-amber-500 text-black hover:bg-amber-400"
                        disabled={!eventId || exporting !== null}
                        onClick={() => handleExport("registrations")}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {exporting === "registrations"
                          ? "Exporting registrations..."
                          : "Export registrations CSV"}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start rounded-2xl"
                        disabled={!eventId || exporting !== null}
                        onClick={() => handleExport("payments")}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {exporting === "payments"
                          ? "Exporting payments..."
                          : "Export payments CSV"}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start rounded-2xl"
                        disabled={!eventId || exporting !== null}
                        onClick={() => handleExport("stands")}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {exporting === "stands"
                          ? "Exporting stands..."
                          : "Export stand occupancy CSV"}
                      </Button>
                      {exportError ? (
                        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                          {exportError}
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>

                  <Card className="rounded-3xl border border-slate-200 shadow-none">
                    <CardHeader>
                      <CardTitle className="text-xl font-black">Audit log</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {auditLoading ? (
                        <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                          loading audit logs...
                        </p>
                      ) : auditError ? (
                        <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                          {auditError}
                        </p>
                      ) : auditLogs.length === 0 ? (
                        <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                          No audit activity yet.
                        </p>
                      ) : (
                        <ScrollArea className="h-[320px] pr-4">
                          <div className="space-y-3">
                            {auditLogs.map((log) => (
                              <div
                                key={log.id}
                                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-semibold text-slate-900">{log.action}</p>
                                  <StatusPill value={log.actorType} />
                                </div>
                                <p className="mt-1 text-slate-600">
                                  {log.entityType} ({log.entityId})
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {formatDate(log.createdAt)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      <Dialog open={Boolean(selectedDetail)} onOpenChange={(open) => !open && setSelectedDetail(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[2rem] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Admin detail panel</DialogTitle>
            <DialogDescription>
              Real API-backed detail for selected registration, stand, slot, or payment.
            </DialogDescription>
          </DialogHeader>

          {selectedDetail ? (
            <div className="space-y-5">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-black text-slate-900">{selectedDetail.title}</div>
                    <div className="mt-1 text-sm text-slate-500">{selectedDetail.subtitle}</div>
                  </div>
                  <StatusPill value={selectedDetail.status} />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                  <div className="rounded-2xl bg-white p-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Status
                    </div>
                    <div className="mt-2">
                      <StatusPill value={selectedDetail.status} />
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white p-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Amount
                    </div>
                    <div className="mt-2 font-bold text-slate-900">
                      {selectedDetail.amount ?? "-"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="grid gap-2 text-sm text-slate-700">
                  {selectedDetail.lines.length === 0 ? (
                    <p className="text-slate-500">No supporting data available.</p>
                  ) : (
                    selectedDetail.lines.map((line) => (
                      <div
                        key={line.label}
                        className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2"
                      >
                        <span className="font-medium text-slate-600">{line.label}</span>
                        <span className="text-right text-slate-900">{line.value}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <Separator />

              <div className="rounded-2xl border border-slate-200 p-4 text-sm leading-7 text-slate-600">
                All values in this panel are loaded from backend API data. No mock records are
                rendered here.
              </div>
            </div>
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No detail selected.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
