export const APP_NAME = "FastCourt";
export const APP_LOGO_PATH = "/icons/fastcourt-logo.png";
/** Square mark — favicon / PWA icon. */
export const APP_ICON_PATH = "/assets/landing/fastcourt-intro-mark.png";
/** PWA / iOS Add to Home Screen */
export const PWA_THEME_COLOR = "#000000";
export const PWA_BACKGROUND_COLOR = "#0f172a";
export const PWA_START_URL = "/library";
export const APP_DESCRIPTION =
  "Tactical basketball play designer for teams";

/** Default UI font family name (Appearance settings). */
export const DEFAULT_APP_FONT = "Puck Bold";

/** CSS font stack for Puck Bold and fallbacks. */
export const DEFAULT_APP_FONT_STACK =
  '"Puck Bold", "Puck", Calibri, "Segoe UI", system-ui, sans-serif';

/** Konva / canvas font-family (no CSS quote escaping). */
export const DEFAULT_APP_FONT_KONVA =
  "Puck Bold, Puck, Calibri, Segoe UI, system-ui, sans-serif";

/** Previous default — one-time migration to Puck Bold. */
export const PREVIOUS_DEFAULT_APP_FONT = "Calibri";

export const PREVIOUS_DEFAULT_APP_FONT_STACK =
  'Calibri, "Segoe UI", Candara, Arial, sans-serif';

/** Legacy default — migrated on load for older installs. */
export const LEGACY_DEFAULT_APP_FONT = "Arial Rounded MT";

export const LEGACY_APP_FONT_STACK =
  '"Arial Rounded MT", "Arial Rounded MT Regular", "Helvetica Rounded", Arial, sans-serif';

export const APP_BUILD =
  process.env.NEXT_PUBLIC_APP_BUILD ?? "next-v7";

/** Default coach trial length (signup, landing copy, admin defaults). */
export const DEFAULT_TRIAL_DAYS = 7;

export const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "admin@fastcourt.eu";

/** Bootstrap account — full admin on signup (local or cloud). */
export const MASTER_ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL ?? ADMIN_EMAIL;

/** Comma-separated list of emails that receive master admin on signup. */
export function getAdminBootstrapEmails(): string[] {
  const raw =
    process.env.NEXT_PUBLIC_ADMIN_EMAILS ??
    process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL ??
    ADMIN_EMAIL;
  const emails = raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  const master = MASTER_ADMIN_EMAIL.trim().toLowerCase();
  if (master && !emails.includes(master)) {
    emails.unshift(master);
  }
  return [...new Set(emails)];
}

export const ROLES = {
  admin: "admin",
  coach: "coach",
  teamAdmin: "team_admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
