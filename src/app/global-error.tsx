"use client";

import { useEffect } from "react";
import { AppErrorFallback } from "@/components/ui/AppErrorFallback";
import "@/app/globals.css";

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

  return (
    <html lang="en">
      <body className="min-h-full antialiased">
        <AppErrorFallback
          title="Application error"
          message={
            error.message ||
            "FastCourt hit an unexpected error. Try again or reload."
          }
          digest={error.digest}
          onRetry={unstable_retry}
        />
      </body>
    </html>
  );
}
