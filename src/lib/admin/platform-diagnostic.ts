import { APP_BUILD, APP_NAME, ROLES } from "@/lib/config";
import { loadAdminUsers } from "@/lib/auth/admin-users";
import { loadTeamOrganizations } from "@/lib/auth/team-organizations";
import { isAdminUser } from "@/lib/auth/roles";
import { listStoredPlays } from "@/lib/library/idb";
import { loadPlatformFeatures } from "@/lib/settings/platform-features";
import { loadLibraryNavModules } from "@/lib/settings/library-nav-modules";
import { loadBillingConfig } from "@/lib/settings/billing-config";
import { loadDefaultFieldsConfig } from "@/lib/settings/default-fields";
import { loadAppearanceSettings } from "@/lib/settings/appearance-settings";
import { readBackupHistory } from "@/lib/settings/library-backup";
import { isCloudEnabled, createClient } from "@/lib/supabase/client";
import { getCloudConfigIssue } from "@/lib/supabase/env";
import { useAuthStore } from "@/stores/auth-store";
import {
  summarizeFindings,
  type DiagnosticFinding,
  type DiagnosticReport,
} from "@/lib/admin/platform-diagnostic-types";

export type {
  DiagnosticFinding,
  DiagnosticReport,
  DiagnosticSeverity,
} from "@/lib/admin/platform-diagnostic-types";
export { summarizeFindings } from "@/lib/admin/platform-diagnostic-types";

type ProgressFn = (label: string, percent: number) => void;

type ServerDiagnosticPayload = {
  ok?: boolean;
  error?: string;
  localMode?: boolean;
  openai?: boolean;
  openaiModel?: string;
  serviceRole?: boolean;
  stripe?: boolean;
  cloud?: boolean;
  app?: string;
  build?: string;
};

function finding(
  partial: Omit<DiagnosticFinding, "id"> & { id?: string },
): DiagnosticFinding {
  return {
    id: partial.id ?? `${partial.category}-${partial.title}`.slice(0, 80),
    category: partial.category,
    severity: partial.severity,
    title: partial.title,
    detail: partial.detail,
    fix: partial.fix,
  };
}

function assertPlatformAdmin(): DiagnosticFinding | null {
  const user = useAuthStore.getState().session?.user;
  if (isAdminUser(user)) return null;
  return finding({
    category: "Access",
    severity: "critical",
    title: "Platform admin only",
    detail: "This diagnostic can only run as a platform / master administrator.",
    fix: "Sign in with a platform admin account (role admin).",
  });
}

async function checkApiHealth(): Promise<DiagnosticFinding[]> {
  const out: DiagnosticFinding[] = [];
  try {
    const response = await fetch("/api/health");
    const json = (await response.json()) as {
      ok?: boolean;
      app?: string;
      build?: string;
      cloudConfigured?: boolean;
    };
    if (!response.ok || !json.ok) {
      out.push(
        finding({
          category: "API",
          severity: "critical",
          title: "Health API failed",
          detail: `HTTP ${response.status} from /api/health.`,
          fix: "Confirm the Next.js API routes are deployed and reachable, then reload.",
        }),
      );
      return out;
    }
    out.push(
      finding({
        category: "API",
        severity: "ok",
        title: "Health API OK",
        detail: `${json.app ?? APP_NAME} ${json.build ?? APP_BUILD}. Cloud env: ${json.cloudConfigured ? "yes" : "no"}.`,
        fix: "No action required.",
      }),
    );
  } catch (err) {
    out.push(
      finding({
        category: "API",
        severity: "critical",
        title: "Health API unreachable",
        detail: err instanceof Error ? err.message : "Network error",
        fix: "Open the app from the deployed URL and check network / reverse proxy.",
      }),
    );
  }
  return out;
}

async function checkServerSecrets(): Promise<DiagnosticFinding[]> {
  const out: DiagnosticFinding[] = [];
  try {
    const response = await fetch("/api/admin/diagnostic");
    const json = (await response.json()) as ServerDiagnosticPayload;
    if (response.status === 403) {
      out.push(
        finding({
          category: "Access",
          severity: "critical",
          title: "Server diagnostic refused",
          detail: json.error ?? "Admin only",
          fix: "Only a platform admin session can read server diagnostic status.",
        }),
      );
      return out;
    }
    if (response.status === 401) {
      out.push(
        finding({
          category: "Cloud",
          severity: "warning",
          title: "Not signed in to cloud for server checks",
          detail: "Local health still runs. Server secrets (OpenAI, Stripe, service role) need a cloud admin session.",
          fix: "Sign in with the platform admin cloud account, or continue in local mode.",
        }),
      );
      return out;
    }
    if (!response.ok || !json.ok) {
      out.push(
        finding({
          category: "API",
          severity: "warning",
          title: "Admin diagnostic API problem",
          detail: json.error ?? `HTTP ${response.status}`,
          fix: "Check /api/admin/diagnostic and Supabase service role configuration.",
        }),
      );
      return out;
    }

    out.push(
      finding({
        category: "AI",
        severity: json.openai ? "ok" : "warning",
        title: json.openai ? "OpenAI configured" : "OpenAI not configured",
        detail: json.openai
          ? `Film analyze / Designer Coach can call OpenAI (${json.openaiModel ?? "model"}).`
          : "OPENAI_API_KEY is missing or still a placeholder.",
        fix: json.openai
          ? "No action required."
          : "Set OPENAI_API_KEY on the server and restart / redeploy.",
      }),
    );
    out.push(
      finding({
        category: "Cloud",
        severity: json.serviceRole || json.localMode ? (json.serviceRole ? "ok" : "info") : "warning",
        title: json.serviceRole ? "Service role configured" : "Service role missing",
        detail: json.serviceRole
          ? "Admin profile APIs can update users via service role."
          : "SUPABASE_SERVICE_ROLE_KEY is not set. Cloud admin writes may fail.",
        fix: json.serviceRole
          ? "No action required."
          : "Add SUPABASE_SERVICE_ROLE_KEY on the server (never in the browser).",
      }),
    );
    out.push(
      finding({
        category: "Billing",
        severity: json.stripe ? "ok" : "info",
        title: json.stripe ? "Stripe secrets present" : "Stripe not configured",
        detail: json.stripe
          ? "STRIPE_SECRET_KEY and webhook secret are set."
          : "Stripe env is empty. Manual payment URLs in Billing settings can still be used.",
        fix: json.stripe
          ? "No action required."
          : "Add Stripe keys if you want webhook-backed subscriptions.",
      }),
    );
  } catch (err) {
    out.push(
      finding({
        category: "API",
        severity: "warning",
        title: "Admin diagnostic unreachable",
        detail: err instanceof Error ? err.message : "error",
        fix: "Check that /api/admin/diagnostic is deployed.",
      }),
    );
  }
  return out;
}

async function checkFilmAnalyzeStatus(): Promise<DiagnosticFinding[]> {
  try {
    const response = await fetch("/api/film/analyze/status");
    const json = (await response.json()) as { ok?: boolean; configured?: boolean; model?: string };
    if (!response.ok) {
      return [
        finding({
          category: "Film",
          severity: "warning",
          title: "Film analyze status failed",
          detail: `HTTP ${response.status}`,
          fix: "Confirm src/app/api/film/analyze/status/route.ts is in the deploy.",
        }),
      ];
    }
    return [
      finding({
        category: "Film",
        severity: json.configured ? "ok" : "info",
        title: json.configured ? "Film AI status OK" : "Film AI not configured",
        detail: json.configured
          ? `Analyze clip endpoint reports configured (${json.model ?? "model"}).`
          : "Film Room Analyze clip will stay disabled until OPENAI_API_KEY is set.",
        fix: json.configured
          ? "No action required."
          : "Set OPENAI_API_KEY, then check Film Room → Analyze clip.",
      }),
    ];
  } catch (err) {
    return [
      finding({
        category: "Film",
        severity: "warning",
        title: "Film analyze status unreachable",
        detail: err instanceof Error ? err.message : "error",
        fix: "Check network and /api/film/analyze/status.",
      }),
    ];
  }
}

async function checkRoutesSmoke(): Promise<DiagnosticFinding[]> {
  const routes = [
    "/library",
    "/designer",
    "/settings",
    "/film-room",
    "/opponent-scout",
    "/login",
  ];
  const out: DiagnosticFinding[] = [];
  for (const path of routes) {
    try {
      const response = await fetch(path, { method: "GET" });
      if (response.ok || response.status === 307 || response.status === 302) {
        out.push(
          finding({
            category: "Routes",
            severity: "ok",
            title: `${path} reachable`,
            detail: `HTTP ${response.status}`,
            fix: "No action required.",
          }),
        );
      } else {
        out.push(
          finding({
            category: "Routes",
            severity: "warning",
            title: `${path} unexpected status`,
            detail: `HTTP ${response.status}`,
            fix: "Open the route in the browser and check the app layout / auth redirect.",
          }),
        );
      }
    } catch (err) {
      out.push(
        finding({
          category: "Routes",
          severity: "critical",
          title: `${path} unreachable`,
          detail: err instanceof Error ? err.message : "error",
          fix: "Confirm Next.js routing and the reverse proxy.",
        }),
      );
    }
  }
  return out;
}

function checkStorage(): DiagnosticFinding[] {
  const out: DiagnosticFinding[] = [];
  if (typeof window === "undefined") {
    return [
      finding({
        category: "Storage",
        severity: "critical",
        title: "No browser window",
        detail: "Diagnostics must run in the browser.",
        fix: "Open Settings as platform admin in the web app.",
      }),
    ];
  }

  try {
    const probe = "__fc_diag_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    out.push(
      finding({
        category: "Storage",
        severity: "ok",
        title: "localStorage writable",
        detail: "Browser localStorage accepted a write/read cycle.",
        fix: "No action required.",
      }),
    );
  } catch (err) {
    out.push(
      finding({
        category: "Storage",
        severity: "critical",
        title: "localStorage blocked",
        detail: err instanceof Error ? err.message : "blocked",
        fix: "Disable private mode restrictions or allow storage for this origin.",
      }),
    );
  }

  const indexedOk = typeof indexedDB !== "undefined";
  out.push(
    finding({
      category: "Storage",
      severity: indexedOk ? "ok" : "critical",
      title: indexedOk ? "IndexedDB available" : "IndexedDB missing",
      detail: indexedOk
        ? "Play library can persist in IndexedDB."
        : "This browser cannot store the play library.",
      fix: indexedOk ? "No action required." : "Use a modern browser with IndexedDB enabled.",
    }),
  );

  return out;
}

function checkUsers(): DiagnosticFinding[] {
  const users = loadAdminUsers();
  const out: DiagnosticFinding[] = [];
  const admins = users.filter((u) => u.role === ROLES.admin);
  if (admins.length === 0) {
    out.push(
      finding({
        category: "Users",
        severity: "warning",
        title: "No platform admin in local registry",
        detail: "The visible admin user list has no role=admin row (hidden bootstrap emails are excluded).",
        fix: "Confirm you are signed in as platform admin. Hidden bootstrap accounts do not appear in All users.",
      }),
    );
  } else {
    out.push(
      finding({
        category: "Users",
        severity: "ok",
        title: "Platform admin present",
        detail: `${admins.length} platform admin row(s), ${users.length} visible user(s).`,
        fix: "No action required.",
      }),
    );
  }

  const badEmail = users.filter((u) => !u.email.includes("@"));
  if (badEmail.length) {
    out.push(
      finding({
        category: "Users",
        severity: "warning",
        title: "Invalid emails in registry",
        detail: `${badEmail.length} user(s) without a valid email.`,
        fix: "Open Settings → All users and correct the email.",
      }),
    );
  } else if (users.length) {
    out.push(
      finding({
        category: "Users",
        severity: "ok",
        title: "User emails look valid",
        detail: "Every visible registry email contains @.",
        fix: "No action required.",
      }),
    );
  }

  return out;
}

function checkOrganizations(): DiagnosticFinding[] {
  const orgs = loadTeamOrganizations();
  if (!orgs.length) {
    return [
      finding({
        category: "Teams",
        severity: "info",
        title: "No team organizations yet",
        detail: "Team organizations store is empty on this browser.",
        fix: "Create clubs in Settings → Team organizations if you need shared libraries.",
      }),
    ];
  }
  const missingName = orgs.filter((o) => !o.name?.trim());
  if (missingName.length) {
    return [
      finding({
        category: "Teams",
        severity: "warning",
        title: "Organizations without a name",
        detail: `${missingName.length} of ${orgs.length} org(s) have an empty name.`,
        fix: "Open Settings → Team organizations and set a name.",
      }),
    ];
  }
  return [
    finding({
      category: "Teams",
      severity: "ok",
      title: "Team organizations OK",
      detail: `${orgs.length} organization(s) loaded.`,
      fix: "No action required.",
    }),
  ];
}

async function checkLibrary(): Promise<DiagnosticFinding[]> {
  const out: DiagnosticFinding[] = [];
  try {
    const plays = await listStoredPlays();
    out.push(
      finding({
        category: "Library",
        severity: "ok",
        title: "IndexedDB library readable",
        detail: `${plays.length} play(s) in the current library scope.`,
        fix: plays.length
          ? "No action required."
          : "Import or draw plays, or pull from cloud if this account has a remote library.",
      }),
    );
    const broken = plays.filter((p) => !p.id || !p.title || !Array.isArray(p.frames));
    if (broken.length) {
      out.push(
        finding({
          category: "Library",
          severity: "warning",
          title: "Plays with missing fields",
          detail: `${broken.length} play(s) lack id, title, or frames[].`,
          fix: "Export a backup, then re-import or delete the broken plays from the library.",
        }),
      );
    } else if (plays.length) {
      out.push(
        finding({
          category: "Library",
          severity: "ok",
          title: "Play records look complete",
          detail: "Each play has id, title, and frames.",
          fix: "No action required.",
        }),
      );
    }
  } catch (err) {
    out.push(
      finding({
        category: "Library",
        severity: "critical",
        title: "Cannot read IndexedDB library",
        detail: err instanceof Error ? err.message : String(err),
        fix: "Sign in again so library scope is set, or restore from Settings → Import & export.",
      }),
    );
  }
  return out;
}

function checkConfig(): DiagnosticFinding[] {
  const out: DiagnosticFinding[] = [];
  const features = loadPlatformFeatures();
  out.push(
    finding({
      category: "Config",
      severity: "ok",
      title: "Platform features loaded",
      detail: `Similar plays: ${features.similarPlays ? "on" : "off"}. Designer Coach: ${features.designerCoach ? "on" : "off"}.`,
      fix: "Change these in Settings → Library modules if needed.",
    }),
  );

  const nav = loadLibraryNavModules();
  const enabledCount = Object.values(nav.enabled).filter(Boolean).length;
  out.push(
    finding({
      category: "Config",
      severity: enabledCount > 0 ? "ok" : "critical",
      title: enabledCount > 0 ? "Library modules OK" : "All library modules disabled",
      detail: `${enabledCount} module(s) enabled. Order length: ${nav.order.length}.`,
      fix: enabledCount
        ? "No action required."
        : "Enable at least Draw in Settings → Library modules.",
    }),
  );

  const billing = loadBillingConfig();
  out.push(
    finding({
      category: "Billing",
      severity: "ok",
      title: "Billing config loaded",
      detail: `Support ${billing.supportEmail}. Trial ${billing.defaultTrialDays} day(s). Device limit ${billing.deviceLimitPerCoach}.`,
      fix: "Adjust in Settings → Billing & setup.",
    }),
  );

  const fields = loadDefaultFieldsConfig();
  out.push(
    finding({
      category: "Config",
      severity: "ok",
      title: "Default fields loaded",
      detail: `Seasons ${fields.seasons.length}, series ${fields.series.length}, tags ${fields.tags.length}.`,
      fix: "Edit in Settings → Fields details.",
    }),
  );

  const appearance = loadAppearanceSettings();
  out.push(
    finding({
      category: "Config",
      severity: "ok",
      title: "Appearance loaded",
      detail: `Font ${appearance.appFont}. Theme ${appearance.theme}.`,
      fix: "Change in Settings → Appearance.",
    }),
  );

  const backups = readBackupHistory();
  out.push(
    finding({
      category: "Backup",
      severity: backups.length ? "ok" : "info",
      title: backups.length ? "Local backup history present" : "No local backup history",
      detail: backups.length
        ? `${backups.length} snapshot(s) in this browser (max 3).`
        : "No FastCourt_user_backup history in localStorage yet.",
      fix: backups.length
        ? "No action required. Create more from Settings → Import & export."
        : "Use Backup now in Settings → Import & export.",
    }),
  );

  return out;
}

async function checkCloudSession(): Promise<DiagnosticFinding[]> {
  const issue = getCloudConfigIssue();
  if (issue) {
    return [
      finding({
        category: "Cloud",
        severity: "info",
        title: "Running without Supabase cloud",
        detail: issue,
        fix: "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then rebuild, if you need cloud auth/sync.",
      }),
    ];
  }

  if (!isCloudEnabled()) {
    return [
      finding({
        category: "Cloud",
        severity: "info",
        title: "Cloud client disabled",
        detail: "isCloudEnabled() is false.",
        fix: "Fix public Supabase env and rebuild.",
      }),
    ];
  }

  const supabase = createClient();
  if (!supabase) {
    return [
      finding({
        category: "Cloud",
        severity: "warning",
        title: "Supabase client not created",
        detail: "Env looks set but createClient() returned null.",
        fix: "Rebuild after confirming NEXT_PUBLIC_SUPABASE_* values.",
      }),
    ];
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return [
        finding({
          category: "Cloud",
          severity: "warning",
          title: "Supabase session error",
          detail: error.message,
          fix: "Sign out and sign in again as platform admin.",
        }),
      ];
    }
    return [
      finding({
        category: "Cloud",
        severity: data.session ? "ok" : "info",
        title: data.session ? "Cloud session active" : "No cloud session",
        detail: data.session
          ? `Signed in as ${data.session.user.email ?? data.session.user.id}.`
          : "Public Supabase env is set, but this browser has no auth session.",
        fix: data.session ? "No action required." : "Sign in with the platform admin cloud account.",
      }),
    ];
  } catch (err) {
    return [
      finding({
        category: "Cloud",
        severity: "warning",
        title: "Cloud session check failed",
        detail: err instanceof Error ? err.message : String(err),
        fix: "Check network and Supabase project status.",
      }),
    ];
  }
}

export async function runPlatformDiagnostics(
  onProgress?: ProgressFn,
): Promise<DiagnosticReport> {
  const started = performance.now();
  const findings: DiagnosticFinding[] = [];

  const access = assertPlatformAdmin();
  if (access) {
    return {
      ranAt: new Date().toISOString(),
      durationMs: Math.round(performance.now() - started),
      summary: summarizeFindings([access]),
      findings: [access],
    };
  }

  const steps: Array<{
    label: string;
    run: () => Promise<DiagnosticFinding[]> | DiagnosticFinding[];
  }> = [
    { label: "API health", run: () => checkApiHealth() },
    { label: "Server secrets", run: () => checkServerSecrets() },
    { label: "Film AI", run: () => checkFilmAnalyzeStatus() },
    { label: "Routes", run: () => checkRoutesSmoke() },
    { label: "Storage", run: () => checkStorage() },
    { label: "Users", run: () => checkUsers() },
    { label: "Teams", run: () => checkOrganizations() },
    { label: "Library", run: () => checkLibrary() },
    { label: "Config", run: () => checkConfig() },
    { label: "Cloud", run: () => checkCloudSession() },
  ];

  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    onProgress?.(step.label, Math.round(((i + 1) / steps.length) * 100));
    try {
      findings.push(...(await step.run()));
    } catch (err) {
      findings.push(
        finding({
          category: "Runner",
          severity: "critical",
          title: `Failed step “${step.label}”`,
          detail: err instanceof Error ? err.message : String(err),
          fix: "Open the browser console (F12) and send the stack to the developer.",
        }),
      );
    }
  }

  return {
    ranAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - started),
    summary: summarizeFindings(findings),
    findings,
  };
}
