import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FieldLayout() {
  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>Field layout placeholder</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-600">
        The interactive registration layout is currently rendered by the homepage source-of-truth page.
      </CardContent>
    </Card>
  );
}
