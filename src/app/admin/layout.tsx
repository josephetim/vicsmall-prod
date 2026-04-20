import { AdminRouteShell } from "@/modules/admin/tradefair/components/AdminRouteShell";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AdminRouteShell>{children}</AdminRouteShell>;
}
