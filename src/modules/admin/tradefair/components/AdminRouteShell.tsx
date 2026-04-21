"use client";

import { type ComponentType, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CircleHelp,
  ClipboardList,
  DoorOpen,
  FileSpreadsheet,
  LayoutDashboard,
  Menu,
  Settings2,
  Shield,
  TableProperties,
  TentTree,
  WalletCards,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiFetch, clearAdminToken } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type MatchMode = "exact" | "prefix";

interface AdminNavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  matchMode: MatchMode;
}

interface AdminNavSection {
  title: string;
  items: AdminNavItem[];
}

const NAV_SECTIONS: AdminNavSection[] = [
  {
    title: "Overview",
    items: [
      {
        href: "/admin",
        label: "Admin Home",
        icon: LayoutDashboard,
        matchMode: "exact",
      },
      {
        href: "/admin/tradefair",
        label: "Tradefair Dashboard",
        icon: Shield,
        matchMode: "exact",
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        href: "/admin/tradefair/registrations",
        label: "Registrations",
        icon: ClipboardList,
        matchMode: "prefix",
      },
      {
        href: "/admin/tradefair/payments",
        label: "Payments",
        icon: WalletCards,
        matchMode: "exact",
      },
      {
        href: "/admin/tradefair/stands",
        label: "Stand Manager",
        icon: TentTree,
        matchMode: "exact",
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        href: "/admin/tradefair/settings",
        label: "Event Settings",
        icon: Settings2,
        matchMode: "exact",
      },
      {
        href: "/admin/tradefair/exports",
        label: "Exports",
        icon: FileSpreadsheet,
        matchMode: "exact",
      },
      {
        href: "/admin/tradefair/audit-log",
        label: "Audit Log",
        icon: TableProperties,
        matchMode: "exact",
      },
    ],
  },
  {
    title: "Support",
    items: [
      {
        href: "/admin/help",
        label: "Help",
        icon: CircleHelp,
        matchMode: "exact",
      },
    ],
  },
];

interface AdminRouteShellProps {
  children: React.ReactNode;
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function isNavItemActive(item: AdminNavItem, pathname: string): boolean {
  if (item.matchMode === "exact") {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function deriveHeaderTitle(pathname: string): string {
  const allItems = NAV_SECTIONS.flatMap((section) => section.items);
  const matched = allItems.find((item) => isNavItemActive(item, pathname));
  if (matched) return matched.label;

  if (
    pathname.startsWith("/admin/tradefair/registrations/") &&
    pathname !== "/admin/tradefair/registrations"
  ) {
    return "Registration Detail";
  }

  return "Admin";
}

function deriveBreadcrumb(pathname: string): string {
  if (
    pathname.startsWith("/admin/tradefair/registrations/") &&
    pathname !== "/admin/tradefair/registrations"
  ) {
    return "Admin / Tradefair / Registrations / Detail";
  }
  if (pathname === "/admin/tradefair") {
    return "Admin / Tradefair";
  }

  const segmentMap: Record<string, string> = {
    admin: "Admin",
    tradefair: "Tradefair",
    registrations: "Registrations",
    payments: "Payments",
    stands: "Stand Manager",
    settings: "Event Settings",
    exports: "Exports",
    "audit-log": "Audit Log",
    help: "Help",
    login: "Login",
  };

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => segmentMap[segment] ?? segment);

  return segments.length > 0 ? segments.join(" / ") : "Admin";
}

function AdminNavPanel({
  pathname,
  onNavigate,
  onLogout,
}: {
  pathname: string;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 px-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-600">
          Vicsmall Admin
        </p>
        <h1 className="mt-1 text-lg font-black text-slate-900">Control Panel</h1>
      </div>

      <nav className="space-y-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-2">
            <p className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = isNavItemActive(item, pathname);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition",
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-white",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto space-y-3 border-t border-slate-200 pt-5">
        <p className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Session
        </p>
        <Button
          variant="outline"
          className="w-full justify-start rounded-xl border-slate-300"
          onClick={onLogout}
        >
          <DoorOpen className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}

export function AdminRouteShell({ children }: AdminRouteShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const normalizedPath = normalizePathname(pathname);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const headerTitle = useMemo(
    () => deriveHeaderTitle(normalizedPath),
    [normalizedPath],
  );
  const breadcrumb = useMemo(
    () => deriveBreadcrumb(normalizedPath),
    [normalizedPath],
  );

  const handleLogout = async () => {
    await apiFetch("/api/admin/auth/logout", { method: "POST" }).catch(() => null);
    clearAdminToken();
    setMobileNavOpen(false);
    router.replace("/admin/login");
    router.refresh();
  };

  if (normalizedPath === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-slate-200 bg-slate-50/90 p-4 lg:block">
          <AdminNavPanel pathname={normalizedPath} onLogout={handleLogout} />
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl border-slate-300 lg:hidden"
                  onClick={() => setMobileNavOpen(true)}
                  aria-label="Open admin navigation"
                >
                  <Menu className="h-5 w-5" />
                </Button>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{headerTitle}</p>
                  <p className="truncate text-xs text-slate-500">{breadcrumb}</p>
                </div>
              </div>

              <Button
                variant="outline"
                className="rounded-xl border-slate-300"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </div>
          </header>

          <main className="flex-1">{children}</main>
        </div>
      </div>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-900/45"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[85%] max-w-sm border-r border-slate-200 bg-white p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">Navigation</p>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close admin navigation"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <AdminNavPanel
              pathname={normalizedPath}
              onNavigate={() => setMobileNavOpen(false)}
              onLogout={handleLogout}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
