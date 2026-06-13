"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { analyzeFdbFile } from "@/lib/library/import-fdb";
import {
  importFdbWithProgress,
  type FdbImportMode,
} from "@/lib/library/fdb-worker-client";
import { useLibraryStore } from "@/stores/library-store";

export interface FdImportPanelHandle {
  openPicker: () => void;
}

export const FdImportPanel = forwardRef<FdImportPanelHandle>(
  function FdImportPanel(_props, ref) {
    const inputRef = useRef<HTMLInputElement>(null);
    const refresh = useLibraryStore((s) => s.refresh);
    const [visible, setVisible] = useState(false);
    const [busy, setBusy] = useState(false);
    const [summary, setSummary] = useState("");
    const [formatHint, setFormatHint] = useState("");
    const [progress, setProgress] = useState(0);
    const [importMode, setImportMode] = useState<FdbImportMode>("full");
    const [pendingBatch, setPendingBatch] = useState<{
      file: File;
      nextBatchSkip: number;
      batchIndex: number;
    } | null>(null);

    useImperativeHandle(ref, () => ({
      openPicker: () => inputRef.current?.click(),
    }));

    async function runImport(
      file: File,
      batch?: { skipCandidates: number; batchIndex: number },
      mode: FdbImportMode = importMode,
    ) {
      setBusy(true);
      setVisible(true);
      setProgress(8);
      setSummary(`Analyzing ${file.name}…`);
      try {
        const analysis = await analyzeFdbFile(file);
        setFormatHint(
          analysis.format
            ? `Detected format: ${analysis.format}`
            : "FastDraw archive",
        );
        if (analysis.converterRequired && !analysis.canNamesOnly && mode !== "lazy") {
          setProgress(0);
          setSummary(
            analysis.hints?.join(" ") ||
              "This .fdb format needs the desktop converter before full decode.",
          );
          return;
        }

        const { result } = await importFdbWithProgress(
          file,
          {
            skipCandidates: batch?.skipCandidates ?? 0,
            batchIndex: batch?.batchIndex,
            mode,
          },
          (pct, message) => {
            setProgress(pct);
            setSummary(message);
          },
        );

        await refresh();
        setSummary(result.message ?? `Imported ${result.imported} play(s).`);
        if (result.hasMoreBatches && mode === "full") {
          setPendingBatch({
            file,
            nextBatchSkip: result.nextBatchSkip,
            batchIndex: result.batchIndex + 1,
          });
        } else {
          setPendingBatch(null);
        }
      } catch (err) {
        setProgress(0);
        setSummary(err instanceof Error ? err.message : "Import failed.");
        setPendingBatch(null);
      } finally {
        setBusy(false);
      }
    }

    async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setPendingBatch(null);
      setFormatHint("");
      setProgress(0);
      await runImport(file);
    }

    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept=".fdb,application/octet-stream"
          className="hidden"
          onChange={onPickFile}
        />
        <div
          className="fd-import-post-panel"
          hidden={!visible && !pendingBatch}
          aria-live="polite"
        >
          <div className="fd-import-post-main">
            <div className="fd-import-post-title">FastDraw import</div>
            <div className="fd-import-post-summary">{summary}</div>
            {formatHint ? (
              <div className="fd-import-post-summary">{formatHint}</div>
            ) : null}
            {busy ? (
              <div className="fd-import-post-progress" id="fd-import-post-progress">
                <div
                  className="fd-import-post-progress-fill"
                  id="fd-import-post-progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
            ) : null}
          </div>
          <div className="fd-import-post-actions">
            <button
              type="button"
              className={`fd-import-post-chip${importMode === "full" ? " active" : ""}`}
              disabled={busy}
              onClick={() => setImportMode("full")}
            >
              Full decode
            </button>
            <button
              type="button"
              className={`fd-import-post-chip${importMode === "lazy" ? " active" : ""}`}
              disabled={busy}
              onClick={() => setImportMode("lazy")}
            >
              Lazy index
            </button>
            <button
              type="button"
              className="fd-import-post-btn fd-import-post-btn-primary"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? "Importing…" : "Choose .fdb"}
            </button>
            {pendingBatch ? (
              <button
                type="button"
                className="fd-import-post-btn fd-import-post-next-batch"
                disabled={busy}
                onClick={() =>
                  runImport(pendingBatch.file, {
                    skipCandidates: pendingBatch.nextBatchSkip,
                    batchIndex: pendingBatch.batchIndex,
                  })
                }
              >
                Import next batch
              </button>
            ) : null}
            <button
              type="button"
              className="fd-import-post-btn fd-import-post-clear"
              onClick={() => {
                setVisible(false);
                setSummary("");
                setFormatHint("");
                setProgress(0);
                setPendingBatch(null);
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </>
    );
  },
);
