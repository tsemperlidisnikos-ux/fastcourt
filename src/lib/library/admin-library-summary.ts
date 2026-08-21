import type { AdminUserRecord } from "@/types/admin-user";
import type { PlaybookSection } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";

export interface AdminLibraryItem {
  id: string;
  name: string;
  type: "play" | "drill";
  playbook: string;
  team: string;
  frames: number;
  coachId?: string;
  coachName?: string;
  coachEmail?: string;
}

export interface AdminLibrarySummary {
  playbooks: number;
  plays: number;
  drills: number;
  totalItems: number;
  totalFrames: number;
  items: AdminLibraryItem[];
  coachCount?: number;
  coachesWithContent?: number;
}

export function playMatchesCoach(play: StoredPlay, user: AdminUserRecord) {
  const email = user.email.trim().toLowerCase();
  if (play.ownerUserId && play.ownerUserId === user.id) return true;
  if (play.ownerEmail && play.ownerEmail.trim().toLowerCase() === email) {
    return true;
  }

  const org = (user.organization || "").trim().toLowerCase();
  const team = (play.team || "").trim().toLowerCase();
  if (!org) return !play.ownerUserId && !play.ownerEmail;
  if (!team) return false;
  return team === org || team.includes(org) || org.includes(team);
}

function playbookForPlay(playId: string, playbooks: PlaybookSection[]) {
  for (const section of playbooks) {
    if (section.playRefs.includes(playId)) return section.name || "Playbook";
  }
  return "Library";
}

export function summarizeCoachLibrary(
  user: AdminUserRecord,
  plays: StoredPlay[],
  playbooks: PlaybookSection[],
): AdminLibrarySummary {
  const items: AdminLibraryItem[] = [];
  let playsCount = 0;
  let drillsCount = 0;
  let totalFrames = 0;
  const playbookSet = new Set<string>();

  for (const play of plays) {
    if (!playMatchesCoach(play, user)) continue;
    const frames = play.frames?.length ?? 0;
    const isDrill = play.type === "drill";
    if (isDrill) drillsCount++;
    else playsCount++;
    totalFrames += frames;
    const playbook = playbookForPlay(play.id, playbooks);
    playbookSet.add(playbook);
    items.push({
      id: play.id,
      name: play.title || "Untitled",
      type: isDrill ? "drill" : "play",
      playbook,
      team: play.team || "No Team",
      frames,
    });
  }

  items.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  return {
    playbooks: playbookSet.size,
    plays: playsCount,
    drills: drillsCount,
    totalItems: playsCount + drillsCount,
    totalFrames,
    items,
  };
}

export function summarizeAllCoachLibraries(
  coaches: AdminUserRecord[],
  plays: StoredPlay[],
  playbooks: PlaybookSection[],
): AdminLibrarySummary {
  const items: AdminLibraryItem[] = [];
  let playsCount = 0;
  let drillsCount = 0;
  let totalFrames = 0;
  let coachesWithContent = 0;
  const playbookSet = new Set<string>();

  for (const coach of coaches) {
    const summary = summarizeCoachLibrary(coach, plays, playbooks);
    if (summary.totalItems) coachesWithContent++;
    playsCount += summary.plays;
    drillsCount += summary.drills;
    totalFrames += summary.totalFrames;
    summary.items.forEach((item) => {
      playbookSet.add(item.playbook);
      items.push({
        ...item,
        coachId: coach.id,
        coachName: coach.displayName || coach.email,
        coachEmail: coach.email,
      });
    });
  }

  items.sort((a, b) => {
    const coachCmp = (a.coachName || "").localeCompare(b.coachName || "", undefined, {
      sensitivity: "base",
    });
    if (coachCmp !== 0) return coachCmp;
    const pbCmp = a.playbook.localeCompare(b.playbook, undefined, { sensitivity: "base" });
    if (pbCmp !== 0) return pbCmp;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return {
    playbooks: playbookSet.size,
    plays: playsCount,
    drills: drillsCount,
    totalItems: playsCount + drillsCount,
    totalFrames,
    coachCount: coaches.length,
    coachesWithContent,
    items,
  };
}

export function formatLibrarySummary(summary: AdminLibrarySummary) {
  if (!summary.totalItems) return "No plays or drills yet.";
  const parts = [];
  if (summary.plays) parts.push(`${summary.plays} play${summary.plays !== 1 ? "s" : ""}`);
  if (summary.drills) parts.push(`${summary.drills} drill${summary.drills !== 1 ? "s" : ""}`);
  parts.push(`${summary.playbooks} playbook${summary.playbooks !== 1 ? "s" : ""}`);
  parts.push(`${summary.totalFrames} frames`);
  return parts.join(" · ");
}
