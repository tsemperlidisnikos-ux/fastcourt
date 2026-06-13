"use client";

import { useState } from "react";

interface Props {
  onRedeem?: (code: string) => Promise<string | null>;
}

export function LicenseKeyRow({ onRedeem }: Props) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const trimmed = code.trim();
    if (!trimmed) return;
    setBusy(true);
    setStatus(null);
    try {
      if (onRedeem) {
        const err = await onRedeem(trimmed);
        setStatus(err ?? "License applied. Refresh the page if access does not update.");
        if (!err) setCode("");
      } else {
        setStatus("License redemption is available in cloud mode.");
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Could not redeem license.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fc-license-key-row">
      <label className="fc-billing-field-label" htmlFor="license-key-input">
        License key
      </label>
      <div className="fc-license-key-controls">
        <input
          id="license-key-input"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="XXXX-XXXX-XXXX"
          autoComplete="off"
          className="fc-license-key-input"
        />
        <button
          type="button"
          className="fc-billing-btn-secondary"
          disabled={busy || !code.trim()}
          onClick={() => void submit()}
        >
          {busy ? "Applying…" : "Apply"}
        </button>
      </div>
      {status ? (
        <p className="fc-billing-status" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}
