import type { CourtType } from "@/types/designer";

/** Oak Veneered MDF — [Architextures](https://architextures.org/textures/1700). */
export const COURT_WOOD_TEXTURE_OAK = {
  id: "oak-veneered-mdf",
  path: "/assets/courts/oak-veneered-mdf.jpg?v=3",
  sourceUrl: "https://architextures.org/textures/1700",
  rotation: 0,
  naturalWidth: 800,
  naturalHeight: 744,
} as const;

/** Accoya | Planed All Round 66 — [Architextures](https://architextures.org/textures/5775). */
export const COURT_WOOD_TEXTURE_ACCOYA_66 = {
  id: "accoya-planed-66",
  path: "/assets/courts/accoya-planed-all-round-66.jpg?v=3",
  sourceUrl: "https://architextures.org/textures/5775",
  rotation: 0,
  naturalWidth: 800,
  naturalHeight: 744,
} as const;

export const COURT_WOOD_TEXTURES = {
  [COURT_WOOD_TEXTURE_OAK.id]: COURT_WOOD_TEXTURE_OAK,
  [COURT_WOOD_TEXTURE_ACCOYA_66.id]: COURT_WOOD_TEXTURE_ACCOYA_66,
} as const;

export type CourtWoodTextureId = keyof typeof COURT_WOOD_TEXTURES;

export const DEFAULT_COURT_WOOD_TEXTURE_ID: CourtWoodTextureId =
  COURT_WOOD_TEXTURE_OAK.id;

/** @deprecated Use `resolveCourtWoodTexture`. */
export const COURT_WOOD_TEXTURE_PATH = COURT_WOOD_TEXTURE_OAK.path;

/** @deprecated Use `resolveCourtWoodTexture`. */
export const COURT_WOOD_TEXTURE_SOURCE_URL = COURT_WOOD_TEXTURE_OAK.sourceUrl;

/** @deprecated Use `resolveCourtWoodTexture`. */
export const COURT_WOOD_TEXTURE_ROTATION = COURT_WOOD_TEXTURE_OAK.rotation;

export function normalizeCourtWoodTextureId(
  id?: string | null,
): CourtWoodTextureId {
  if (id && id in COURT_WOOD_TEXTURES) return id as CourtWoodTextureId;
  return DEFAULT_COURT_WOOD_TEXTURE_ID;
}

export function resolveCourtWoodTexture(textureId?: string | null) {
  const id = normalizeCourtWoodTextureId(textureId);
  return COURT_WOOD_TEXTURES[id];
}

export function courtImagePath(courtType: CourtType) {
  return courtType === "full"
    ? "/assets/courts/full_court.png"
    : "/assets/courts/half_court.png";
}

export function courtImageUrl(courtType: CourtType) {
  if (typeof window === "undefined") {
    return courtImagePath(courtType);
  }
  return new URL(courtImagePath(courtType), window.location.origin).href;
}

export function courtWoodTextureUrl(textureId?: string | null) {
  const path = resolveCourtWoodTexture(textureId).path;
  if (typeof window === "undefined") {
    return path;
  }
  return new URL(path, window.location.origin).href;
}
