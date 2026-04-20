import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminEmptyStateProps {
  title: string;
  message: string;
}

export function AdminEmptyState({ title, message }: AdminEmptyStateProps) {
  return (
    <Card className="rounded-3xl border-slate-200">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-600">{message}</CardContent>
    </Card>
  );
}
