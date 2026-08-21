export type DiagnosticSeverity = "critical" | "warning" | "info" | "ok";

export type DiagnosticFinding = {
  id: string;
  category: string;
  severity: DiagnosticSeverity;
  title: string;
  detail: string;
  fix: string;
};

export type DiagnosticReport = {
  ranAt: string;
  durationMs: number;
  summary: Record<DiagnosticSeverity, number>;
  findings: DiagnosticFinding[];
};

export function summarizeFindings(
  findings: DiagnosticFinding[],
): Record<DiagnosticSeverity, number> {
  const summary: Record<DiagnosticSeverity, number> = {
    critical: 0,
    warning: 0,
    info: 0,
    ok: 0,
  };
  for (const finding of findings) summary[finding.severity] += 1;
  return summary;
}
