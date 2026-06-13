"use client";

import { useEffect } from "react";
import { AppErrorFallback } from "@/components/ui/AppErrorFallback";

export default function AppRouteError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("FastCourt route error:", error);
  }, [error]);

  return (
    <AppErrorFallback
      title="This page crashed"
      message={
        error.message ||
        "Something went wrong while rendering this screen."
      }
      digest={error.digest}
      onRetry={unstable_retry}
    />
  );
}
