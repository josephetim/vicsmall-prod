"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiFetch, clearAdminToken } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/admin/tradefair", label: "Dashboard" },
  { href: "/admin/tradefair/registrations", label: "Registrations" },
  { href: "/admin/tradefair/payments", label: "Payments" },
  { href: "/admin/tradefair/stands", label: "Stands" },
  { href: "/admin/tradefair/exports", label: "Exports" },
  { href: "/admin/tradefair/audit-log", label: "Audit Log" },
  { href: "/admin/help", label: "Support" },
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

export function AdminRouteShell({ children }: AdminRouteShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const normalizedPath = normalizePathname(pathname);

  const handleLogout = async () => {
    await apiFetch("/api/admin/auth/logout", { method: "POST" }).catch(() => null);
    clearAdminToken();
    router.replace("/admin/login");
    router.refresh();
  };

  if (normalizedPath === "/admin/login") {
    return <>{children}</>;
  }

  if (normalizedPath === "/admin/tradefair") {
    return (
      <>
        {children}
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="rounded-full border-slate-300 bg-white/90 px-4 shadow-lg backdrop-blur"
          >
            Logout
          </Button>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-600">
              Vicsmall Admin
            </p>
            <h1 className="text-lg font-black text-slate-900">Tradefair Control</h1>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="rounded-2xl border-slate-300"
          >
            Logout
          </Button>
        </div>
      </header>

      <div className="border-b border-slate-200 bg-white/90">
        <nav className="mx-auto flex w-full max-w-7xl flex-wrap gap-2 px-4 py-3 md:px-6">
          {NAV_LINKS.map((link) => {
            const active = normalizedPath === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                  active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}
