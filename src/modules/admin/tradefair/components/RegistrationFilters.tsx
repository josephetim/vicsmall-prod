import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RegistrationFilters() {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Registration Filters</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-600">
        Search, status, and stand-type filter controls placeholder.
      </CardContent>
    </Card>
  );
}
