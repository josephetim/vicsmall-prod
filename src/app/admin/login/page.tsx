import { Suspense } from "react";

import { AdminLoginForm } from "@/modules/admin/auth/components/AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}
