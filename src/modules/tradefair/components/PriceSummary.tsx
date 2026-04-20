import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { formatNaira } from "@/modules/tradefair/utils/money";

interface PriceSummaryProps {
  amount: number;
}

export function PriceSummary({ amount }: PriceSummaryProps) {
  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>Price summary</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-700">{formatNaira(amount)}</CardContent>
    </Card>
  );
}
