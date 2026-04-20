import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TermsSectionProps {
  terms: string[];
}

export function TermsSection({ terms }: TermsSectionProps) {
  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>Terms and conditions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-slate-600">
        {terms.map((term) => (
          <p key={term}>{term}</p>
        ))}
      </CardContent>
    </Card>
  );
}
