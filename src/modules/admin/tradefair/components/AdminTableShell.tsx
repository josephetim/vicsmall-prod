import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminTableShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AdminTableShell({ title, subtitle, children }: AdminTableShellProps) {
  return (
    <Card className="rounded-3xl border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-black">{title}</CardTitle>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}
