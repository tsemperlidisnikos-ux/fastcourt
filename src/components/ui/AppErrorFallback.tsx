"use client";

import { APP_NAME } from "@/lib/config";
import "@/styles/app-error.css";

interface AppErrorFallbackProps {
  title?: string;
  message?: string;
  digest?: string;
  retryLabel?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function AppErrorFallback({
  title = "Something went wrong",
  message = "An unexpected error occurred. Try again or reload the page.",
  digest,
  retryLabel = "Try again",
  onRetry,
  compact = false,
}: AppErrorFallbackProps) {
  return (
    <div
      className={`fc-app-error${compact ? " fc-app-error-compact" : ""}`}
      role="alert"
    >
      <div className="fc-app-error-card">
        <p className="fc-app-error-kicker">{APP_NAME}</p>
        <h1 className="fc-app-error-title">{title}</h1>
        <p className="fc-app-error-message">{message}</p>
        {digest ? (
          <p className="fc-app-error-digest">
            Reference: <code>{digest}</code>
          </p>
        ) : null}
        <div className="fc-app-error-actions">
          {onRetry ? (
            <button type="button" className="fc-app-error-retry" onClick={onRetry}>
              {retryLabel}
            </button>
          ) : null}
          <button
            type="button"
            className="fc-app-error-reload"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      </div>
    </div>
  );
}
