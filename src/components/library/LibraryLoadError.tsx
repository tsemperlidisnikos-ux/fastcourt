"use client";

import "@/styles/app-error.css";
interface LibraryLoadErrorProps {
  message: string;
  onRetry: () => void;
}

export function LibraryLoadError({ message, onRetry }: LibraryLoadErrorProps) {
  return (
    <div className="fc-library-load-error" role="alert">
      <div className="fc-library-load-error-card">
        <h2 className="fc-library-load-error-title">Could not load library</h2>
        <p className="fc-library-load-error-message">{message}</p>
        <p className="fc-library-load-error-hint">
          Your plays are stored in this browser. If storage is blocked (private mode,
          strict settings, or full disk), loading may fail.
        </p>
        <button
          type="button"
          className="fc-library-load-error-retry"
          onClick={onRetry}
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export function LibraryLoadingState() {
  return (
    <div className="fc-library-loading" aria-live="polite" aria-busy="true">
      <p>Loading library…</p>
    </div>
  );
}
