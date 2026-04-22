/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-vars, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
// @ts-nocheck
'use client';

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { createHold, initializePayment } from "@/modules/tradefair/api/tradefair.api";
import { useTradefairEvent } from "@/modules/tradefair/hooks/useTradefairEvent";
import { useTradefairLayout } from "@/modules/tradefair/hooks/useTradefairLayout";
import { MapPin, Users, Tent, ShieldCheck, ArrowRight, Ticket, Phone, Store, Camera, Music2, Star, Lock, CheckCircle2 } from "lucide-react";

const BRAND = {
  name: "Vicsmall",
  primary: "#f59e0b",
  dark: "#111111",
  secondary: "#1d4ed8",
};

const BUSINESS_CATEGORIES = [
  "Fashion & Clothing",
  "Beauty & Cosmetics",
  "Food & Drinks",
  "Accessories",
  "Shoes & Bags",
  "Tech & Gadgets",
  "Books & Stationery",
  "Health & Wellness",
  "Jewellery",
  "Home & Lifestyle",
  "Services",
  "Other",
];

const PRICES = {
  premium: 55000,
  single: 22000,
  shared_canopy: 59300,
  shared_slot: 14825,
};

const TERMS = [
  "Only registered vendors will be authorised to sell or promote their products at the trade fair.",
  "Every registered vendor must wear their identification tag or badge throughout the event.",
  "Promotional materials and product packaging must clearly acknowledge Vicsmall as the event organiser or sponsor where applicable.",
  "Refund requests for vendor registration close on May 15. After that date, registration fees are non-refundable.",
  "Single stands are strictly for one vendor only.",
  "Shared stands are large canopies that accommodate four vendors per stand only.",
  "Subleasing, reselling, or unofficial transfer of a stand or a stand portion is strictly prohibited.",
  "Vicsmall reserves the right to inspect stands and verify that vendors and products match the approved registration.",
  "A selected stand is only confirmed after successful payment verification.",
  "Vicsmall may reassign unpaid reservations that expire after the hold window.",
];

const formatNaira = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);

const createLayout = () => {
  const premium = Array.from({ length: 4 }, (_, i) => ({
    id: `P${i + 1}`,
    label: `Premium ${i + 1}`,
    type: "premium",
    price: PRICES.premium,
    capacity: 1,
    occupied: 0,
    column: "premium",
    row: 1,
  }));

  const single = [];
  for (let c = 1; c <= 3; c += 1) {
    for (let r = 1; r <= 12; r += 1) {
      single.push({
        id: `S${c}-${r}`,
        label: `Single ${c}-${r}`,
        type: "single",
        price: PRICES.single,
        capacity: 1,
        occupied: 0,
        column: `single-${c}`,
        row: r,
      });
    }
  }

  const shared = [];
  for (let c = 1; c <= 3; c += 1) {
    for (let r = 1; r <= 8; r += 1) {
      shared.push({
        id: `H${c}-${r}`,
        label: `Shared ${c}-${r}`,
        type: "shared",
        price: PRICES.shared_canopy,
        capacity: 4,
        occupied: 0,
        column: `shared-${c}`,
        row: r,
        slots: Array.from({ length: 4 }, (_, i) => ({
          id: `H${c}-${r}-V${i + 1}`,
          label: `Slot ${i + 1}`,
          occupied: false,
          vendorName: "",
        })),
      });
    }
  }

  return { premium, single, shared };
};

const STORAGE_KEY = "freeCodeCamp_2026_state_v2";
const HOLD_MINUTES = 20;

const defaultData = () => ({
  ...createLayout(),
  reservations: [],
  payments: [],
  updatedAt: new Date().toISOString(),
});

function readData() {
  if (typeof window === "undefined") return defaultData();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultData();
  try {
    return JSON.parse(raw);
  } catch {
    return defaultData();
  }
}

function writeData(data) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }));
}

function isHoldExpired(reservation) {
  if (!reservation?.holdUntil) return false;
  return new Date(reservation.holdUntil).getTime() < Date.now();
}

function cleanseExpiredHolds(data) {
  const clone = JSON.parse(JSON.stringify(data));
  const expiredIds = new Set(
    clone.reservations.filter((r) => r.status === "held" && isHoldExpired(r)).map((r) => r.id)
  );
  if (!expiredIds.size) return clone;

  clone.reservations = clone.reservations.map((r) =>
    expiredIds.has(r.id) ? { ...r, status: "expired" } : r
  );

  const releaseUnit = (unit) => {
    const heldReservation = clone.reservations.find((r) => r.unitId === unit.id && r.status === "held");
    const paidReservation = clone.reservations.find((r) => r.unitId === unit.id && r.status === "paid");
    if (paidReservation) return unit;

    if (unit.type === "shared") {
      const paidSlots = clone.reservations
        .filter((r) => r.unitId === unit.id && r.status === "paid" && r.slotId)
        .map((r) => r.slotId);
      const heldSlots = clone.reservations
        .filter((r) => r.unitId === unit.id && r.status === "held" && r.slotId)
        .map((r) => r.slotId);

      return {
        ...unit,
        occupied: paidSlots.length + heldSlots.length,
        slots: unit.slots.map((slot) => ({
          ...slot,
          occupied: paidSlots.includes(slot.id) || heldSlots.includes(slot.id),
        })),
      };
    }

    if (heldReservation) {
      return { ...unit, occupied: 1 };
    }

    return { ...unit, occupied: paidReservation ? 1 : 0 };
  };

  clone.premium = clone.premium.map(releaseUnit);
  clone.single = clone.single.map(releaseUnit);
  clone.shared = clone.shared.map(releaseUnit);
  return clone;
}

function StatCard({ title, value, hint, icon: Icon }) {
  return (
    <Card className="rounded-3xl border-0 shadow-lg shadow-black/5">
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <h3 className="mt-1 text-2xl font-bold text-slate-900">{value}</h3>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
        <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function Legend() {
  const items = [
    ["Available", "bg-white border-slate-300"],
    ["Held", "bg-amber-100 border-amber-300"],
    ["Paid", "bg-emerald-100 border-emerald-300"],
    ["Premium", "bg-orange-100 border-orange-300"],
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {items.map(([label, cls]) => (
        <div key={label} className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
          <span className={`h-3 w-3 rounded-full border ${cls}`} />
          {label}
        </div>
      ))}
    </div>
  );
}

function SlotButton({ unit, status, onClick, sharedMode = false, slot, slotStatus }) {
  const clickable = status !== "paid" && (!slot || slotStatus !== "paid");
  const base = unit.type === "premium" ? "border-orange-300 bg-orange-50" : "border-slate-300 bg-white";
  const stateClass = status === "held"
    ? "border-amber-300 bg-amber-100"
    : status === "paid"
    ? "border-emerald-300 bg-emerald-100"
    : base;

  if (sharedMode && slot) {
    const sClass = slotStatus === "held"
      ? "border-amber-300 bg-amber-100"
      : slotStatus === "paid"
      ? "border-emerald-300 bg-emerald-100"
      : "border-slate-300 bg-white";

    return (
      <button
        onClick={clickable ? onClick : undefined}
        className={`rounded-xl border p-1.5 text-[10px] font-semibold transition hover:scale-[1.02] ${sClass} ${clickable ? "cursor-pointer" : "cursor-not-allowed opacity-90"}`}
      >
        {slot.label}
      </button>
    );
  }

  return (
    <button
      onClick={clickable ? onClick : undefined}
      className={`w-full rounded-2xl border p-2 text-left shadow-sm transition hover:-translate-y-0.5 ${stateClass} ${clickable ? "cursor-pointer" : "cursor-not-allowed"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-800">{unit.label}</span>
        <Badge variant="outline" className="rounded-full text-[10px]">
          {unit.type}
        </Badge>
      </div>
      <p className="mt-1 text-[10px] text-slate-600">{formatNaira(unit.price)}</p>
    </button>
  );
}

function MiniField({ data, onSelect, getUnitStatus, getSlotStatus, eventDisplay }) {
  const singleColumns = ["single-1", "single-2", "single-3"];
  const sharedColumns = ["shared-1", "shared-2", "shared-3"];

  const groupedSingles = singleColumns.map((col) => data.single.filter((u) => u.column === col));
  const groupedShared = sharedColumns.map((col) => data.shared.filter((u) => u.column === col));

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-b from-emerald-100 via-lime-50 to-emerald-100 p-3 md:p-5 shadow-2xl shadow-black/10">
      <div className="mx-auto max-w-[1220px] overflow-x-auto">
        <div className="min-w-[980px] rounded-[2rem] border-[10px] border-slate-800 bg-[linear-gradient(180deg,#87c46c_0%,#76b85d_100%)] p-3 md:p-4">
          <div className="relative rounded-[1.5rem] border-4 border-white/70 p-3 md:p-4">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-4 border-white bg-slate-900 px-5 py-2 text-center text-white shadow-lg">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">Gate</div>
              <div className="text-sm font-bold">Main Entrance</div>
            </div>

            <div className="mb-4 grid grid-cols-12 gap-3">
              <div className="col-span-3 rounded-3xl border-2 border-white/70 bg-white/90 p-3 shadow-lg">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><Store className="h-4 w-4 text-amber-600" /> {eventDisplay.vicsmallStandLabel}</div>
                <p className="mt-1 text-xs text-slate-600">Information, support and check-in desk.</p>
              </div>
              <div className="col-span-3 rounded-3xl border-2 border-white/70 bg-white/90 p-3 shadow-lg">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><Camera className="h-4 w-4 text-amber-600" /> {eventDisplay.photoBoothLabel}</div>
                <p className="mt-1 text-xs text-slate-600">Content and picture spot for attendees.</p>
              </div>
              <div className="col-span-6 rounded-3xl border-2 border-white/70 bg-slate-900 p-4 text-white shadow-lg">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-300"><Music2 className="h-4 w-4" /> {eventDisplay.stageLabel}</div>
                <p className="mt-1 text-xs text-slate-300">Performance, announcement and crowd engagement zone.</p>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-4 gap-3">
              {data.premium.map((unit) => (
                <div key={unit.id} className="rounded-[1.25rem] border-2 border-orange-300 bg-orange-50 p-2 shadow-md">
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-orange-800"><Star className="h-3.5 w-3.5" /> {unit.label}</div>
                  <SlotButton unit={unit} status={getUnitStatus(unit)} onClick={() => onSelect(unit)} />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-[1fr_1fr_1fr_0.35fr_1fr_1fr_1fr] gap-2 md:gap-3 items-start">
              {groupedSingles.map((column, idx) => (
                <div key={singleColumns[idx]} className="rounded-[1.4rem] border-2 border-white/70 bg-white/30 p-2">
                  <div className="mb-2 rounded-xl bg-white/80 px-2 py-1 text-center text-[11px] font-bold text-slate-800">Single Column {idx + 1}</div>
                  <div className="space-y-2">
                    {column.map((unit) => (
                      <SlotButton key={unit.id} unit={unit} status={getUnitStatus(unit)} onClick={() => onSelect(unit)} />
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex h-full min-h-[500px] items-center justify-center rounded-[1.4rem] border-2 border-dashed border-white/60 bg-white/20 p-2">
                <div className="rotate-180 text-center [writing-mode:vertical-rl] text-xs font-bold tracking-[0.3em] text-white/90">WALKWAY</div>
              </div>

              {groupedShared.map((column, idx) => (
                <div key={sharedColumns[idx]} className="rounded-[1.4rem] border-2 border-white/70 bg-white/30 p-2">
                  <div className="mb-2 rounded-xl bg-white/80 px-2 py-1 text-center text-[11px] font-bold text-slate-800">Shared Column {idx + 1}</div>
                  <div className="space-y-2">
                    {column.map((unit) => (
                      <div key={unit.id} className="rounded-2xl border border-slate-300 bg-white p-2 shadow-sm">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800">{unit.label}</span>
                          <span className="text-[10px] text-slate-500">4 vendor slots</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {unit.slots.map((slot) => (
                            <SlotButton
                              key={slot.id}
                              unit={unit}
                              slot={slot}
                              sharedMode
                              status={getUnitStatus(unit)}
                              slotStatus={getSlotStatus(unit.id, slot.id)}
                              onClick={() => onSelect(unit, slot)}
                            />
                          ))}
                        </div>
                        <p className="mt-2 text-[10px] text-slate-500">Full canopy: {formatNaira(unit.price)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl bg-white/85 px-4 py-3 text-center text-sm font-semibold text-slate-700 shadow-lg">
              {eventDisplay.eventName} • {eventDisplay.venue} • {eventDisplay.date}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeToken(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function parseGridFromCode(value, prefixes) {
  const normalized = normalizeToken(value);
  for (const prefix of prefixes) {
    const match = normalized.match(new RegExp(`^${prefix}(\\d+)-(\\d+)$`));
    if (!match) continue;
    return {
      column: Number(match[1]),
      row: Number(match[2]),
    };
  }
  return null;
}

function parseGridFromLabel(value, type) {
  const text = String(value ?? "");
  const singleMatch = text.match(/single\s+(\d+)-(\d+)/i);
  if (type === "single" && singleMatch) {
    return {
      column: Number(singleMatch[1]),
      row: Number(singleMatch[2]),
    };
  }

  const sharedMatch = text.match(/(?:shared|canopy)\s+(\d+)-(\d+)/i);
  if (type === "shared" && sharedMatch) {
    return {
      column: Number(sharedMatch[1]),
      row: Number(sharedMatch[2]),
    };
  }

  return null;
}

function sameGrid(a, b) {
  return a && b && a.column === b.column && a.row === b.row;
}

function getSlotIndex(slot) {
  const idMatch = String(slot?.id ?? "").match(/(?:-|^)V(\d+)$/i);
  if (idMatch) return Number(idMatch[1]);

  const labelMatch = String(slot?.label ?? "").match(/(\d+)/);
  if (labelMatch) return Number(labelMatch[1]);

  return null;
}

function resolveBackendSelection(layout, unit, slot) {
  if (!layout || !unit) return null;

  const standPool =
    unit.type === "premium"
      ? layout.premium
      : unit.type === "single"
        ? layout.single
        : layout.shared;

  const targetCode = normalizeToken(unit.id);
  let stand =
    standPool.find((item) => normalizeToken(item.standCode) === targetCode) ?? null;

  if (!stand) {
    stand =
      standPool.find(
        (item) => normalizeToken(item.label) === normalizeToken(unit.label),
      ) ?? null;
  }

  if (!stand && unit.type === "premium") {
    const premiumMatch = targetCode.match(/^P(\d+)$/);
    const premiumIndex = premiumMatch ? Number(premiumMatch[1]) : null;
    if (Number.isFinite(premiumIndex)) {
      stand =
        standPool.find((item) => {
          const codeMatch = normalizeToken(item.standCode).match(/^P(\d+)$/);
          if (codeMatch && Number(codeMatch[1]) === premiumIndex) return true;
          const labelMatch = String(item.label ?? "").match(/premium\s+(\d+)/i);
          if (labelMatch && Number(labelMatch[1]) === premiumIndex) return true;
          return Number(item.column) === premiumIndex;
        }) ?? null;
    }
  }

  if (!stand && (unit.type === "single" || unit.type === "shared")) {
    const prefixes = unit.type === "single" ? ["S"] : ["H", "C"];
    const targetGrid =
      parseGridFromCode(unit.id, prefixes) ?? parseGridFromLabel(unit.label, unit.type);

    if (targetGrid) {
      stand =
        standPool.find((item) => {
          const fromCode = parseGridFromCode(item.standCode, prefixes);
          const fromLabel = parseGridFromLabel(item.label, unit.type);
          const fromPosition = {
            column: Number(item.column),
            row: Number(item.row),
          };

          return (
            sameGrid(fromCode, targetGrid) ||
            sameGrid(fromLabel, targetGrid) ||
            sameGrid(fromPosition, targetGrid)
          );
        }) ?? null;
    }
  }

  if (!stand) return null;
  if (unit.type !== "shared") return { standId: stand.id, slotId: undefined };

  if (!slot) return { standId: stand.id, slotId: undefined };

  const targetSlotCode = normalizeToken(slot.id);
  const slotIndex = getSlotIndex(slot);

  const resolvedSlot =
    stand.slots?.find(
      (item) => normalizeToken(item.slotCode) === targetSlotCode,
    ) ??
    (Number.isFinite(slotIndex)
      ? stand.slots?.find((item) => Number(item.slotIndex) === slotIndex)
      : null) ??
    stand.slots?.find(
      (item) => normalizeToken(item.label) === normalizeToken(slot.label),
    ) ??
    null;

  if (!resolvedSlot?.id) return null;
  return { standId: stand.id, slotId: resolvedSlot.id };
}

const CATEGORY_CODE_MAP = {
  "fashion & clothing": "fashion",
  accessories: "fashion",
  "shoes & bags": "fashion",
  jewellery: "fashion",
  "food & drinks": "food",
  "beauty & cosmetics": "beauty",
  "health & wellness": "beauty",
  "tech & gadgets": "electronics",
  services: "services",
  other: "services",
  "books & stationery": "services",
  "home & lifestyle": "services",
};

function mapToBackendCategoryCodes(categories) {
  const mapped = categories
    .map((category) => CATEGORY_CODE_MAP[String(category).toLowerCase().trim()])
    .filter(Boolean);
  return Array.from(new Set(mapped));
}

export default function TradefairRegisterPage() {
  const { event: eventSummary } = useTradefairEvent();
  const { layout: backendLayout } = useTradefairLayout();
  const [data, setData] = useState(defaultData());
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [holdSubmitting, setHoldSubmitting] = useState(false);
  const [paymentInitializing, setPaymentInitializing] = useState(false);
  const [flowError, setFlowError] = useState(null);
  const [filters, setFilters] = useState("all");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    brandName: "",
    categories: [],
    preferences: "",
    agree: false,
  });

  const eventName = eventSummary?.name || "Trade Fair";
  const eventVenue = eventSummary?.venue || "Venue to be announced";
  const eventDateLabel = eventSummary?.dateLabel || "Date to be announced";
  const supportWhatsapp = eventSummary?.supportContact?.whatsapp || "";
  const supportLink = supportWhatsapp ? `https://wa.me/${supportWhatsapp}` : "#";
  const headerBannerText = eventSummary?.bannerText || `Register for ${eventName}`;
  const eventDescription =
    eventSummary?.shortDescription ||
    "Event information will appear here after admin configuration.";
  const eventStatusText = eventSummary?.registrationStatusText || "";
  const eventHelperText = eventSummary?.publicHelperText || "";
  const eventDisplay = {
    eventName,
    venue: eventVenue,
    date: eventDateLabel,
    vicsmallStandLabel: eventSummary?.displayLabels?.vicsmallStandLabel || "Vicsmall Stand",
    photoBoothLabel: eventSummary?.displayLabels?.photoBoothLabel || "Photo Booth",
    stageLabel: eventSummary?.displayLabels?.stageLabel || "DJ / Music Stage",
  };

  useEffect(() => {
    const fresh = cleanseExpiredHolds(readData());
    setData(fresh);
    writeData(fresh);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setData((prev) => {
        const cleaned = cleanseExpiredHolds(prev);
        writeData(cleaned);
        return cleaned;
      });
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const getReservationForUnit = (unitId, status) => data.reservations.find((r) => r.unitId === unitId && r.status === status);
  const getSlotReservation = (unitId, slotId, status) => data.reservations.find((r) => r.unitId === unitId && r.slotId === slotId && r.status === status);

  const getUnitStatus = (unit) => {
    if (unit.type === "shared") {
      const paidCount = data.reservations.filter((r) => r.unitId === unit.id && r.status === "paid").length;
      const heldCount = data.reservations.filter((r) => r.unitId === unit.id && r.status === "held").length;
      if (paidCount >= unit.capacity) return "paid";
      if (paidCount + heldCount > 0) return "held";
      return "available";
    }
    if (getReservationForUnit(unit.id, "paid")) return "paid";
    if (getReservationForUnit(unit.id, "held")) return "held";
    return "available";
  };

  const getSlotStatus = (unitId, slotId) => {
    if (getSlotReservation(unitId, slotId, "paid")) return "paid";
    if (getSlotReservation(unitId, slotId, "held")) return "held";
    return "available";
  };

  const summary = useMemo(() => {
    const paidSingle = data.reservations.filter((r) => r.status === "paid" && r.type === "single").length;
    const paidPremium = data.reservations.filter((r) => r.status === "paid" && r.type === "premium").length;
    const paidSharedSlots = data.reservations.filter((r) => r.status === "paid" && r.type === "shared").length;

    return {
      premiumLeft: 4 - paidPremium,
      singleLeft: 36 - paidSingle,
      sharedSlotsLeft: 96 - paidSharedSlots,
      sharedCanopiesLeft: data.shared.filter((u) => data.reservations.filter((r) => r.unitId === u.id && r.status === "paid").length < 4).length,
      totalRevenue: data.payments.filter((p) => p.status === "success").reduce((sum, p) => sum + p.amount, 0),
    };
  }, [data]);

  const filteredData = useMemo(() => {
    if (filters === "all") return data;
    const filterStatus = filters;
    return {
      ...data,
      premium: data.premium.filter((u) => getUnitStatus(u) === filterStatus),
      single: data.single.filter((u) => getUnitStatus(u) === filterStatus),
      shared: data.shared.filter((u) => {
        if (filterStatus === "available") return u.slots.some((s) => getSlotStatus(u.id, s.id) === "available");
        if (filterStatus === "held") return u.slots.some((s) => getSlotStatus(u.id, s.id) === "held");
        if (filterStatus === "paid") return u.slots.every((s) => getSlotStatus(u.id, s.id) === "paid");
        return true;
      }),
    };
  }, [data, filters]);

  const selectUnit = (unit, slot = null) => {
    if (unit.type === "shared" && slot && getSlotStatus(unit.id, slot.id) !== "available") return;
    if (unit.type !== "shared" && getUnitStatus(unit) !== "available") return;
    setFlowError(null);

    setSelected({
      unit,
      slot,
      amount: unit.type === "shared" ? PRICES.shared_slot : unit.price,
    });
    setOpen(true);
  };

  const toggleCategory = (category) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const holdReservation = async () => {
    if (!selected) return;
    setFlowError(null);

    const required = [form.firstName, form.lastName, form.phone, form.brandName];
    if (required.some((v) => !String(v).trim()) || !form.agree) {
      setFlowError("Please complete required fields and accept terms.");
      return;
    }
    if (!form.categories.length) {
      setFlowError("Select at least one business category.");
      return;
    }
    const backendCategoryCodes = mapToBackendCategoryCodes(form.categories);
    if (!backendCategoryCodes.length) {
      setFlowError("Selected categories are not supported for registration.");
      return;
    }

    const backendSelection = resolveBackendSelection(
      backendLayout,
      selected.unit,
      selected.slot,
    );
    if (!backendSelection?.standId) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[tradefair] stand selection mapping failed", {
          unitId: selected.unit?.id,
          unitLabel: selected.unit?.label,
          slotId: selected.slot?.id,
          slotLabel: selected.slot?.label,
          premiumCodes: backendLayout?.premium?.slice(0, 6).map((item) => item.standCode ?? item.label),
          singleCodes: backendLayout?.single?.slice(0, 8).map((item) => item.standCode ?? item.label),
          sharedCodes: backendLayout?.shared?.slice(0, 8).map((item) => item.standCode ?? item.label),
        });
      }
      setFlowError("Unable to map your stand selection. Refresh and try again.");
      return;
    }

    setHoldSubmitting(true);
    try {
      const hold = await createHold({
        standId: backendSelection.standId,
        standType: selected.unit.type,
        slotId: backendSelection.slotId,
        amount: selected.amount,
        vendor: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || "",
          brandName: form.brandName.trim(),
          categories: backendCategoryCodes,
          preferences: form.preferences.trim(),
          agree: Boolean(form.agree),
        },
      });

      setConfirmation({
        id: hold.reservationId,
        bookingReference: hold.bookingReference,
        amount: hold.amountKobo / 100,
        holdUntil: hold.holdUntil,
        customer: form,
      });
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to create hold right now.";
      setFlowError(message);
    } finally {
      setHoldSubmitting(false);
    }
  };

  const startPaystackPayment = async () => {
    if (!confirmation) return;
    setFlowError(null);
    setPaymentInitializing(true);

    try {
      const initialized = await initializePayment(confirmation.id);
      if (!initialized.authorizationUrl) {
        throw new Error("Paystack did not return a checkout URL.");
      }

      window.location.assign(initialized.authorizationUrl);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to initialize payment.";
      setFlowError(message);
      setPaymentInitializing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed,white_30%,#f8fafc_75%)] text-slate-900">
      <section className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-black shadow-lg shadow-amber-500/30">
                <span className="text-lg font-black">V</span>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">{headerBannerText}</p>
                <h1 className="text-xl font-black md:text-2xl">Choose your exact stand position and register online</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-slate-900 px-3 py-1 text-white hover:bg-slate-900">{eventDateLabel}</Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1">{eventVenue}</Badge>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
              <ShieldCheck className="h-4 w-4" /> Official vendor registration portal
            </div>
            <h2 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
              Pick your stand, review the field layout, and complete payment in one smooth flow.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
              {eventDescription}
            </p>
            {eventStatusText ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{eventStatusText}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button className="rounded-2xl bg-amber-500 px-6 py-6 text-black hover:bg-amber-400" onClick={() => document.getElementById("layout")?.scrollIntoView({ behavior: "smooth" })}>
                View stand layout <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" className="rounded-2xl px-6 py-6" asChild>
                <a
                  href={supportLink}
                  target={supportWhatsapp ? "_blank" : undefined}
                  rel={supportWhatsapp ? "noreferrer" : undefined}
                  onClick={(event) => {
                    if (!supportWhatsapp) {
                      event.preventDefault();
                    }
                  }}
                >
                  Contact on WhatsApp
                </a>
              </Button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard title="Premium stands left" value={summary.premiumLeft} hint="4 premium stands total" icon={Star} />
              <StatCard title="Single stands left" value={summary.singleLeft} hint="36 single stands total" icon={Tent} />
              <StatCard title="Shared slots left" value={summary.sharedSlotsLeft} hint="96 vendor slots total" icon={Users} />
              <StatCard title="Revenue tracked" value={formatNaira(summary.totalRevenue)} hint="From successful payments" icon={Ticket} />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-5 md:px-6">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-[2rem] border-0 shadow-xl shadow-black/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl font-black">Pricing overview</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="rounded-3xl border border-orange-200 bg-orange-50 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-orange-800"><Star className="h-4 w-4" /> Premium Stand</div>
                <div className="mt-3 text-3xl font-black">{formatNaira(PRICES.premium)}</div>
                <p className="mt-2 text-sm text-slate-600">One vendor per premium stand. Front row visibility.</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><Tent className="h-4 w-4" /> Single Stand</div>
                <div className="mt-3 text-3xl font-black">{formatNaira(PRICES.single)}</div>
                <p className="mt-2 text-sm text-slate-600">One vendor per stand across 3 columns and 12 rows each.</p>
              </div>
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-800"><Users className="h-4 w-4" /> Shared Canopy</div>
                <div className="mt-3 text-3xl font-black">{formatNaira(PRICES.shared_canopy)}</div>
                <p className="mt-2 text-sm text-slate-600">4 vendors per canopy. Each vendor can choose a specific slot.</p>
                <p className="mt-1 text-xs font-semibold text-emerald-700">Per vendor slot equivalent: {formatNaira(PRICES.shared_slot)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-0 shadow-xl shadow-black/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl font-black">How this registration flow works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-slate-600">
              <div className="flex gap-3"><div className="mt-1 h-7 w-7 rounded-full bg-slate-900 text-center text-xs font-bold leading-7 text-white">1</div><p>Vendor opens the trade fair registration page from the navbar.</p></div>
              <div className="flex gap-3"><div className="mt-1 h-7 w-7 rounded-full bg-slate-900 text-center text-xs font-bold leading-7 text-white">2</div><p>Vendor picks an exact premium, single, or shared vendor slot directly from the visual field map.</p></div>
              <div className="flex gap-3"><div className="mt-1 h-7 w-7 rounded-full bg-slate-900 text-center text-xs font-bold leading-7 text-white">3</div><p>The system shows the correct price automatically and captures the vendor’s details.</p></div>
              <div className="flex gap-3"><div className="mt-1 h-7 w-7 rounded-full bg-slate-900 text-center text-xs font-bold leading-7 text-white">4</div><p>Payment confirms the stand instantly and remaining slot counts update automatically.</p></div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="layout" className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-3xl font-black">Trade fair field layout</h3>
            <p className="mt-1 text-slate-600">Fenced square field, top-centre gate, top-left {eventDisplay.vicsmallStandLabel.toLowerCase()} and {eventDisplay.photoBoothLabel.toLowerCase()}, front premium stands, then the six main stand columns.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Legend />
            <Select value={filters} onValueChange={setFilters}>
              <SelectTrigger className="w-[160px] rounded-2xl bg-white">
                <SelectValue placeholder="Filter view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Show all</SelectItem>
                <SelectItem value="available">Available only</SelectItem>
                <SelectItem value="held">Held only</SelectItem>
                <SelectItem value="paid">Paid only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <MiniField
          data={filteredData}
          onSelect={selectUnit}
          getUnitStatus={getUnitStatus}
          getSlotStatus={getSlotStatus}
          eventDisplay={eventDisplay}
        />

        <p className="mt-4 text-sm text-slate-500">
          Mobile behaviour: the full field keeps the desktop-style arrangement and scrolls horizontally instead of collapsing into one column.
        </p>
        {eventHelperText ? (
          <p className="mt-2 text-sm text-slate-500">{eventHelperText}</p>
        ) : null}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-[2rem] border-0 shadow-xl shadow-black/5">
            <CardHeader>
              <CardTitle className="text-2xl font-black">Vendor terms and conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[420px] pr-4">
                <div className="space-y-3 text-sm leading-7 text-slate-600">
                  {TERMS.map((term, idx) => (
                    <div key={term} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">{idx + 1}</div>
                      <p>{term}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-0 shadow-xl shadow-black/5">
            <CardHeader>
              <CardTitle className="text-2xl font-black">Backend and automation notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="frontend" className="w-full">
                <TabsList className="grid w-full grid-cols-3 rounded-2xl">
                  <TabsTrigger value="frontend">Frontend</TabsTrigger>
                  <TabsTrigger value="backend">Backend</TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                </TabsList>
                <TabsContent value="frontend" className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                  <p>This page already includes the full layout, live selection flow, automatic pricing display, form capture, held status, paid status, and auto-updating slot counts.</p>
                  <p>Right now, persistence is simulated with localStorage so the interaction works as a real clickable prototype.</p>
                </TabsContent>
                <TabsContent value="backend" className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                  <p>For production, connect this page to APIs such as:</p>
                  <div className="rounded-2xl bg-slate-900 p-4 font-mono text-xs text-slate-100">
                    GET /api/tradefair/layout<br />
                    POST /api/tradefair/reservations/hold<br />
                    POST /api/tradefair/payments/initialize<br />
                    POST /api/tradefair/payments/verify<br />
                    GET /api/tradefair/summary<br />
                  </div>
                  <p>Database tables should include stands, stand_slots, reservations, vendors, payments, and audit_logs.</p>
                </TabsContent>
                <TabsContent value="payments" className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                  <p>Use Paystack inline or popup checkout. After payment success, verify server-side with Paystack before marking a slot as paid.</p>
                  <p>Webhook events should also update the reservation status and release failed or expired holds automatically.</p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 md:px-6">
        <Card className="rounded-[2rem] border-0 bg-slate-900 text-white shadow-2xl shadow-black/10">
          <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-2xl font-black">Ready to connect this to your live Vicsmall platform?</h3>
              <p className="mt-2 max-w-2xl text-slate-300">This file is structured so your developer can plug in your real database, Paystack keys, vendor dashboard, and admin reporting without redesigning the page.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button className="rounded-2xl bg-amber-500 px-5 text-black hover:bg-amber-400" onClick={() => document.getElementById("layout")?.scrollIntoView({ behavior: "smooth" })}>Choose a stand</Button>
              <Button variant="outline" className="rounded-2xl border-white/20 bg-transparent text-white hover:bg-white hover:text-slate-900" asChild>
                <a
                  href={supportLink}
                  target={supportWhatsapp ? "_blank" : undefined}
                  rel={supportWhatsapp ? "noreferrer" : undefined}
                  onClick={(event) => {
                    if (!supportWhatsapp) {
                      event.preventDefault();
                    }
                  }}
                ><Phone className="mr-2 h-4 w-4" /> Support</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[2rem] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Complete vendor registration</DialogTitle>
            <DialogDescription>
              {selected?.unit?.label} {selected?.slot ? `• ${selected.slot.label}` : ""} • Amount: {selected ? formatNaira(selected.amount) : ""}
            </DialogDescription>
          </DialogHeader>

          {!confirmation ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Input placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                <Input placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                <Input placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <Input placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>

              <Input placeholder="Brand name" value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} />

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Business category</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`rounded-2xl border px-3 py-2 text-left text-sm transition ${form.categories.includes(cat) ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <Textarea placeholder="Any preferences for your stand?" value={form.preferences} onChange={(e) => setForm({ ...form, preferences: e.target.value })} />

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800"><Lock className="h-4 w-4" /> Reservation summary</div>
                <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <p><span className="font-semibold text-slate-900">Stand:</span> {selected?.unit?.label}</p>
                  <p><span className="font-semibold text-slate-900">Type:</span> {selected?.unit?.type}</p>
                  {selected?.slot && <p><span className="font-semibold text-slate-900">Shared slot:</span> {selected.slot.label}</p>}
                  <p><span className="font-semibold text-slate-900">Amount:</span> {selected ? formatNaira(selected.amount) : ""}</p>
                  <p><span className="font-semibold text-slate-900">Venue:</span> {eventVenue}</p>
                  <p><span className="font-semibold text-slate-900">Date:</span> {eventDateLabel}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
                <Checkbox checked={form.agree} onCheckedChange={(checked) => setForm({ ...form, agree: Boolean(checked) })} />
                <p className="text-sm leading-6 text-slate-600">I agree to the {eventName} terms and conditions.</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" className="rounded-2xl" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  className="rounded-2xl bg-amber-500 text-black hover:bg-amber-400"
                  onClick={() => void holdReservation()}
                  disabled={holdSubmitting}
                >
                  {holdSubmitting ? "Holding stand..." : "Hold stand and continue"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-center gap-2 text-lg font-black text-amber-800"><CheckCircle2 className="h-5 w-5" /> Stand held successfully</div>
                <p className="mt-2 text-sm leading-7 text-slate-700">Your selected stand is held for {HOLD_MINUTES} minutes pending payment confirmation.</p>
                <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                  <p><span className="font-semibold">Reservation ID:</span> {confirmation.id.slice(0, 8).toUpperCase()}</p>
                  <p><span className="font-semibold">Booking Ref:</span> {confirmation.bookingReference}</p>
                  <p><span className="font-semibold">Amount:</span> {formatNaira(confirmation.amount)}</p>
                  <p><span className="font-semibold">Held until:</span> {new Date(confirmation.holdUntil).toLocaleTimeString()}</p>
                  <p><span className="font-semibold">Brand:</span> {confirmation.customer.brandName}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                Payment is initialized from the backend, then you will be redirected to Paystack test checkout. Your stand is only confirmed after backend verification succeeds.
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" className="rounded-2xl" onClick={() => setConfirmation(null)}>Back</Button>
                <Button
                  className="rounded-2xl bg-amber-500 text-black hover:bg-amber-400"
                  onClick={() => void startPaystackPayment()}
                  disabled={paymentInitializing}
                >
                  {paymentInitializing ? "Redirecting..." : "Pay with Paystack (Test)"}
                </Button>
              </div>
            </div>
          )}
          {flowError ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {flowError}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}



