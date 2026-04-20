import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { formatNaira } from "@/modules/tradefair/utils/money";

export function SingleStandCard() {
  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>Single Stand</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-700">{formatNaira(22000)}</CardContent>
    </Card>
  );
}
