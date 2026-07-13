import { Suspense } from "react";
import "@/styles/welcome.css";
import { LoginForm } from "@/components/auth/LoginForm";

/** Match request query on the server so LoginForm hydrates with the same auth mode/fields. */
export const dynamic = "force-dynamic";

function readParam(
  value: string | string[] | undefined,
): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialSignup = readParam(params.signup) === "1";
  const initialRecovery = readParam(params.recovery) === "1";

  return (
    <Suspense
      fallback={
        <div className="welcome-screen">
          <div className="welcome-page">
            <p style={{ color: "#94a3b8" }}>Loading…</p>
          </div>
        </div>
      }
    >
      <LoginForm
        initialSignup={initialSignup}
        initialRecovery={initialRecovery}
      />
    </Suspense>
  );
}
