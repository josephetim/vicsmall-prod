import TradefairRegistrationDetailPage from "@/modules/admin/tradefair/pages/TradefairRegistrationDetailPage";

interface RegistrationDetailRoutePageProps {
  params: Promise<{ registrationId: string }>;
}

export default async function RegistrationDetailRoutePage({
  params,
}: RegistrationDetailRoutePageProps) {
  const { registrationId } = await params;
  return <TradefairRegistrationDetailPage registrationId={registrationId} />;
}
