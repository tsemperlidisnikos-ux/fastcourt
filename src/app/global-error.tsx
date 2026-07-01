"use client";

import { useEffect } from "react";
import { APP_NAME } from "@/lib/config";

/** Inline styles only — avoid CSS imports so Next.js does not preload global-error.css on every page. */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("FastCourt global error:", error);
  }, [error]);

  const message =
    error.message || "FastCourt hit an unexpected error. Try again or reload.";

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <div
          role="alert"
          style={{
            display: "flex",
            minHeight: "100vh",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "#0f172a",
            color: "#f1f5f9",
          }}
        >
          <div
            style={{
              width: "min(480px, 100%)",
              padding: "28px 24px",
              border: "1px solid #334155",
              borderRadius: 14,
              background: "#1e293b",
              boxShadow: "0 18px 40px rgba(0, 0, 0, 0.28)",
            }}
          >
            <p
              style={{
                margin: "0 0 8px",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#94a3b8",
              }}
            >
              {APP_NAME}
            </p>
            <h1 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>
              Application error
            </h1>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "#94a3b8", whiteSpace: "pre-wrap" }}>
              {message}
            </p>
            {error.digest ? (
              <p style={{ margin: "14px 0 0", fontSize: 12, color: "#94a3b8" }}>
                Reference: <code style={{ fontSize: 11 }}>{error.digest}</code>
              </p>
            ) : null}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20 }}>
              <button
                type="button"
                onClick={unstable_retry}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid #2563eb",
                  background: "#2563eb",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid #334155",
                  background: "transparent",
                  color: "#f1f5f9",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
