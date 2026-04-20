/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-vars */
// @ts-nocheck
'use client';

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Tent,
  Users,
  CreditCard,
  Search,
  Download,
  Filter,
  MapPinned,
  Shield,
  Clock3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Star,
  Camera,
  Store,
  Music2,
  Phone,
  Eye,
  ArrowUpRight,
  MoreHorizontal,
  BadgeCheck,
  Lock,
  RefreshCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const PRICES = {
  premium: 55000,
  single: 22000,
  sharedCanopy: 59300,
  sharedSlot: 14825,
};

const formatNaira = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);

const vendorCategories = [
  "Fashion & Clothing",
  "Beauty & Cosmetics",
  "Food & Drinks",
  "Accessories",
  "Tech & Gadgets",
  "Jewellery",
  "Services",
];

function buildStandMap() {
  const premium = Array.from({ length: 4 }, (_, i) => ({
    id: `P${i + 1}`,
    label: `Premium ${i + 1}`,
    type: "premium",
    price: PRICES.premium,
    status: i < 2 ? "paid" : i === 2 ? "held" : "available",
    vendor: i < 2 ? `Vendor ${i + 1}` : null,
  }));

  const single = [];
  for (let c = 1; c <= 3; c += 1) {
    for (let r = 1; r <= 12; r += 1) {
      const index = (c - 1) * 12 + r;
      single.push({
        id: `S${c}-${r}`,
        label: `Single ${c}-${r}`,
        type: "single",
        column: c,
        row: r,
        price: PRICES.single,
        status: index <= 9 ? "paid" : index <= 13 ? "held" : "available",
        vendor: index <= 9 ? `Brand ${index}` : null,
      });
    }
  }

  const shared = [];
  for (let c = 1; c <= 3; c += 1) {
    for (let r = 1; r <= 8; r += 1) {
      const canopyIndex = (c - 1) * 8 + r;
      shared.push({
        id: `H${c}-${r}`,
        label: `Shared ${c}-${r}`,
        type: "shared",
        column: c,
        row: r,
        price: PRICES.sharedCanopy,
        slots: Array.from({ length: 4 }, (_, i) => {
          const slotIndex = i + 1;
          const seed = canopyIndex + slotIndex;
          const status = seed % 5 === 0 ? "held" : seed % 3 === 0 ? "paid" : "available";
          return {
            id: `H${c}-${r}-V${slotIndex}`,
            label: `Slot ${slotIndex}`,
            price: PRICES.sharedSlot,
            status,
            vendor: status === "paid" ? `Shared Brand ${canopyIndex}-${slotIndex}` : null,
          };
        }),
      });
    }
  }

  return { premium, single, shared };
}

const registrations = [
  {
    id: "VIC-TF-1201-A1B2C3",
    vendor: "Amara Okafor",
    brand: "Glow Haven",
    phone: "+234 803 100 1001",
    standType: "premium",
    stand: "Premium 1",
    slot: "-",
    amount: 55000,
    status: "paid",
    payment: "success",
    category: "Beauty & Cosmetics",
    createdAt: "2026-04-04 09:15",
  },
  {
    id: "VIC-TF-1202-B4D6E8",
    vendor: "David Efe",
    brand: "Urban Kicks",
    phone: "+234 803 100 1002",
    standType: "single",
    stand: "Single 1-3",
    slot: "-",
    amount: 22000,
    status: "paid",
    payment: "success",
    category: "Fashion & Clothing",
    createdAt: "2026-04-04 09:32",
  },
  {
    id: "VIC-TF-1203-F2G7H1",
    vendor: "Favour Ben",
    brand: "Snack Lab",
    phone: "+234 803 100 1003",
    standType: "shared",
    stand: "Shared 2-4",
    slot: "Slot 2",
    amount: 14825,
    status: "held",
    payment: "pending",
    category: "Food & Drinks",
    createdAt: "2026-04-04 10:04",
  },
  {
    id: "VIC-TF-1204-J3K9L0",
    vendor: "Precious Onoja",
    brand: "Tech Nest",
    phone: "+234 803 100 1004",
    standType: "shared",
    stand: "Shared 1-5",
    slot: "Slot 3",
    amount: 14825,
    status: "paid",
    payment: "success",
    category: "Tech & Gadgets",
    createdAt: "2026-04-04 10:23",
  },
  {
    id: "VIC-TF-1205-M5N2P8",
    vendor: "Ijeoma Ayo",
    brand: "Adorn by Ije",
    phone: "+234 803 100 1005",
    standType: "single",
    stand: "Single 2-6",
    slot: "-",
    amount: 22000,
    status: "expired",
    payment: "abandoned",
    category: "Jewellery",
    createdAt: "2026-04-04 10:51",
  },
  {
    id: "VIC-TF-1206-Q7R1T9",
    vendor: "Samuel John",
    brand: "Shoe District",
    phone: "+234 803 100 1006",
    standType: "premium",
    stand: "Premium 2",
    slot: "-",
    amount: 55000,
    status: "paid",
    payment: "success",
    category: "Fashion & Clothing",
    createdAt: "2026-04-04 11:09",
  },
];

const payments = [
  { ref: "PSK_100001", vendor: "Amara Okafor", brand: "Glow Haven", amount: 55000, stand: "Premium 1", status: "success", channel: "card", time: "2026-04-04 09:20" },
  { ref: "PSK_100002", vendor: "David Efe", brand: "Urban Kicks", amount: 22000, stand: "Single 1-3", status: "success", channel: "bank", time: "2026-04-04 09:37" },
  { ref: "PSK_100003", vendor: "Favour Ben", brand: "Snack Lab", amount: 14825, stand: "Shared 2-4 / Slot 2", status: "pending", channel: "transfer", time: "2026-04-04 10:06" },
  { ref: "PSK_100004", vendor: "Precious Onoja", brand: "Tech Nest", amount: 14825, stand: "Shared 1-5 / Slot 3", status: "success", channel: "card", time: "2026-04-04 10:27" },
];

const auditLogs = [
  "Admin blocked Shared 3-7 Slot 1",
  "System expired hold for Single 2-6",
  "Payment verified for Premium 2",
  "Admin moved vendor from Shared 1-2 Slot 4 to Shared 1-4 Slot 1",
  "CSV export downloaded by Event Admin",
];

function MetricCard({ title, value, hint, icon: Icon }) {
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

function StatusBadge({ value }) {
  const styles = {
    paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
    success: "bg-emerald-100 text-emerald-700 border-emerald-200",
    held: "bg-amber-100 text-amber-700 border-amber-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    expired: "bg-rose-100 text-rose-700 border-rose-200",
    abandoned: "bg-rose-100 text-rose-700 border-rose-200",
    available: "bg-slate-100 text-slate-700 border-slate-200",
    blocked: "bg-slate-900 text-white border-slate-800",
  };

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[value] || styles.available}`}>{value}</span>;
}

function AdminFieldMap({ map, onSelectUnit }) {
  const singles = [1, 2, 3].map((col) => map.single.filter((s) => s.column === col));
  const sharedCols = [1, 2, 3].map((col) => map.shared.filter((s) => s.column === col));

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-b from-emerald-100 via-lime-50 to-emerald-100 p-3 md:p-5 shadow-2xl shadow-black/10">
      <div className="overflow-x-auto">
        <div className="min-w-[1080px] rounded-[2rem] border-[10px] border-slate-800 bg-[linear-gradient(180deg,#87c46c_0%,#76b85d_100%)] p-4">
          <div className="relative rounded-[1.5rem] border-4 border-white/70 p-4">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-4 border-white bg-slate-900 px-5 py-2 text-center text-white shadow-lg">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">Gate</div>
              <div className="text-sm font-bold">Main Entrance</div>
            </div>

            <div className="mb-4 grid grid-cols-12 gap-3">
              <div className="col-span-3 rounded-3xl border-2 border-white/70 bg-white/90 p-3 shadow-lg">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><Store className="h-4 w-4 text-amber-600" /> Vicsmall Stand</div>
                <p className="mt-1 text-xs text-slate-600">Information and vendor support desk.</p>
              </div>
              <div className="col-span-3 rounded-3xl border-2 border-white/70 bg-white/90 p-3 shadow-lg">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><Camera className="h-4 w-4 text-amber-600" /> Photo Booth</div>
                <p className="mt-1 text-xs text-slate-600">Photo and content area.</p>
              </div>
              <div className="col-span-6 rounded-3xl border-2 border-white/70 bg-slate-900 p-4 text-white shadow-lg">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-300"><Music2 className="h-4 w-4" /> DJ / Music Stage</div>
                <p className="mt-1 text-xs text-slate-300">Announcements, music and crowd coordination.</p>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-4 gap-3">
              {map.premium.map((unit) => (
                <button
                  key={unit.id}
                  onClick={() => onSelectUnit(unit)}
                  className={`rounded-[1.25rem] border-2 p-3 text-left shadow-md transition hover:-translate-y-0.5 ${unit.status === "paid" ? "border-emerald-300 bg-emerald-100" : unit.status === "held" ? "border-amber-300 bg-amber-100" : "border-orange-300 bg-orange-50"}`}
                >
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-slate-800"><Star className="h-3.5 w-3.5" /> {unit.label}</div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-600">{formatNaira(unit.price)}</p>
                    <StatusBadge value={unit.status} />
                  </div>
                  <p className="mt-2 text-[11px] text-slate-600">{unit.vendor || "Unassigned"}</p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-[1fr_1fr_1fr_0.3fr_1fr_1fr_1fr] gap-3 items-start">
              {singles.map((column, idx) => (
                <div key={idx} className="rounded-[1.4rem] border-2 border-white/70 bg-white/30 p-2">
                  <div className="mb-2 rounded-xl bg-white/80 px-2 py-1 text-center text-[11px] font-bold text-slate-800">Single Column {idx + 1}</div>
                  <div className="space-y-2">
                    {column.map((unit) => (
                      <button
                        key={unit.id}
                        onClick={() => onSelectUnit(unit)}
                        className={`w-full rounded-2xl border p-2 text-left shadow-sm transition hover:-translate-y-0.5 ${unit.status === "paid" ? "border-emerald-300 bg-emerald-100" : unit.status === "held" ? "border-amber-300 bg-amber-100" : "border-slate-300 bg-white"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-slate-800">{unit.label}</span>
                          <StatusBadge value={unit.status} />
                        </div>
                        <p className="mt-1 text-[10px] text-slate-600">{unit.vendor || "Unassigned"}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex h-full min-h-[560px] items-center justify-center rounded-[1.4rem] border-2 border-dashed border-white/60 bg-white/20 p-2">
                <div className="rotate-180 text-center [writing-mode:vertical-rl] text-xs font-bold tracking-[0.3em] text-white/90">WALKWAY</div>
              </div>

              {sharedCols.map((column, idx) => (
                <div key={idx} className="rounded-[1.4rem] border-2 border-white/70 bg-white/30 p-2">
                  <div className="mb-2 rounded-xl bg-white/80 px-2 py-1 text-center text-[11px] font-bold text-slate-800">Shared Column {idx + 1}</div>
                  <div className="space-y-2">
                    {column.map((unit) => (
                      <div key={unit.id} className="rounded-2xl border border-slate-300 bg-white p-2 shadow-sm">
                        <div className="mb-1 flex items-center justify-between">
                          <button onClick={() => onSelectUnit(unit)} className="text-[11px] font-bold text-slate-800 hover:text-amber-700">{unit.label}</button>
                          <span className="text-[10px] text-slate-500">4 slots</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {unit.slots.map((slot) => (
                            <button
                              key={slot.id}
                              onClick={() => onSelectUnit({ ...unit, slot })}
                              className={`rounded-xl border p-1.5 text-[10px] font-semibold transition hover:scale-[1.02] ${slot.status === "paid" ? "border-emerald-300 bg-emerald-100" : slot.status === "held" ? "border-amber-300 bg-amber-100" : "border-slate-300 bg-white"}`}
                            >
                              <div>{slot.label}</div>
                              <div className="mt-0.5 text-[9px] text-slate-500">{slot.vendor || "Available"}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, title, subtitle }) {
  return (
    <button className="rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-amber-100 p-3 text-amber-700"><Icon className="h-5 w-5" /></div>
        <div>
          <div className="font-bold text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
        </div>
      </div>
    </button>
  );
}

export default function TradefairDashboardPage() {
  const standMap = useMemo(() => buildStandMap(), []);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [adminTab, setAdminTab] = useState("dashboard");

  const summary = useMemo(() => {
    const premiumPaid = standMap.premium.filter((s) => s.status === "paid").length;
    const singlePaid = standMap.single.filter((s) => s.status === "paid").length;
    const singleHeld = standMap.single.filter((s) => s.status === "held").length;
    const sharedPaid = standMap.shared.flatMap((s) => s.slots).filter((slot) => slot.status === "paid").length;
    const sharedHeld = standMap.shared.flatMap((s) => s.slots).filter((slot) => slot.status === "held").length;
    const revenue = registrations.filter((r) => r.payment === "success").reduce((sum, r) => sum + r.amount, 0);

    return {
      premiumSold: premiumPaid,
      premiumLeft: 4 - premiumPaid,
      singleSold: singlePaid,
      singleHeld,
      singleLeft: 36 - singlePaid,
      sharedPaid,
      sharedHeld,
      sharedLeft: 96 - sharedPaid,
      activeHolds: registrations.filter((r) => r.status === "held").length,
      revenue,
    };
  }, [standMap]);

  const filteredRegistrations = useMemo(() => {
    return registrations.filter((r) => {
      const text = `${r.id} ${r.vendor} ${r.brand} ${r.phone} ${r.stand} ${r.slot}`.toLowerCase();
      const matchesSearch = !search || text.includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || r.status === statusFilter || r.payment === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

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
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Admin Platform Module</p>
                <h1 className="text-2xl font-black md:text-3xl">Vicsmall Trade Fair IUO 2026 Admin</h1>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="rounded-full bg-slate-900 px-3 py-1 text-white hover:bg-slate-900">Event Live</Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1">IUO Football School Field</Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1">Admin / Events</Badge>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
              <BadgeCheck className="h-4 w-4" /> Full admin management for registrations, stands, slots and payments
            </div>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight md:text-5xl">
              Manage the trade fair from one control centre.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              This admin module is designed to sit inside the existing Vicsmall admin platform and give your team live oversight of stand occupancy, shared-slot assignments, payments, exports, and manual interventions.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <QuickAction icon={Download} title="Export registrations" subtitle="Download vendor and payment records as CSV or Excel." />
              <QuickAction icon={RefreshCcw} title="Reconcile payments" subtitle="Recheck pending Paystack transactions and update statuses." />
              <QuickAction icon={Clock3} title="Monitor active holds" subtitle="See reservations close to expiry and release old unpaid holds." />
              <QuickAction icon={MapPinned} title="Open stand manager" subtitle="Inspect the field visually and override slot availability." />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard title="Revenue tracked" value={formatNaira(summary.revenue)} hint="Successful payments only" icon={CreditCard} />
              <MetricCard title="Active holds" value={summary.activeHolds} hint="Held but not fully paid yet" icon={Lock} />
              <MetricCard title="Single stands left" value={summary.singleLeft} hint="36 total single stands" icon={Tent} />
              <MetricCard title="Shared slots left" value={summary.sharedLeft} hint="96 total shared vendor slots" icon={Users} />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 md:px-6">
        <Card className="rounded-[2rem] border-0 shadow-xl shadow-black/5">
          <CardContent className="p-4 md:p-6">
            <Tabs value={adminTab} onValueChange={setAdminTab}>
              <TabsList className="grid w-full grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 md:grid-cols-5">
                <TabsTrigger value="dashboard" className="rounded-2xl">Dashboard</TabsTrigger>
                <TabsTrigger value="stands" className="rounded-2xl">Stand Manager</TabsTrigger>
                <TabsTrigger value="registrations" className="rounded-2xl">Registrations</TabsTrigger>
                <TabsTrigger value="payments" className="rounded-2xl">Payments</TabsTrigger>
                <TabsTrigger value="audit" className="rounded-2xl">Audit & Exports</TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="mt-6 space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <MetricCard title="Premium sold" value={`${summary.premiumSold}/4`} hint={`${summary.premiumLeft} left`} icon={Star} />
                  <MetricCard title="Single sold" value={`${summary.singleSold}/36`} hint={`${summary.singleHeld} currently held`} icon={Tent} />
                  <MetricCard title="Shared slots sold" value={`${summary.sharedPaid}/96`} hint={`${summary.sharedHeld} currently held`} icon={Users} />
                  <MetricCard title="Pending payments" value={payments.filter((p) => p.status === "pending").length} hint="Need verification or completion" icon={AlertTriangle} />
                  <MetricCard title="Failed / expired" value={registrations.filter((r) => r.status === "expired").length} hint="Slots released back to pool" icon={XCircle} />
                </div>

                <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                  <Card className="rounded-3xl border border-slate-200 shadow-none">
                    <CardHeader>
                      <CardTitle className="text-xl font-black">Operational summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-slate-600">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <div className="font-bold text-slate-900">Today’s event activity</div>
                        <p className="mt-2 leading-7">The dashboard gives the Vicsmall team a quick view of registrations, paid stands, active holds, payment issues, shared canopy occupancy, and remaining availability across premium, single, and shared spaces.</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Stand mix</div>
                          <div className="mt-2 space-y-2 text-sm">
                            <div className="flex items-center justify-between"><span>Premium</span><span className="font-bold">₦55,000</span></div>
                            <div className="flex items-center justify-between"><span>Single</span><span className="font-bold">₦22,000</span></div>
                            <div className="flex items-center justify-between"><span>Shared slot</span><span className="font-bold">₦14,825</span></div>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Support</div>
                          <div className="mt-2 space-y-2 text-sm">
                            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-amber-600" /> +234 904 936 3602</div>
                            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Automated confirmations</div>
                            <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-amber-600" /> Hold expiry monitoring</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-3xl border border-slate-200 shadow-none">
                    <CardHeader>
                      <CardTitle className="text-xl font-black">Recent activity</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {registrations.slice(0, 5).map((row) => (
                        <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-bold text-slate-900">{row.brand}</div>
                              <div className="text-sm text-slate-500">{row.vendor} • {row.stand}{row.slot !== "-" ? ` • ${row.slot}` : ""}</div>
                            </div>
                            <StatusBadge value={row.status} />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="stands" className="mt-6 space-y-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-2xl font-black">Visual stand manager</h3>
                    <p className="mt-1 text-sm text-slate-600">Click any stand or shared slot to inspect vendor assignment, payment state, and admin actions.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="rounded-full px-3 py-1">Available</Badge>
                    <Badge className="rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-amber-700 hover:bg-amber-100">Held</Badge>
                    <Badge className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-emerald-700 hover:bg-emerald-100">Paid</Badge>
                  </div>
                </div>
                <AdminFieldMap map={standMap} onSelectUnit={setSelectedUnit} />
                <p className="text-sm text-slate-500">On mobile, the field preserves the same desktop structure and scrolls horizontally for easier stand management.</p>
              </TabsContent>

              <TabsContent value="registrations" className="mt-6 space-y-5">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by vendor, brand, phone, stand or booking ref" className="rounded-2xl pl-10" />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full rounded-2xl lg:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="held">Held</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="success">Payment success</SelectItem>
                      <SelectItem value="pending">Payment pending</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="rounded-2xl"><Filter className="mr-2 h-4 w-4" /> More filters</Button>
                  <Button className="rounded-2xl bg-amber-500 text-black hover:bg-amber-400"><Download className="mr-2 h-4 w-4" /> Export</Button>
                </div>

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
                            <tr key={row.id} className="border-t border-slate-100">
                              <td className="px-4 py-3 font-semibold text-slate-900">{row.id}</td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-900">{row.vendor}</div>
                                <div className="text-slate-500">{row.phone}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-900">{row.brand}</div>
                                <div className="text-slate-500">{row.category}</div>
                              </td>
                              <td className="px-4 py-3 text-slate-700">{row.stand}{row.slot !== "-" ? ` / ${row.slot}` : ""}</td>
                              <td className="px-4 py-3 font-medium text-slate-900">{formatNaira(row.amount)}</td>
                              <td className="px-4 py-3"><StatusBadge value={row.status} /></td>
                              <td className="px-4 py-3"><StatusBadge value={row.payment} /></td>
                              <td className="px-4 py-3 text-slate-500">{row.createdAt}</td>
                              <td className="px-4 py-3">
                                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSelectedUnit(row)}>
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
              </TabsContent>

              <TabsContent value="payments" className="mt-6 space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <MetricCard title="Successful payments" value={payments.filter((p) => p.status === "success").length} hint="Verified via gateway" icon={CheckCircle2} />
                  <MetricCard title="Pending payments" value={payments.filter((p) => p.status === "pending").length} hint="Need follow-up or retry" icon={AlertTriangle} />
                  <MetricCard title="Payment channels" value="Card / Bank / Transfer" hint="Tracked per transaction" icon={CreditCard} />
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
                            <th className="px-4 py-3 font-semibold">Stand</th>
                            <th className="px-4 py-3 font-semibold">Amount</th>
                            <th className="px-4 py-3 font-semibold">Channel</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                            <th className="px-4 py-3 font-semibold">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((p) => (
                            <tr key={p.ref} className="border-t border-slate-100">
                              <td className="px-4 py-3 font-semibold text-slate-900">{p.ref}</td>
                              <td className="px-4 py-3 text-slate-700">{p.vendor}</td>
                              <td className="px-4 py-3 text-slate-700">{p.brand}</td>
                              <td className="px-4 py-3 text-slate-700">{p.stand}</td>
                              <td className="px-4 py-3 font-medium text-slate-900">{formatNaira(p.amount)}</td>
                              <td className="px-4 py-3 text-slate-700">{p.channel}</td>
                              <td className="px-4 py-3"><StatusBadge value={p.status} /></td>
                              <td className="px-4 py-3 text-slate-500">{p.time}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="audit" className="mt-6 space-y-5">
                <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                  <Card className="rounded-3xl border border-slate-200 shadow-none">
                    <CardHeader>
                      <CardTitle className="text-xl font-black">Exports and controls</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button className="w-full justify-start rounded-2xl bg-amber-500 text-black hover:bg-amber-400"><Download className="mr-2 h-4 w-4" /> Export registrations CSV</Button>
                      <Button variant="outline" className="w-full justify-start rounded-2xl"><Download className="mr-2 h-4 w-4" /> Export payments CSV</Button>
                      <Button variant="outline" className="w-full justify-start rounded-2xl"><Download className="mr-2 h-4 w-4" /> Export stand occupancy report</Button>
                      <Button variant="outline" className="w-full justify-start rounded-2xl"><RefreshCcw className="mr-2 h-4 w-4" /> Run payment reconciliation</Button>
                    </CardContent>
                  </Card>

                  <Card className="rounded-3xl border border-slate-200 shadow-none">
                    <CardHeader>
                      <CardTitle className="text-xl font-black">Audit log</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[320px] pr-4">
                        <div className="space-y-3">
                          {auditLogs.map((log, index) => (
                            <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                              {log}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      <Dialog open={!!selectedUnit} onOpenChange={(open) => !open && setSelectedUnit(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[2rem] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Admin detail panel</DialogTitle>
            <DialogDescription>
              Inspect stand, slot, registration, payment or vendor details and trigger admin actions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-black text-slate-900">{selectedUnit?.label || selectedUnit?.brand || selectedUnit?.stand || "Selection"}</div>
                  <div className="mt-1 text-sm text-slate-500">Detailed admin controls for the selected item.</div>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                <div className="rounded-2xl bg-white p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Status</div>
                  <div className="mt-2"><StatusBadge value={selectedUnit?.status || selectedUnit?.payment || "available"} /></div>
                </div>
                <div className="rounded-2xl bg-white p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Price</div>
                  <div className="mt-2 font-bold text-slate-900">{formatNaira(selectedUnit?.price || selectedUnit?.amount || PRICES.sharedSlot)}</div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button className="justify-start rounded-2xl bg-amber-500 text-black hover:bg-amber-400"><ArrowUpRight className="mr-2 h-4 w-4" /> Open registration</Button>
              <Button variant="outline" className="justify-start rounded-2xl"><RefreshCcw className="mr-2 h-4 w-4" /> Recheck payment</Button>
              <Button variant="outline" className="justify-start rounded-2xl"><Lock className="mr-2 h-4 w-4" /> Block stand or slot</Button>
              <Button variant="outline" className="justify-start rounded-2xl"><MapPinned className="mr-2 h-4 w-4" /> Reassign vendor</Button>
              <Button variant="outline" className="justify-start rounded-2xl"><CheckCircle2 className="mr-2 h-4 w-4" /> Mark paid manually</Button>
              <Button variant="outline" className="justify-start rounded-2xl"><XCircle className="mr-2 h-4 w-4" /> Cancel registration</Button>
            </div>

            <Separator />

            <div className="rounded-2xl border border-slate-200 p-4 text-sm leading-7 text-slate-600">
              This admin prototype is the management-side equivalent of the public registration page. Your developers can now build the admin UI inside the existing Vicsmall admin platform using this layout, alongside the public registration module already created.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

