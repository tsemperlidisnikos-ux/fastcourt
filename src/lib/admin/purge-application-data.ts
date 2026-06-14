import { ROLES } from "@/lib/config";
import { saveAdminUsers } from "@/lib/auth/admin-users";
import type { AdminUserRecord } from "@/types/admin-user";
import { saveTeamOrganizations, loadTeamOrganizations } from "@/lib/auth/team-organizations";
import { playMatchesCoach } from "@/lib/library/admin-library-summary";
import { listStoredPlays, replaceAllStoredPlays } from "@/lib/library/idb";
import { resetLibraryReviewRecords } from "@/lib/library/library-review";
import {
  getPlaybookSections,
  setCustomFieldTags,
  setCustomSeasons,
  setCustomSeries,
  setCustomTeams,
  setPlaybookSections,
  setPracticeData,
} from "@/lib/library/meta";
import {
  purgeCloudUserDataExceptAdmin,
} from "@/lib/auth/profiles-cloud";
import { createClient, isCloudEnabled } from "@/lib/supabase/client";
import type { SessionUser } from "@/types/auth";
import type { StoredPlay } from "@/types/library";
import type { PlaybookSection } from "@/types/library-meta";
import type { TeamOrganization } from "@/types/team-org";

const USER_SETTINGS_PREFIX = "fastcourt_user_settings_v1:";
const ROSTER_PREFIX = "fastcourt_playerRoster_v1:";
const BACKUP_HISTORY_KEY = "fastcourt_backup_history_v1";
const SAFETY_SNAPSHOT_KEY = "fastcourt_safety_snapshot_v1";
const PENDING_INVITE_KEY = "fastcourt_pending_team_invite_v1";

export interface PurgePreview {
  usersRemoved: number;
  usersKept: number;
  orgsRemoved: number;
  orgsKept: number;
  playsRemoved: number;
  playsKept: number;
  playbooksRemoved: number;
  playbooksKept: number;
  practiceSessionsRemoved: number;
  playerRosterKeysRemoved: number;
  scopedSettingsRemoved: number;
}

export interface PurgeResult extends PurgePreview {
  cloudProfilesRemoved: number;
  cloudSettingsRemoved: number;
  cloudError: string | null;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function isAdminUser(user: AdminUserRecord | SessionUser) {
  return user.role === ROLES.admin;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function playShouldBeRemoved(
  play: StoredPlay,
  admin: AdminUserRecord,
  otherUsers: AdminUserRecord[],
): boolean {
  return otherUsers.some((user) => playMatchesCoach(play, user));
}

export function partitionPlaysForPurge(
  plays: StoredPlay[],
  admin: AdminUserRecord,
  otherUsers: AdminUserRecord[],
) {
  const kept: StoredPlay[] = [];
  const removed: StoredPlay[] = [];
  for (const play of plays) {
    if (playShouldBeRemoved(play, admin, otherUsers)) removed.push(play);
    else kept.push(play);
  }
  return { kept, removed };
}

export function partitionOrganizationsForPurge(
  orgs: TeamOrganization[],
  adminEmail: string,
) {
  const normalized = normalizeEmail(adminEmail);
  const kept = orgs.filter(
    (org) => normalizeEmail(org.teamAdminEmail) === normalized,
  );
  const removed = orgs.filter(
    (org) => normalizeEmail(org.teamAdminEmail) !== normalized,
  );
  return { kept, removed };
}

function filterPlaybooks(
  playbooks: PlaybookSection[],
  keptPlayIds: Set<string>,
) {
  const kept: PlaybookSection[] = [];
  const removed: PlaybookSection[] = [];
  for (const section of playbooks) {
    const playRefs = section.playRefs.filter((id) => keptPlayIds.has(id));
    if (!playRefs.length) {
      removed.push(section);
      continue;
    }
    kept.push({ ...section, playRefs });
  }
  return { kept, removed };
}

async function loadPracticeSessionCount() {
  const { getPracticeData } = await import("@/lib/library/meta");
  const data = await getPracticeData();
  return data.sessions?.length ?? 0;
}

export async function previewPurgeApplicationData(
  admin: SessionUser,
  users: AdminUserRecord[],
): Promise<PurgePreview> {
  if (!isAdminUser(admin)) {
    throw new Error("Only the master administrator can preview data purge.");
  }

  const adminRecord =
    users.find((u) => u.id === admin.id) ??
    users.find((u) => normalizeEmail(u.email) === normalizeEmail(admin.email)) ?? {
      id: admin.id,
      email: admin.email,
      displayName: admin.displayName,
      role: admin.role,
      accessType: admin.accessType,
      expiresAt: admin.expiresAt,
      createdAt: new Date().toISOString(),
      signupComplete: true,
    };

  const otherUsers = users.filter((u) => !isAdminUser(u));
  const keptUsers = users.filter((u) => isAdminUser(u));

  const [plays, playbooks, orgs, practiceCount] = await Promise.all([
    listStoredPlays(),
    getPlaybookSections(),
    Promise.resolve(loadTeamOrganizations()),
    loadPracticeSessionCount(),
  ]);

  const { kept: keptPlays, removed: removedPlays } = partitionPlaysForPurge(
    plays,
    adminRecord,
    otherUsers,
  );
  const keptPlayIds = new Set(keptPlays.map((p) => p.id));
  const { kept: keptPlaybooks, removed: removedPlaybooks } = filterPlaybooks(
    playbooks,
    keptPlayIds,
  );
  const { kept: keptOrgs, removed: removedOrgs } = partitionOrganizationsForPurge(
    orgs,
    admin.email,
  );

  let scopedSettingsRemoved = 0;
  let playerRosterKeysRemoved = 0;
  if (isBrowser()) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith(USER_SETTINGS_PREFIX) && !key.endsWith(`:${admin.id}`)) {
        scopedSettingsRemoved++;
      }
      if (key.startsWith(ROSTER_PREFIX)) {
        const suffix = key.slice(ROSTER_PREFIX.length);
        if (suffix && suffix !== normalizeEmail(admin.email)) {
          playerRosterKeysRemoved++;
        }
      }
    }
  }

  return {
    usersRemoved: otherUsers.length,
    usersKept: keptUsers.length,
    orgsRemoved: removedOrgs.length,
    orgsKept: keptOrgs.length,
    playsRemoved: removedPlays.length,
    playsKept: keptPlays.length,
    playbooksRemoved: removedPlaybooks.length,
    playbooksKept: keptPlaybooks.length,
    practiceSessionsRemoved: practiceCount,
    playerRosterKeysRemoved,
    scopedSettingsRemoved,
  };
}

function clearNonAdminLocalKeys(admin: SessionUser) {
  if (!isBrowser()) return;

  const adminEmail = normalizeEmail(admin.email);
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith(USER_SETTINGS_PREFIX) && !key.endsWith(`:${admin.id}`)) {
      keysToRemove.push(key);
    }
    if (key.startsWith(ROSTER_PREFIX)) {
      const suffix = key.slice(ROSTER_PREFIX.length);
      if (suffix && suffix !== adminEmail) keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(BACKUP_HISTORY_KEY);
  localStorage.removeItem(SAFETY_SNAPSHOT_KEY);
  localStorage.removeItem(PENDING_INVITE_KEY);
}

export async function purgeApplicationDataExceptAdmin(
  admin: SessionUser,
  users: AdminUserRecord[],
): Promise<PurgeResult> {
  if (!isAdminUser(admin)) {
    throw new Error("Only the master administrator can purge application data.");
  }

  const preview = await previewPurgeApplicationData(admin, users);

  const adminRecord =
    users.find((u) => u.id === admin.id) ??
    users.find((u) => normalizeEmail(u.email) === normalizeEmail(admin.email));
  if (!adminRecord) {
    throw new Error("Administrator profile not found in the local registry.");
  }

  const otherUsers = users.filter((u) => !isAdminUser(u));
  const keptUsers = users.filter((u) => isAdminUser(u));

  const [plays, playbooks, orgs] = await Promise.all([
    listStoredPlays(),
    getPlaybookSections(),
    Promise.resolve(loadTeamOrganizations()),
  ]);

  const { kept: keptPlays } = partitionPlaysForPurge(plays, adminRecord, otherUsers);
  const keptPlayIds = new Set(keptPlays.map((p) => p.id));
  const { kept: keptPlaybooks } = filterPlaybooks(playbooks, keptPlayIds);
  const { kept: keptOrgs } = partitionOrganizationsForPurge(orgs, admin.email);

  await replaceAllStoredPlays(keptPlays);
  await setPlaybookSections(keptPlaybooks);
  await setPracticeData({ sessions: [] });
  await setCustomSeasons(["Default"]);
  await setCustomTeams(["No Team"]);
  await setCustomSeries([]);
  await setCustomFieldTags([]);

  saveTeamOrganizations(keptOrgs);
  saveAdminUsers(keptUsers);
  clearNonAdminLocalKeys(admin);
  resetLibraryReviewRecords();

  let cloudProfilesRemoved = 0;
  let cloudSettingsRemoved = 0;
  let cloudError: string | null = null;

  if (isCloudEnabled()) {
    const supabase = createClient();
    if (supabase) {
      const cloudResult = await purgeCloudUserDataExceptAdmin(supabase, admin.id);
      if (!cloudResult.ok) {
        cloudError = cloudResult.error;
      } else {
        cloudProfilesRemoved = cloudResult.profilesRemoved;
        cloudSettingsRemoved = cloudResult.settingsRemoved;
      }
    }
  }

  return {
    ...preview,
    cloudProfilesRemoved,
    cloudSettingsRemoved,
    cloudError,
  };
}
