import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ExportPanel() {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Exports</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-600">
        CSV/XLSX export options placeholder.
      </CardContent>
    </Card>
  );
}
