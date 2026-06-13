import { Suspense } from "react";
import "@/styles/welcome.css";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
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
      <LoginForm />
    </Suspense>
  );
}
