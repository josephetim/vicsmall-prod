import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminActionPanel() {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Admin Actions</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-600">
        Bulk approval, hold release, and notes actions placeholder.
      </CardContent>
    </Card>
  );
}
