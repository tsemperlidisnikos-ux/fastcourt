import LZString from "lz-string";
import type { PlaybookSection, PracticeSession, GamePlan, GamePlanCategoryId, PlayerHomeworkAssignment } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";
import { appCopyLink, appNotice } from "@/stores/dialog-store";

const HASH_PREFIX = "s=";
const REMOTE_PREFIX = "r:";
const BROWSER_SAFE_URL_LENGTH = 8000;
const MAX_URL_LENGTH = 120000;
const SHARE_MAX_FRAMES = 40;
const SHARE_MAX_VIDEO_URL = 512;

export const DEFAULT_SHARE_STAGE = { width: 900, height: 519 };

export type SharePracticeItem = {
  durationMin: number;
  notes?: string;
  videoUrl?: string;
  cueLabel?: string;
  play?: ShareMinifiedPlay;
};

export type ShareGamePlanEntry = {
  categoryId: GamePlanCategoryId;
  categoryLabel?: string;
  callName?: string;
  notes?: string;
  play?: ShareMinifiedPlay;
};

export type SharePayload =
  | {
      v: number;
      type: "play";
      play: ShareMinifiedPlay;
      stageRef: { width: number; height: number };
      playerView?: boolean;
    }
  | {
      v: number;
      type: "playbook";
      section: { name: string; team: string; subtitle?: string };
      plays: ShareMinifiedPlay[];
      stageRef: { width: number; height: number };
      playerView?: boolean;
    }
  | {
      v: number;
      type: "practice";
      session: {
        title: string;
        date: string;
        team: string;
        notes?: string;
      };
      items: SharePracticeItem[];
      stageRef: { width: number; height: number };
      practiceView?: boolean;
    }
  | {
      v: number;
      type: "gameplan";
      plan: {
        title: string;
        opponent: string;
        gameDate: string;
        team: string;
        location?: string;
        homeAway?: string;
        scoutingNotes?: string;
        postGameNotes?: string;
      };
      entries: ShareGamePlanEntry[];
      stageRef: { width: number; height: number };
      gamePlanView?: boolean;
    }
  | {
      v: number;
      type: "homework";
      homeworkId?: string;
      player?: {
        id: string;
        name: string;
        token: string;
      };
      assignment: {
        title: string;
        opponent: string;
        gameDate: string;
        dueDate: string;
        team: string;
        notes?: string;
      };
      entries: ShareGamePlanEntry[];
      stageRef: { width: number; height: number };
      homeworkView?: boolean;
    }
  | {
      v: number;
      type: "homework_ack";
      homeworkId: string;
      playerId: string;
      token: string;
      ackType: "open" | "studied";
      playerName?: string;
    }
  | {
      v: number;
      type: "gameday";
      planId: string;
      plan: {
        title: string;
        opponent: string;
        gameDate: string;
        team: string;
        location?: string;
        homeAway?: string;
        scoutingNotes?: string;
      };
      entries: ShareGamePlanEntry[];
      activeCategoryId?: GamePlanCategoryId;
      stageRef: { width: number; height: number };
      gameDayView?: boolean;
    };

export type ShareMinifiedPlay = Omit<
  StoredPlay,
  "id" | "favorite" | "fastDrawLazy" | "lazyPending" | "source" | "createdAt" | "updatedAt"
>;

function roundNum(n: number) {
  if (!Number.isFinite(n)) return n;
  return Math.round(n * 1000) / 1000;
}

function minifyValue(val: unknown): unknown {
  if (Array.isArray(val)) {
    const arr = val
      .map(minifyValue)
      .filter((item) => item !== undefined && item !== null);
    return arr.length ? arr : undefined;
  }
  if (val && typeof val === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      const next = minifyValue(v);
      if (next !== undefined) out[k] = next;
    }
    return Object.keys(out).length ? out : undefined;
  }
  if (typeof val === "number") return roundNum(val);
  if (typeof val === "string" && val === "") return undefined;
  return val;
}

function truncateShareNotes(notes: string, maxLen = 1200) {
  const plain = String(notes || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= maxLen) return notes || "";
  return `${plain.slice(0, maxLen)}…`;
}

function sanitizeShareVideoUrl(raw?: string) {
  const s = String(raw || "").trim();
  if (!s || s.length > SHARE_MAX_VIDEO_URL) return "";
  try {
    const href = /^https?:\/\//i.test(s) ? s : `https://${s}`;
    const u = new URL(href);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.href.length <= SHARE_MAX_VIDEO_URL ? u.href : "";
  } catch {
    return "";
  }
}

function minifyStoredPlay(play: StoredPlay): ShareMinifiedPlay {
  const videoUrl = sanitizeShareVideoUrl(play.videoUrl);
  const minified = {
    title: play.title,
    courtType: play.courtType,
    type: play.type,
    season: play.season,
    team: play.team,
    series: play.series,
    tags: play.tags?.slice(0, 6) ?? [],
    playNotes: truncateShareNotes(play.playNotes || ""),
    videoUrl: videoUrl || undefined,
    frames: play.frames.slice(0, SHARE_MAX_FRAMES).map((frame) =>
      minifyValue({
        id: frame.id,
        name: frame.name,
        notes: truncateShareNotes(frame.notes || ""),
        objects: frame.objects,
        actions: frame.actions,
        actionSequence: frame.actionSequence,
      }),
    ),
    animSpeed: play.animSpeed,
    animPauseMs: play.animPauseMs,
  } as ShareMinifiedPlay;
  return minified;
}

function compressJson(json: string) {
  return LZString.compressToEncodedURIComponent(json);
}

function decompressJson(data: string) {
  const out = LZString.decompressFromEncodedURIComponent(data);
  if (out) return out;
  try {
    const b64 = data.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
    return decodeURIComponent(escape(atob(b64 + pad)));
  } catch {
    return null;
  }
}

export function buildHomeworkAckUrl(
  homeworkId: string,
  playerId: string,
  token: string,
  ackType: "open" | "studied",
  playerName?: string,
) {
  return buildUrlFromPayload(
    encodeHomeworkAckPayload(homeworkId, playerId, token, ackType, playerName),
  );
}

function buildUrlFromPayload(payload: SharePayload) {
  const json = JSON.stringify(payload);
  const compressed = compressJson(json);
  const base = window.location.href.split("#")[0].split("?")[0];
  return `${base}#${HASH_PREFIX}${compressed}`;
}

export function encodePlayPayload(
  play: StoredPlay,
  stageRef = DEFAULT_SHARE_STAGE,
  options: { playerView?: boolean } = {},
): SharePayload {
  return {
    v: 6,
    type: "play",
    play: minifyStoredPlay(play),
    stageRef,
    playerView: options.playerView || undefined,
  };
}

export function encodePlaybookPayload(
  section: Pick<PlaybookSection, "name" | "team" | "subtitle">,
  plays: StoredPlay[],
  stageRef = DEFAULT_SHARE_STAGE,
  options: { playerView?: boolean } = {},
): SharePayload {
  return {
    v: 6,
    type: "playbook",
    section: {
      name: section.name || "Playbook",
      team: section.team || "",
      subtitle: section.subtitle || "",
    },
    plays: plays.map(minifyStoredPlay),
    stageRef,
    playerView: options.playerView || undefined,
  };
}

export interface SmartShareResult {
  ok: boolean;
  url?: string;
  mode?: string;
  length?: number;
  warning?: string;
  error?: string;
}

function mergeWarnings(...groups: Array<string | undefined>) {
  const out: string[] = [];
  for (const group of groups) {
    if (!group) continue;
    for (const part of group.split(" · ")) {
      if (part && !out.includes(part)) out.push(part);
    }
  }
  return out.length ? out.join(" · ") : undefined;
}

export function buildSmartPlayUrl(
  play: StoredPlay,
  options: { playerView?: boolean } = {},
): SmartShareResult {
  const payload = encodePlayPayload(play, DEFAULT_SHARE_STAGE, options);
  const inlineUrl = buildUrlFromPayload(payload);
  const inlineLen = inlineUrl.length;
  if (inlineLen <= BROWSER_SAFE_URL_LENGTH) {
    return { ok: true, url: inlineUrl, mode: "compact", length: inlineLen };
  }
  if (inlineLen <= MAX_URL_LENGTH) {
    return {
      ok: true,
      url: inlineUrl,
      mode: "compact-long",
      length: inlineLen,
      warning: mergeWarnings(
        "Link is long — paste directly in browser.",
      ),
    };
  }
  return { ok: false, error: "too_long", length: inlineLen };
}

export function buildSmartPlaybookUrl(
  section: Pick<PlaybookSection, "name" | "team" | "subtitle">,
  plays: StoredPlay[],
  options: { playerView?: boolean } = {},
): SmartShareResult {
  const payload = encodePlaybookPayload(section, plays, DEFAULT_SHARE_STAGE, options);
  const inlineUrl = buildUrlFromPayload(payload);
  const inlineLen = inlineUrl.length;
  if (inlineLen <= BROWSER_SAFE_URL_LENGTH) {
    return { ok: true, url: inlineUrl, mode: "compact", length: inlineLen };
  }
  if (inlineLen <= MAX_URL_LENGTH) {
    return {
      ok: true,
      url: inlineUrl,
      mode: "compact-long",
      length: inlineLen,
      warning: mergeWarnings(
        "Link is long — paste directly in browser.",
      ),
    };
  }
  return { ok: false, error: "too_long", length: inlineLen };
}

export function encodePracticePayload(
  session: Pick<PracticeSession, "title" | "date" | "team" | "notes">,
  items: Array<{
    durationMin: number;
    notes?: string;
    videoUrl?: string;
    cueLabel?: string;
    play?: StoredPlay;
  }>,
  stageRef = DEFAULT_SHARE_STAGE,
): SharePayload {
  const sanitizedItems: SharePracticeItem[] = items.map((entry) => {
    const out: SharePracticeItem = {
      durationMin: Math.max(1, Number(entry.durationMin) || 10),
      notes: truncateShareNotes(entry.notes || "", 400),
    };
    const videoUrl = sanitizeShareVideoUrl(entry.videoUrl || "");
    if (videoUrl) out.videoUrl = videoUrl;
    if (entry.cueLabel?.trim()) out.cueLabel = entry.cueLabel.trim().slice(0, 120);
    if (entry.play) {
      out.play = minifyStoredPlay(entry.play);
    }
    return out;
  });
  return {
    v: 6,
    type: "practice",
    session: {
      title: String(session.title || "Practice").slice(0, 120),
      date: String(session.date || "").slice(0, 16),
      team: String(session.team || "").slice(0, 80),
      notes: truncateShareNotes(session.notes || "", 800),
    },
    items: sanitizedItems,
    stageRef,
    practiceView: true,
  };
}

export function buildSmartPracticeUrl(
  session: Pick<PracticeSession, "title" | "date" | "team" | "notes" | "items">,
  items: Array<{
    durationMin: number;
    notes?: string;
    videoUrl?: string;
    cueLabel?: string;
    play?: StoredPlay;
  }>,
  stageRef = DEFAULT_SHARE_STAGE,
): SmartShareResult {
  const payload = encodePracticePayload(session, items, stageRef);
  const inlineUrl = buildUrlFromPayload(payload);
  const inlineLen = inlineUrl.length;
  if (inlineLen <= BROWSER_SAFE_URL_LENGTH) {
    return { ok: true, url: inlineUrl, mode: "compact", length: inlineLen };
  }
  if (inlineLen <= MAX_URL_LENGTH) {
    return {
      ok: true,
      url: inlineUrl,
      mode: "compact-long",
      length: inlineLen,
      warning: mergeWarnings("Link is long — paste directly in browser."),
    };
  }
  return { ok: false, error: "too_long", length: inlineLen };
}

export function encodeGamePlanPayload(
  plan: GamePlan,
  plays: StoredPlay[],
  stageRef = DEFAULT_SHARE_STAGE,
): SharePayload {
  const playById = new Map(plays.map((play) => [play.id, play]));
  const entries: ShareGamePlanEntry[] = [];
  for (const entry of plan.entries) {
    if (!entry.playId) continue;
    const play = playById.get(entry.playId);
    if (!play) continue;
    const row: ShareGamePlanEntry = {
      categoryId: entry.categoryId,
      categoryLabel: entry.label,
      notes: truncateShareNotes(entry.notes || "", 400) || undefined,
    };
    if (entry.callName?.trim()) row.callName = entry.callName.trim().slice(0, 120);
    row.play = minifyStoredPlay(play);
    entries.push(row);
  }

  return {
    v: 6,
    type: "gameplan",
    plan: {
      title: String(plan.title || `vs ${plan.opponent}`).slice(0, 120),
      opponent: String(plan.opponent || "").slice(0, 120),
      gameDate: String(plan.gameDate || "").slice(0, 16),
      team: String(plan.team || "").slice(0, 80),
      location: plan.location?.trim().slice(0, 120) || undefined,
      homeAway: plan.homeAway || undefined,
      scoutingNotes: truncateShareNotes(plan.scoutingNotes || "", 800) || undefined,
      postGameNotes: truncateShareNotes(plan.postGameNotes || "", 800) || undefined,
    },
    entries,
    stageRef,
    gamePlanView: true,
  };
}

export function buildSmartGamePlanUrl(
  plan: GamePlan,
  plays: StoredPlay[],
  stageRef = DEFAULT_SHARE_STAGE,
): SmartShareResult {
  const payload = encodeGamePlanPayload(plan, plays, stageRef);
  if (payload.type !== "gameplan" || !payload.entries.length) {
    return { ok: false, error: "empty" };
  }
  const inlineUrl = buildUrlFromPayload(payload);
  const inlineLen = inlineUrl.length;
  if (inlineLen <= BROWSER_SAFE_URL_LENGTH) {
    return { ok: true, url: inlineUrl, mode: "compact", length: inlineLen };
  }
  if (inlineLen <= MAX_URL_LENGTH) {
    return {
      ok: true,
      url: inlineUrl,
      mode: "compact-long",
      length: inlineLen,
      warning: mergeWarnings("Link is long — paste directly in browser."),
    };
  }
  return { ok: false, error: "too_long", length: inlineLen };
}

function buildHomeworkShareEntries(
  plan: GamePlan,
  playIds: string[],
  plays: StoredPlay[],
): ShareGamePlanEntry[] {
  const wanted = new Set(playIds);
  const playById = new Map(plays.map((play) => [play.id, play]));
  const entries: ShareGamePlanEntry[] = [];

  for (const entry of plan.entries) {
    if (!entry.playId || !wanted.has(entry.playId)) continue;
    const play = playById.get(entry.playId);
    if (!play) continue;
    const row: ShareGamePlanEntry = {
      categoryId: entry.categoryId,
      categoryLabel: entry.label,
      notes: truncateShareNotes(entry.notes || "", 400) || undefined,
      play: minifyStoredPlay(play),
    };
    if (entry.callName?.trim()) row.callName = entry.callName.trim().slice(0, 120);
    entries.push(row);
    wanted.delete(entry.playId);
  }

  for (const playId of playIds) {
    if (!wanted.has(playId)) continue;
    const play = playById.get(playId);
    if (!play) continue;
    entries.push({
      categoryId: "custom" as GamePlanCategoryId,
      callName: play.title?.slice(0, 120),
      play: minifyStoredPlay(play),
    });
  }

  return entries;
}

export function encodeHomeworkPayload(
  assignment: PlayerHomeworkAssignment,
  plan: GamePlan,
  plays: StoredPlay[],
  stageRef = DEFAULT_SHARE_STAGE,
  options: {
    playerId?: string;
    playerName?: string;
    playerToken?: string;
  } = {},
): SharePayload {
  const player =
    options.playerId && options.playerToken
      ? {
          id: options.playerId,
          name: options.playerName?.trim() || "Player",
          token: options.playerToken,
        }
      : undefined;

  return {
    v: 6,
    type: "homework",
    homeworkId: assignment.id,
    player,
    assignment: {
      title: String(assignment.title || "Homework").slice(0, 120),
      opponent: String(assignment.opponent || "").slice(0, 120),
      gameDate: String(assignment.gameDate || "").slice(0, 16),
      dueDate: String(assignment.dueDate || "").slice(0, 16),
      team: String(assignment.team || "").slice(0, 80),
      notes: truncateShareNotes(assignment.notes || "", 800) || undefined,
    },
    entries: buildHomeworkShareEntries(plan, assignment.playIds, plays),
    stageRef,
    homeworkView: true,
  };
}

export function encodeHomeworkAckPayload(
  homeworkId: string,
  playerId: string,
  token: string,
  ackType: "open" | "studied",
  playerName?: string,
): SharePayload {
  return {
    v: 6,
    type: "homework_ack",
    homeworkId,
    playerId,
    token,
    ackType,
    playerName: playerName?.trim().slice(0, 80) || undefined,
  };
}

export function buildSmartHomeworkUrl(
  assignment: PlayerHomeworkAssignment,
  plan: GamePlan,
  plays: StoredPlay[],
  stageRef = DEFAULT_SHARE_STAGE,
  options: {
    playerId?: string;
    playerName?: string;
    playerToken?: string;
  } = {},
): SmartShareResult {
  const payload = encodeHomeworkPayload(assignment, plan, plays, stageRef, options);
  if (payload.type !== "homework" || !payload.entries.length) {
    return { ok: false, error: "empty" };
  }
  const inlineUrl = buildUrlFromPayload(payload);
  const inlineLen = inlineUrl.length;
  if (inlineLen <= BROWSER_SAFE_URL_LENGTH) {
    return { ok: true, url: inlineUrl, mode: "compact", length: inlineLen };
  }
  if (inlineLen <= MAX_URL_LENGTH) {
    return {
      ok: true,
      url: inlineUrl,
      mode: "compact-long",
      length: inlineLen,
      warning: mergeWarnings("Link is long — paste directly in browser."),
    };
  }
  return { ok: false, error: "too_long", length: inlineLen };
}

function buildGameDayShareEntries(
  plan: GamePlan,
  plays: StoredPlay[],
): ShareGamePlanEntry[] {
  const playById = new Map(plays.map((play) => [play.id, play]));
  const entries: ShareGamePlanEntry[] = [];
  for (const entry of plan.entries) {
    if (!entry.playId) continue;
    const play = playById.get(entry.playId);
    if (!play) continue;
    const row: ShareGamePlanEntry = {
      categoryId: entry.categoryId,
      categoryLabel: entry.label,
      notes: truncateShareNotes(entry.notes || "", 400) || undefined,
    };
    if (entry.callName?.trim()) row.callName = entry.callName.trim().slice(0, 120);
    row.play = minifyStoredPlay(play);
    entries.push(row);
  }
  return entries;
}

export function encodeGameDayPayload(
  plan: GamePlan,
  plays: StoredPlay[],
  stageRef = DEFAULT_SHARE_STAGE,
  activeCategoryId?: GamePlanCategoryId,
): SharePayload {
  return {
    v: 6,
    type: "gameday",
    planId: plan.id,
    plan: {
      title: String(plan.title || `vs ${plan.opponent}`).slice(0, 120),
      opponent: String(plan.opponent || "").slice(0, 120),
      gameDate: String(plan.gameDate || "").slice(0, 16),
      team: String(plan.team || "").slice(0, 80),
      location: plan.location?.trim().slice(0, 120) || undefined,
      homeAway: plan.homeAway || undefined,
      scoutingNotes: truncateShareNotes(plan.scoutingNotes || "", 800) || undefined,
    },
    entries: buildGameDayShareEntries(plan, plays),
    activeCategoryId,
    stageRef,
    gameDayView: true,
  };
}

export function buildSmartGameDayUrl(
  plan: GamePlan,
  plays: StoredPlay[],
  stageRef = DEFAULT_SHARE_STAGE,
  activeCategoryId?: GamePlanCategoryId,
): SmartShareResult {
  const payload = encodeGameDayPayload(plan, plays, stageRef, activeCategoryId);
  if (payload.type !== "gameday" || !payload.entries.length) {
    return { ok: false, error: "empty" };
  }
  const inlineUrl = buildUrlFromPayload(payload);
  const inlineLen = inlineUrl.length;
  if (inlineLen <= BROWSER_SAFE_URL_LENGTH) {
    return { ok: true, url: inlineUrl, mode: "compact", length: inlineLen };
  }
  if (inlineLen <= MAX_URL_LENGTH) {
    return {
      ok: true,
      url: inlineUrl,
      mode: "compact-long",
      length: inlineLen,
      warning: mergeWarnings("Link is long — paste directly in browser."),
    };
  }
  return { ok: false, error: "too_long", length: inlineLen };
}

function newShareId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function shareMinifiedToStoredPlay(
  play: ShareMinifiedPlay,
  index = 0,
): StoredPlay {
  const now = new Date().toISOString();
  return {
    id: newShareId(`share_play_${index}`),
    title: play.title || "Shared play",
    courtType: play.courtType ?? "half",
    type: play.type ?? "play",
    season: play.season,
    team: play.team,
    series: play.series,
    tags: play.tags ?? [],
    playNotes: play.playNotes,
    videoUrl: play.videoUrl,
    favorite: false,
    createdAt: now,
    updatedAt: now,
    source: "manual",
    animSpeed: play.animSpeed,
    animPauseMs: play.animPauseMs,
    frames: (play.frames ?? []).map((frame, frameIndex) => ({
      id: frame.id || newShareId(`share_frame_${frameIndex}`),
      name: frame.name || `Frame ${frameIndex + 1}`,
      notes: frame.notes,
      objects: frame.objects ?? [],
      actions: frame.actions ?? [],
      actionSequence: frame.actionSequence ?? frame.actions?.map((a) => a.id) ?? [],
    })),
  };
}

export function decodeFromHash(hash: string): SharePayload | null {
  if (!hash) return null;
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw.startsWith(HASH_PREFIX)) return null;
  const data = raw.slice(HASH_PREFIX.length);
  if (data.startsWith(REMOTE_PREFIX)) return null;
  try {
    const json = decompressJson(data);
    if (!json) return null;
    const payload = JSON.parse(json) as SharePayload;
    if (payload.type === "play" && payload.play) return payload;
    if (payload.type === "playbook" && payload.plays?.length) return payload;
    if (payload.type === "practice" && payload.session && payload.items?.length) {
      return payload;
    }
    if (payload.type === "gameplan" && payload.plan && payload.entries?.length) {
      return payload;
    }
    if (payload.type === "homework" && payload.assignment && payload.entries?.length) {
      return payload;
    }
    if (payload.type === "homework_ack" && payload.homeworkId && payload.playerId) {
      return payload;
    }
    if (payload.type === "gameday" && payload.plan && payload.entries?.length) {
      return payload;
    }
    return null;
  } catch {
    return null;
  }
}

export async function copyShareResult(result: SmartShareResult, label: string) {
  if (!result.ok || !result.url) {
    appNotice(
      "Share link failed",
      result.error === "too_long"
        ? "This content is too large for a share link. Try exporting JSON instead."
        : result.error === "empty"
          ? "Add at least one play before sharing."
          : "Could not create share link.",
    );
    return false;
  }
  try {
    if (navigator.share) {
      await navigator.share({ title: label, url: result.url });
    } else {
      await navigator.clipboard.writeText(result.url);
      appNotice(
        "Link copied",
        result.warning
          ? `Share link copied to clipboard.\n\n${result.warning}`
          : "Share link copied to clipboard.",
      );
    }
    return true;
  } catch {
    appCopyLink("Copy share link", result.url);
    return true;
  }
}
