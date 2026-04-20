import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TradefairConfirmationPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="text-2xl font-black">Tradefair Confirmation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>Registration confirmation placeholder.</p>
          <p>
            Wire this page to the <code>getConfirmation</code> method once backend endpoints are
            live.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
