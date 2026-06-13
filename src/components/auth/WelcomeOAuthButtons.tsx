"use client";

import { useState, type ReactNode } from "react";
import { friendlyAuthError } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/client";
import type { OAuthProvider } from "@/types/auth";

const PROVIDERS: { id: OAuthProvider; label: string; icon: ReactNode }[] = [
  {
    id: "google",
    label: "Google",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    ),
  },
  {
    id: "apple",
    label: "Apple",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="currentColor"
          d="M16.365 1.43c0 1.14-.42 2.08-1.24 2.86-.82.78-1.86 1.17-3.01 1.1-.03-1.1.4-2.08 1.22-2.86.82-.78 1.9-1.18 3.03-1.1zM20.5 17.09c-.58 1.34-.86 1.94-1.61 3.12-.98 1.54-2.36 3.47-4.07 3.49-1.53.02-1.93-.99-3.99-1.01-2.06-.02-2.51.99-4.04 1.01-1.72.02-3.05-1.77-4.03-3.31-2.76-4.28-3.06-9.29-1.35-11.95 1.21-1.92 3.12-3.05 4.91-3.05 1.83 0 2.98 1.01 4.49 1.01 1.46 0 2.35-1.01 4.44-1.01 1.58 0 3.25.86 4.46 2.35-3.92 2.14-3.28 7.72.79 9.36z"
        />
      </svg>
    ),
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="#1877F2"
          d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
        />
      </svg>
    ),
  },
];

export function WelcomeOAuthButtons({
  next,
  mode,
}: {
  next: string;
  mode: "login" | "signup";
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<OAuthProvider | null>(null);

  async function signIn(provider: OAuthProvider) {
    setError(null);
    setLoading(provider);
    const supabase = createClient();
    if (!supabase) {
      setError("Social sign-in requires cloud mode.");
      setLoading(null);
      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        queryParams:
          provider === "facebook" ? { auth_type: "rerequest" } : undefined,
      },
    });

    if (authError) {
      setError(friendlyAuthError(authError.message));
      setLoading(null);
    }
  }

  return (
    <div className="welcome-social-auth" id="welcome-social-auth">
      <p className="welcome-social-divider">
        <span>{mode === "signup" ? "Sign up with" : "Or continue with"}</span>
      </p>
      <div className="welcome-social-buttons">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`welcome-social-btn welcome-social-${p.id}`}
            disabled={loading !== null}
            aria-label={`Continue with ${p.label}`}
            onClick={() => signIn(p.id)}
          >
            {p.icon}
            <span>{loading === p.id ? "…" : p.label}</span>
          </button>
        ))}
      </div>
      {error ? (
        <p className="welcome-auth-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
