import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { AdminDashboardSummary } from "@/modules/admin/tradefair/types/admin.tradefair.types";
import { formatNaira } from "@/modules/tradefair/utils/money";

interface DashboardSummaryCardsProps {
  summary: AdminDashboardSummary;
}

export function DashboardSummaryCards({ summary }: DashboardSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Total Registrations</CardTitle>
        </CardHeader>
        <CardContent>{summary.totalRegistrations}</CardContent>
      </Card>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Successful Payments</CardTitle>
        </CardHeader>
        <CardContent>{summary.successfulPayments}</CardContent>
      </Card>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Gross Revenue</CardTitle>
        </CardHeader>
        <CardContent>{formatNaira(summary.grossRevenue)}</CardContent>
      </Card>
    </div>
  );
}
