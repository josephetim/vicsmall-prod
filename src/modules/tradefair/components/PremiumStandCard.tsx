import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { formatNaira } from "@/modules/tradefair/utils/money";

export function PremiumStandCard() {
  return (
    <Card className="rounded-3xl border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle>Premium Stand</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-700">{formatNaira(55000)}</CardContent>
    </Card>
  );
}
