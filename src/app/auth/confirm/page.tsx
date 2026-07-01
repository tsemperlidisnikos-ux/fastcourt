import { Suspense } from "react";
import { AuthConfirmClient } from "@/components/auth/AuthConfirmClient";

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0f172a] text-[#94a3b8]">
          Confirming your account…
        </div>
      }
    >
      <AuthConfirmClient />
    </Suspense>
  );
}
