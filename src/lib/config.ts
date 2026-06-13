export const APP_NAME = "FastCourt";
export const APP_LOGO_PATH = "/icons/fastcourt-logo.png";
export const APP_DESCRIPTION =
  "Tactical basketball play designer for teams";
export const APP_BUILD =
  process.env.NEXT_PUBLIC_APP_BUILD ?? "next-v7";
export const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "admin@fastcourt.eu";

/** Bootstrap account — full admin on signup (local or cloud). */
export const MASTER_ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL ?? ADMIN_EMAIL;

export const ROLES = {
  admin: "admin",
  coach: "coach",
  teamAdmin: "team_admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
