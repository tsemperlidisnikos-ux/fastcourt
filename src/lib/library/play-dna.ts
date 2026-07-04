import type { ActionType, CourtType, PlayDocument } from "@/types/designer";
import type { StoredPlay } from "@/types/library";

const GRID = 6;

export interface PlayDnaFingerprint {
  courtType: CourtType;
  offenseGrid: number[];
  actionTypes: ActionType[];
  screenCount: number;
  frameCount: number;
}

export interface SimilarPlayMatch {
  play: StoredPlay;
  score: number;
}

function bucket(value: number, cells: number) {
  const clamped = Math.min(0.999, Math.max(0, value));
  return Math.floor(clamped * cells);
}

/** Normalized spatial + action signature for similarity search. */
export function fingerprintPlay(play: PlayDocument): PlayDnaFingerprint | null {
  const frame = play.frames[0];
  if (!frame) return null;

  const offenseGrid = new Array<number>(GRID * GRID).fill(0);
  for (const obj of frame.objects) {
    if (obj.kind !== "offense") continue;
    const cell = bucket(obj.y, GRID) * GRID + bucket(obj.x, GRID);
    offenseGrid[cell] = (offenseGrid[cell] ?? 0) + 1;
  }

  const seq = frame.actionSequence ?? frame.actions.map((a) => a.id);
  const actionTypes: ActionType[] = [];
  let screenCount = 0;
  for (const id of seq) {
    const action = frame.actions.find((row) => row.id === id);
    if (!action || action.timing === "optional") continue;
    actionTypes.push(action.type);
    if (action.type === "screen") screenCount += 1;
  }

  return {
    courtType: play.courtType,
    offenseGrid,
    actionTypes,
    screenCount,
    frameCount: play.frames.length,
  };
}

function gridSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 && normB === 0) return 1;
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function lcsLength(a: ActionType[], b: ActionType[]) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp = new Array<number>(cols).fill(0);
  for (let i = 1; i < rows; i += 1) {
    let prev = 0;
    for (let j = 1; j < cols; j += 1) {
      const tmp = dp[j]!;
      if (a[i - 1] === b[j - 1]) {
        dp[j] = prev + 1;
      } else {
        dp[j] = Math.max(dp[j]!, dp[j - 1]!);
      }
      prev = tmp;
    }
  }
  return dp[cols - 1] ?? 0;
}

function actionSequenceSimilarity(a: ActionType[], b: ActionType[]) {
  if (!a.length && !b.length) return 1;
  if (!a.length || !b.length) return 0;
  const lcs = lcsLength(a, b);
  return (2 * lcs) / (a.length + b.length);
}

/** 0–1 similarity (higher = more alike). */
export function playSimilarity(
  left: PlayDnaFingerprint,
  right: PlayDnaFingerprint,
): number {
  if (left.courtType !== right.courtType) return 0;

  const spatial = gridSimilarity(left.offenseGrid, right.offenseGrid);
  const actions = actionSequenceSimilarity(left.actionTypes, right.actionTypes);
  const screens =
    1 -
    Math.min(1, Math.abs(left.screenCount - right.screenCount) / 3);
  const frames =
    1 -
    Math.min(1, Math.abs(left.frameCount - right.frameCount) / 4);

  return spatial * 0.4 + actions * 0.4 + screens * 0.1 + frames * 0.1;
}

export function findSimilarPlays(
  target: StoredPlay,
  library: StoredPlay[],
  options?: { limit?: number; minScore?: number; excludeId?: string },
): SimilarPlayMatch[] {
  const limit = options?.limit ?? 5;
  const minScore = options?.minScore ?? 0.42;
  const excludeId = options?.excludeId ?? target.id;
  const targetFp = fingerprintPlay(target);
  if (!targetFp) return [];

  const matches: SimilarPlayMatch[] = [];
  for (const play of library) {
    if (play.id === excludeId) continue;
    const fp = fingerprintPlay(play);
    if (!fp) continue;
    const score = playSimilarity(targetFp, fp);
    if (score >= minScore) matches.push({ play, score });
  }

  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function formatSimilarityScore(score: number) {
  return `${Math.round(score * 100)}%`;
}
