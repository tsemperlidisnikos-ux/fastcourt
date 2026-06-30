"use client";

import { useRef, useState } from "react";
import {
  createManualBackup,
  createSafetySnapshot,
  exportLibraryJson,
  importLibraryPayload,
  readBackupHistory,
  restoreLatestBackup,
  restoreSafetySnapshot,
  downloadJson,
} from "@/lib/settings/library-backup";
import { useLibraryStore } from "@/stores/library-store";

export function ToolsSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const refresh = useLibraryStore((s) => s.refresh);
  const items = useLibraryStore((s) => s.items);
  const [status, setStatus] = useState<string | null>(null);
  const history = readBackupHistory();

  async function run(action: () => Promise<unknown>, ok: string) {
    try {
      setStatus(null);
      await action();
      setStatus(ok);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Action failed.");
    }
  }

  return (
    <section className="org-settings-group is-active-section" data-settings-section="tools">
      <div className="org-settings-group-title">Import &amp; export</div>
      <p className="org-settings-brand-help">
        Export or restore your local library. Backups are stored in this browser
        only ({items.length} items currently).
      </p>

      {status ? <p className="org-settings-tools-status">{status}</p> : null}

      <div className="org-settings-tools-grid">
        <button
          type="button"
          className="org-settings-btn"
          onClick={() => void run(() => exportLibraryJson(), "Library exported.")}
        >
          Export library (JSON)
        </button>
        <button
          type="button"
          className="org-settings-btn"
          onClick={() => fileRef.current?.click()}
        >
          Import library (JSON)
        </button>
        <button
          type="button"
          className="org-settings-btn"
          onClick={() =>
            void run(async () => {
              const payload = await createManualBackup();
              downloadJson(
                `FastCourt_Backup_${new Date().toISOString().slice(0, 10)}.json`,
                payload,
              );
            }, "Backup created and downloaded.")
          }
        >
          Backup now
        </button>
        <button
          type="button"
          className="org-settings-btn"
          onClick={() =>
            void run(async () => {
              const count = await restoreLatestBackup();
              await refresh();
              return count;
            }, `Restored ${history[0]?.plays.length ?? 0} play(s) from latest backup.`)
          }
          disabled={!history.length}
        >
          Restore last backup
        </button>
        <button
          type="button"
          className="org-settings-btn"
          onClick={() =>
            void run(async () => {
              await createSafetySnapshot();
            }, "Safety snapshot saved.")
          }
        >
          Create safety snapshot
        </button>
        <button
          type="button"
          className="org-settings-btn"
          onClick={() =>
            void run(async () => {
              const count = await restoreSafetySnapshot();
              await refresh();
              return count;
            }, "Safety snapshot restored.")
          }
        >
          Restore safety snapshot
        </button>
      </div>

      {history.length ? (
        <div className="org-settings-backup-history">
          <div className="org-settings-sublabel">Recent backups</div>
          <ul>
            {history.map((entry, i) => (
              <li key={entry.exportedAt}>
                {new Date(entry.exportedAt).toLocaleString()} — {entry.plays.length}{" "}
                plays {i === 0 ? "(latest)" : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            void run(async () => {
              const payload = JSON.parse(String(reader.result));
              const count = await importLibraryPayload(payload);
              await refresh();
              if (!count) {
                throw new Error(
                  "No plays found in this file. Use Export library (JSON) or Backup now from Tools.",
                );
              }
            }, `Imported plays from ${file.name}. Refresh the Library tab if needed.`);
          };
          reader.readAsText(file);
          e.target.value = "";
        }}
      />
    </section>
  );
}
