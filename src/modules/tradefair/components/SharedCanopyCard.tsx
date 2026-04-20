import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { formatNaira } from "@/modules/tradefair/utils/money";

export function SharedCanopyCard() {
  return (
    <Card className="rounded-3xl border-emerald-200 bg-emerald-50">
      <CardHeader>
        <CardTitle>Shared Canopy</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-700">
        <p>{formatNaira(59300)} per canopy</p>
        <p>{formatNaira(14825)} per vendor slot</p>
      </CardContent>
    </Card>
  );
}
