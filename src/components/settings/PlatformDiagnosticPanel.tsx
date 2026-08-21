"use client";

import { useMemo, useState } from "react";
import { isAdminUser } from "@/lib/auth/roles";
import {
  runPlatformDiagnostics,
  type DiagnosticFinding,
  type DiagnosticReport,
  type DiagnosticSeverity,
} from "@/lib/admin/platform-diagnostic";
import { useAuthStore } from "@/stores/auth-store";
import { appNotice } from "@/stores/dialog-store";

const SEVERITY_ORDER: DiagnosticSeverity[] = ["critical", "warning", "info", "ok"];

const SEVERITY_LABEL: Record<DiagnosticSeverity, string> = {
  critical: "Critical",
  warning: "Warnings",
  info: "Info",
  ok: "OK",
};

function severityClass(severity: DiagnosticSeverity): string {
  return `fc-diag-sev fc-diag-sev--${severity}`;
}

function downloadReport(report: DiagnosticReport) {
  const lines = [
    `FASTCOURT — Diagnostic Report`,
    `Ran at: ${report.ranAt}`,
    `Duration: ${report.durationMs} ms`,
    `Critical: ${report.summary.critical} | Warning: ${report.summary.warning} | Info: ${report.summary.info} | OK: ${report.summary.ok}`,
    "",
    ...report.findings.map(
      (item, index) =>
        `${index + 1}. [${item.severity.toUpperCase()}] (${item.category}) ${item.title}\n` +
        `   Detail: ${item.detail}\n` +
        `   Fix: ${item.fix}`,
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fastcourt-diagnostic-${report.ranAt.slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function PlatformDiagnosticPanel() {
  const session = useAuthStore((s) => s.session);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [percent, setPercent] = useState(0);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [filter, setFilter] = useState<"all" | DiagnosticSeverity>("all");

  const filtered = useMemo(() => {
    if (!report) return [] as DiagnosticFinding[];
    if (filter === "all") return report.findings;
    return report.findings.filter((item) => item.severity === filter);
  }, [report, filter]);

  if (!isAdminUser(session?.user)) {
    return (
      <section className="org-settings-group is-active-section" data-settings-section="diagnostic">
        <div className="org-settings-group-title">Application diagnostic</div>
        <p className="org-settings-brand-help">
          Only a platform administrator can run this test.
        </p>
      </section>
    );
  }

  async function handleRun() {
    setRunning(true);
    setReport(null);
    setProgress("Starting…");
    setPercent(0);
    try {
      const result = await runPlatformDiagnostics((label, pct) => {
        setProgress(label);
        setPercent(pct);
      });
      setReport(result);
      const crit = result.summary.critical;
      const warn = result.summary.warning;
      appNotice(
        "Diagnostic",
        crit > 0
          ? `Finished: ${crit} critical, ${warn} warning(s).`
          : warn > 0
            ? `Finished: ${warn} warning(s).`
            : "Finished with no critical issues.",
      );
    } catch (err) {
      appNotice(
        "Diagnostic",
        err instanceof Error ? err.message : "Diagnostic failed.",
      );
    } finally {
      setRunning(false);
      setProgress("");
      setPercent(100);
    }
  }

  return (
    <section
      className="org-settings-group is-active-section fc-platform-diagnostic"
      data-settings-section="diagnostic"
    >
      <div className="org-settings-group-title">Application diagnostic</div>
      <p className="org-settings-brand-help">
        Full check of API, cloud/Supabase, IndexedDB, localStorage, users, teams,
        library, billing, AI, routes, and settings. Each finding includes a fix.
        Platform administrator only.
      </p>

      <div className="fc-diag-layout">
        <div className="fc-diag-main">
          <div className="fc-diag-actions">
            <button
              type="button"
              className="org-settings-btn fc-diag-run"
              disabled={running}
              onClick={() => void handleRun()}
            >
              {running ? `Checking… ${percent}%` : "Run full test"}
            </button>
            {report ? (
              <button
                type="button"
                className="org-settings-btn"
                onClick={() => downloadReport(report)}
              >
                Download TXT report
              </button>
            ) : null}
          </div>

          {running ? (
            <div className="fc-diag-progress">
              <div className="fc-diag-progress-bar" style={{ width: `${percent}%` }} />
              <p className="org-settings-brand-help">Step: {progress || "…"}</p>
            </div>
          ) : null}

          {report ? (
            <>
              <div className="fc-diag-summary">
                <span className="fc-diag-sev fc-diag-sev--critical">
                  Critical {report.summary.critical}
                </span>
                <span className="fc-diag-sev fc-diag-sev--warning">
                  Warnings {report.summary.warning}
                </span>
                <span className="fc-diag-sev fc-diag-sev--info">
                  Info {report.summary.info}
                </span>
                <span className="fc-diag-sev fc-diag-sev--ok">OK {report.summary.ok}</span>
                <span className="fc-diag-meta">
                  {report.durationMs} ms · {report.ranAt}
                </span>
              </div>

              <label className="fc-diag-filter">
                <span>Filter</span>
                <select
                  value={filter}
                  onChange={(e) =>
                    setFilter(e.target.value as "all" | DiagnosticSeverity)
                  }
                >
                  <option value="all">All</option>
                  {SEVERITY_ORDER.map((severity) => (
                    <option key={severity} value={severity}>
                      {SEVERITY_LABEL[severity]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="fc-diag-list">
                {filtered.length === 0 ? (
                  <p className="org-settings-brand-help">No findings for this filter.</p>
                ) : (
                  filtered.map((item) => (
                    <article key={item.id + item.title} className="fc-diag-card">
                      <header className="fc-diag-card-head">
                        <span className={severityClass(item.severity)}>
                          {item.severity}
                        </span>
                        <span className="fc-diag-cat">{item.category}</span>
                        <strong>{item.title}</strong>
                      </header>
                      <p className="fc-diag-detail">{item.detail}</p>
                      <p className="fc-diag-fix">
                        <strong>Fix:</strong> {item.fix}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </>
          ) : null}
        </div>

        <aside className="fc-diag-aside">
          <table className="fc-diag-aside-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Values</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Covers</td>
                <td>
                  API, Redis-equivalent cloud, storage, users, teams, SMTP/AI,
                  library, billing, matches/routes, config, backup
                </td>
              </tr>
              <tr>
                <td>Result</td>
                <td>Critical / warnings / info / OK + fix per finding</td>
              </tr>
              <tr>
                <td>Export</td>
                <td>Download a TXT report after the run</td>
              </tr>
              <tr>
                <td>Access</td>
                <td>Platform administrator only</td>
              </tr>
            </tbody>
          </table>
        </aside>
      </div>
    </section>
  );
}
