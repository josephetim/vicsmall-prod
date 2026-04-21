"use client";

import { FormEvent, useEffect, useState } from "react";
import { CalendarClock, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";

type EventStatus = "draft" | "live" | "closed" | "archived";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: {
    message?: string;
  };
}

interface EventSummaryApi {
  id: string;
}

interface EventSettingsApi {
  id: string;
  slug: string;
  name: string;
  venue: string;
  status: EventStatus;
  eventDate: string;
  registrationOpenAt: string | null;
  registrationCloseAt: string | null;
  supportContact: {
    whatsapp: string;
    phone: string | null;
    email: string | null;
  };
  shortDescription: string | null;
  bannerText: string | null;
  registrationStatusText: string | null;
  publicHelperText: string | null;
  displayLabels: {
    photoBoothLabel: string | null;
    vicsmallStandLabel: string | null;
    stageLabel: string | null;
  };
}

interface EventSettingsFormState {
  name: string;
  slug: string;
  venue: string;
  status: EventStatus;
  eventDate: string;
  registrationOpenAt: string;
  registrationCloseAt: string;
  supportWhatsapp: string;
  supportPhone: string;
  supportEmail: string;
  shortDescription: string;
  bannerText: string;
  registrationStatusText: string;
  publicHelperText: string;
  photoBoothLabel: string;
  vicsmallStandLabel: string;
  stageLabel: string;
}

const EVENT_SLUG = process.env.NEXT_PUBLIC_TRADEFAIR_EVENT_SLUG ?? "iuo-2026-tradefair";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

async function getData<T>(path: string, init?: RequestInit) {
  const payload = await apiFetch<ApiEnvelope<T>>(path, init);
  if (!payload.success) {
    throw new Error(payload.error?.message ?? "Request failed.");
  }
  return payload.data;
}

function toDatetimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoOrNull(value: string) {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function createEmptyForm(): EventSettingsFormState {
  return {
    name: "",
    slug: "",
    venue: "",
    status: "draft",
    eventDate: "",
    registrationOpenAt: "",
    registrationCloseAt: "",
    supportWhatsapp: "",
    supportPhone: "",
    supportEmail: "",
    shortDescription: "",
    bannerText: "",
    registrationStatusText: "",
    publicHelperText: "",
    photoBoothLabel: "",
    vicsmallStandLabel: "",
    stageLabel: "",
  };
}

function mapSettingsToForm(settings: EventSettingsApi): EventSettingsFormState {
  return {
    name: settings.name ?? "",
    slug: settings.slug ?? "",
    venue: settings.venue ?? "",
    status: settings.status ?? "draft",
    eventDate: toDatetimeLocal(settings.eventDate),
    registrationOpenAt: toDatetimeLocal(settings.registrationOpenAt),
    registrationCloseAt: toDatetimeLocal(settings.registrationCloseAt),
    supportWhatsapp: settings.supportContact?.whatsapp ?? "",
    supportPhone: settings.supportContact?.phone ?? "",
    supportEmail: settings.supportContact?.email ?? "",
    shortDescription: settings.shortDescription ?? "",
    bannerText: settings.bannerText ?? "",
    registrationStatusText: settings.registrationStatusText ?? "",
    publicHelperText: settings.publicHelperText ?? "",
    photoBoothLabel: settings.displayLabels?.photoBoothLabel ?? "",
    vicsmallStandLabel: settings.displayLabels?.vicsmallStandLabel ?? "",
    stageLabel: settings.displayLabels?.stageLabel ?? "",
  };
}

export default function TradefairEventSettingsPage() {
  const [eventId, setEventId] = useState<string | null>(null);
  const [form, setForm] = useState<EventSettingsFormState>(createEmptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEmptyRecord, setIsEmptyRecord] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      setIsEmptyRecord(false);

      try {
        const event = await getData<EventSummaryApi>(`/api/tradefair/events/${EVENT_SLUG}`);
        if (cancelled) return;
        setEventId(event.id);

        try {
          const settings = await getData<EventSettingsApi>(
            `/api/admin/tradefair/events/${event.id}/settings`,
          );
          if (cancelled) return;
          setForm(mapSettingsToForm(settings));
        } catch {
          if (cancelled) return;
          setForm(createEmptyForm());
          setIsEmptyRecord(true);
        }
      } catch (requestError) {
        if (cancelled) return;
        setError(getErrorMessage(requestError, "Failed to load event settings."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (
    key: keyof EventSettingsFormState,
    value: string | EventStatus,
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!eventId) {
      setError("Event context is unavailable. Refresh and try again.");
      return;
    }

    if (!form.name.trim() || !form.slug.trim() || !form.venue.trim() || !form.eventDate.trim()) {
      setError("Event title, slug, venue, and event date are required.");
      return;
    }
    if (!form.supportWhatsapp.trim()) {
      setError("WhatsApp support number is required.");
      return;
    }

    setSaving(true);

    try {
      const updated = await getData<EventSettingsApi>(
        `/api/admin/tradefair/events/${eventId}/settings`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: form.name.trim(),
            slug: form.slug.trim(),
            venue: form.venue.trim(),
            status: form.status,
            eventDate: toIsoOrNull(form.eventDate),
            registrationOpenAt: toIsoOrNull(form.registrationOpenAt),
            registrationCloseAt: toIsoOrNull(form.registrationCloseAt),
            supportContact: {
              whatsapp: form.supportWhatsapp.trim(),
              phone: form.supportPhone.trim() || null,
              email: form.supportEmail.trim() || null,
            },
            shortDescription: form.shortDescription.trim() || null,
            bannerText: form.bannerText.trim() || null,
            registrationStatusText: form.registrationStatusText.trim() || null,
            publicHelperText: form.publicHelperText.trim() || null,
            displayLabels: {
              photoBoothLabel: form.photoBoothLabel.trim() || null,
              vicsmallStandLabel: form.vicsmallStandLabel.trim() || null,
              stageLabel: form.stageLabel.trim() || null,
            },
          }),
        },
      );

      setForm(mapSettingsToForm(updated));
      setIsEmptyRecord(false);
      setSuccessMessage("Event settings saved successfully.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to save event settings."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 md:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Event Setup</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage public-facing event information for admin and vendor pages.
          </p>
        </div>
        {eventId ? (
          <Badge variant="outline" className="w-fit rounded-full px-3 py-1 text-xs">
            Event ID: {eventId}
          </Badge>
        ) : null}
      </div>

      {loading ? (
        <Card className="rounded-3xl border-slate-200">
          <CardContent className="p-6 text-sm text-slate-600">Loading event settings...</CardContent>
        </Card>
      ) : (
        <form className="space-y-6" onSubmit={handleSubmit}>
          {isEmptyRecord ? (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No event settings record was found. Complete the form and save to create/update the
              event configuration.
            </p>
          ) : null}

          {error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              {successMessage}
            </p>
          ) : null}

          <Card className="rounded-3xl border-slate-200">
            <CardHeader>
              <CardTitle>Basic Event Info</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="event-name">
                  Event title
                </label>
                <Input
                  id="event-name"
                  value={form.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                  placeholder="Vicsmall Trade Fair IUO 2026"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="event-slug">
                  Event slug
                </label>
                <Input
                  id="event-slug"
                  value={form.slug}
                  onChange={(event) => handleChange("slug", event.target.value)}
                  placeholder="iuo-2026-tradefair"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="event-venue">
                  Venue / location
                </label>
                <Input
                  id="event-venue"
                  value={form.venue}
                  onChange={(event) => handleChange("venue", event.target.value)}
                  placeholder="IUO Football School Field"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="event-date">
                  Event date and time
                </label>
                <Input
                  id="event-date"
                  type="datetime-local"
                  value={form.eventDate}
                  onChange={(event) => handleChange("eventDate", event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Current event status</label>
                <Select
                  value={form.status}
                  onValueChange={(value: EventStatus) => handleChange("status", value)}
                >
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200">
            <CardHeader>
              <CardTitle>Registration Settings</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  className="text-sm font-semibold text-slate-700"
                  htmlFor="registration-open"
                >
                  Registration opens at
                </label>
                <Input
                  id="registration-open"
                  type="datetime-local"
                  value={form.registrationOpenAt}
                  onChange={(event) => handleChange("registrationOpenAt", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-semibold text-slate-700"
                  htmlFor="registration-close"
                >
                  Registration closes at
                </label>
                <Input
                  id="registration-close"
                  type="datetime-local"
                  value={form.registrationCloseAt}
                  onChange={(event) => handleChange("registrationCloseAt", event.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200">
            <CardHeader>
              <CardTitle>Support Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label
                  className="text-sm font-semibold text-slate-700"
                  htmlFor="support-whatsapp"
                >
                  WhatsApp number
                </label>
                <Input
                  id="support-whatsapp"
                  value={form.supportWhatsapp}
                  onChange={(event) => handleChange("supportWhatsapp", event.target.value)}
                  placeholder="2349049363602"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="support-phone">
                  Support phone
                </label>
                <Input
                  id="support-phone"
                  value={form.supportPhone}
                  onChange={(event) => handleChange("supportPhone", event.target.value)}
                  placeholder="+234..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="support-email">
                  Support email
                </label>
                <Input
                  id="support-email"
                  type="email"
                  value={form.supportEmail}
                  onChange={(event) => handleChange("supportEmail", event.target.value)}
                  placeholder="support@vicsmall.com"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200">
            <CardHeader>
              <CardTitle>Public Display Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="banner-text">
                  Banner text
                </label>
                <Input
                  id="banner-text"
                  value={form.bannerText}
                  onChange={(event) => handleChange("bannerText", event.target.value)}
                  placeholder="Register for Vicsmall Trade Fair IUO 2026"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="short-description">
                  Short description
                </label>
                <Textarea
                  id="short-description"
                  value={form.shortDescription}
                  onChange={(event) => handleChange("shortDescription", event.target.value)}
                  rows={4}
                  placeholder="Public-facing short description of the event."
                />
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-semibold text-slate-700"
                  htmlFor="registration-status-text"
                >
                  Registration status message
                </label>
                <Input
                  id="registration-status-text"
                  value={form.registrationStatusText}
                  onChange={(event) =>
                    handleChange("registrationStatusText", event.target.value)
                  }
                  placeholder="Registration is currently open."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="public-helper-text">
                  Public helper text
                </label>
                <Textarea
                  id="public-helper-text"
                  value={form.publicHelperText}
                  onChange={(event) => handleChange("publicHelperText", event.target.value)}
                  rows={3}
                  placeholder="Short helper note shown on the public registration page."
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200">
            <CardHeader>
              <CardTitle>Field Feature Labels (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="photo-booth-label">
                  Photo booth label
                </label>
                <Input
                  id="photo-booth-label"
                  value={form.photoBoothLabel}
                  onChange={(event) => handleChange("photoBoothLabel", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-semibold text-slate-700"
                  htmlFor="vicsmall-stand-label"
                >
                  Vicsmall stand label
                </label>
                <Input
                  id="vicsmall-stand-label"
                  value={form.vicsmallStandLabel}
                  onChange={(event) => handleChange("vicsmallStandLabel", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="stage-label">
                  Stage label
                </label>
                <Input
                  id="stage-label"
                  value={form.stageLabel}
                  onChange={(event) => handleChange("stageLabel", event.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={saving || loading || !eventId}
              className="rounded-2xl bg-amber-500 text-black hover:bg-amber-400"
            >
              {saving ? (
                <>
                  <CalendarClock className="mr-2 h-4 w-4" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save event settings
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </main>
  );
}

