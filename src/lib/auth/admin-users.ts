import { ROLES } from "@/lib/config";
import type { SessionUser } from "@/types/auth";
import type { AdminUserRecord } from "@/types/admin-user";

const STORAGE_KEY = "fastcourt_admin_users_v1";
const DEFAULT_TRIAL_DAYS = 14;

function isBrowser() {
  return typeof window !== "undefined";
}

function readStore(): AdminUserRecord[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AdminUserRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(users: AdminUserRecord[]) {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

export function sessionToAdminUser(user: SessionUser): AdminUserRecord {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    accessType: user.accessType,
    expiresAt: user.expiresAt,
    createdAt: new Date().toISOString(),
    signupComplete: true,
    trialDays: user.role === ROLES.admin ? 0 : DEFAULT_TRIAL_DAYS,
  };
}

function demoCoaches(): AdminUserRecord[] {
  const now = new Date().toISOString();
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);

  return [
    {
      id: "demo-stefania",
      email: "stefania.tomara@example.com",
      displayName: "STEFANIA TOMARA",
      role: ROLES.coach,
      accessType: "trial",
      expiresAt: trialEnd.toISOString(),
      createdAt: now,
      organization: "Promitheas Patras BC",
      signupComplete: true,
      trialDays: 14,
    },
    {
      id: "demo-nikos",
      email: "nikos.coach@example.com",
      displayName: "NIKOS PAPADOPOULOS",
      role: ROLES.coach,
      accessType: "unlimited",
      expiresAt: null,
      createdAt: now,
      organization: "Athens BC U18",
      signupComplete: true,
      trialDays: 0,
    },
  ];
}

export function ensureAdminUserRegistry(sessionUser: SessionUser): AdminUserRecord[] {
  const existing = readStore();
  const adminRow = sessionToAdminUser({
    ...sessionUser,
    displayName:
      sessionUser.role === ROLES.admin
        ? sessionUser.displayName || "Administrator"
        : sessionUser.displayName,
  });

  if (sessionUser.role === ROLES.admin) {
    adminRow.displayName = "Administrator";
    adminRow.accessType = "unlimited";
    adminRow.expiresAt = null;
  }

  const byId = new Map(existing.map((u) => [u.id, u]));
  const byEmail = new Map(existing.map((u) => [u.email.toLowerCase(), u]));

  if (!byEmail.has(adminRow.email.toLowerCase())) {
    byEmail.set(adminRow.email.toLowerCase(), adminRow);
    byId.set(adminRow.id, adminRow);
  } else {
    const prev = byEmail.get(adminRow.email.toLowerCase())!;
    byId.set(prev.id, { ...prev, ...adminRow, id: prev.id, createdAt: prev.createdAt });
  }

  let users = Array.from(byId.values());

  if (users.filter((u) => u.role !== ROLES.admin).length === 0) {
    for (const demo of demoCoaches()) {
      if (!byEmail.has(demo.email.toLowerCase())) {
        users.push(demo);
      }
    }
  }

  users = users.sort((a, b) => {
    if (a.role === ROLES.admin) return -1;
    if (b.role === ROLES.admin) return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  writeStore(users);
  return users;
}

export function saveAdminUsers(users: AdminUserRecord[]) {
  writeStore(users);
}

export function upsertAdminUser(user: AdminUserRecord): AdminUserRecord[] {
  const users = readStore();
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) users[idx] = user;
  else users.push(user);
  writeStore(users);
  return users;
}

export function findAdminUserByEmail(email: string): AdminUserRecord | null {
  const normalized = email.trim().toLowerCase();
  return (
    readStore().find((u) => u.email.toLowerCase() === normalized) ?? null
  );
}

function isCloudBackedUser(user: SessionUser): boolean {
  return !user.id.startsWith("local-") && !user.id.startsWith("demo-");
}

export function applyAdminRegistryToSession(user: SessionUser): SessionUser {
  if (isCloudBackedUser(user)) return user;
  const row = findAdminUserByEmail(user.email);
  if (!row || row.role === ROLES.admin) return user;
  return {
    ...user,
    displayName: row.displayName || user.displayName,
    role: row.role,
    accessType: row.accessType,
    expiresAt: row.expiresAt,
  };
}

export function isAdminRecord(user: AdminUserRecord) {
  return user.role === ROLES.admin;
}

export function getRoleLabel(user: AdminUserRecord) {
  if (user.role === ROLES.admin) return "Master Administrator";
  if (user.role === ROLES.teamAdmin) return "Team Administrator";
  return "Coach";
}

export function getStatusLabel(user: AdminUserRecord) {
  if (user.role === ROLES.admin) return "Master Administrator";
  if (user.accessType === "unlimited") return "Unlimited";
  if (user.accessType === "subscription") return "Subscribed";
  if (user.expiresAt && new Date(user.expiresAt) < new Date()) return "Expired";
  return "Trial";
}

export function getStatusClass(user: AdminUserRecord) {
  if (user.role === ROLES.admin) return "admin-status-unlimited";
  if (user.accessType === "unlimited") return "admin-status-unlimited";
  if (user.expiresAt && new Date(user.expiresAt) < new Date()) return "admin-status-expired";
  if (user.accessType === "subscription") return "admin-status-subscribed";
  return "admin-status-trial";
}

export function formatAuthDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function formatExpiryLabel(expiresAt: string | null) {
  if (!expiresAt) return "Unlimited";
  try {
    const d = new Date(expiresAt);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function expiryDateInputValue(expiresAt: string | null) {
  if (!expiresAt) return "";
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function expiryTimeInputValue(expiresAt: string | null) {
  if (!expiresAt) return "23:59";
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return "23:59";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function mergeExpiryInputs(date: string, time: string): string | null {
  if (!date) return null;
  const t = time || "23:59";
  const iso = new Date(`${date}T${t}`);
  if (Number.isNaN(iso.getTime())) return null;
  return iso.toISOString();
}

export function addDaysToExpiry(days: number, base?: string | null) {
  const d = base ? new Date(base) : new Date();
  if (Number.isNaN(d.getTime())) return new Date(Date.now() + days * 86400000).toISOString();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export { DEFAULT_TRIAL_DAYS };
