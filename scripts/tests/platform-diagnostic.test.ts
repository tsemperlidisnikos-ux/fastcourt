import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { summarizeFindings, type DiagnosticFinding } from "../../src/lib/admin/platform-diagnostic-types.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("platform diagnostic", () => {
  it("summarizes severities", () => {
    const findings: DiagnosticFinding[] = [
      {
        id: "1",
        category: "API",
        severity: "ok",
        title: "a",
        detail: "d",
        fix: "f",
      },
      {
        id: "2",
        category: "API",
        severity: "ok",
        title: "b",
        detail: "d",
        fix: "f",
      },
      {
        id: "3",
        category: "Cloud",
        severity: "warning",
        title: "c",
        detail: "d",
        fix: "f",
      },
      {
        id: "4",
        category: "Access",
        severity: "critical",
        title: "d",
        detail: "d",
        fix: "f",
      },
    ];
    assert.deepEqual(summarizeFindings(findings), {
      critical: 1,
      warning: 1,
      info: 0,
      ok: 2,
    });
  });

  it("is wired only into AdminSettingsPanel", () => {
    const admin = fs.readFileSync(
      path.join(ROOT, "src/components/settings/AdminSettingsPanel.tsx"),
      "utf8",
    );
    const coach = fs.readFileSync(
      path.join(ROOT, "src/components/settings/CoachSettingsPanel.tsx"),
      "utf8",
    );
    const team = fs.readFileSync(
      path.join(ROOT, "src/components/settings/TeamAdminSettingsPanel.tsx"),
      "utf8",
    );
    assert.match(admin, /PlatformDiagnosticPanel/);
    assert.match(admin, /Application diagnostic/);
    assert.doesNotMatch(coach, /PlatformDiagnosticPanel/);
    assert.doesNotMatch(team, /PlatformDiagnosticPanel/);
  });

  it("health and admin diagnostic routes exist", () => {
    assert.ok(fs.existsSync(path.join(ROOT, "src/app/api/health/route.ts")));
    assert.ok(fs.existsSync(path.join(ROOT, "src/app/api/admin/diagnostic/route.ts")));
  });
});
