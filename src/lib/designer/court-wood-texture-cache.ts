import {
  COURT_WOOD_TEXTURES,
  type CourtWoodTextureId,
  courtWoodTextureUrl,
  normalizeCourtWoodTextureId,
} from "@/lib/designer/court-assets";

const loaded = new Map<CourtWoodTextureId, HTMLImageElement>();
const inflight = new Map<CourtWoodTextureId, Promise<HTMLImageElement>>();
const failed = new Set<CourtWoodTextureId>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      void img.decode().then(() => resolve(img)).catch(() => resolve(img));
    };
    img.onerror = () => reject(new Error(`Court wood texture failed: ${url}`));
    img.src = url;
  });
}

export function subscribeCourtWoodTextureCache(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isCourtWoodTextureFailed(textureId?: string | null): boolean {
  const id = normalizeCourtWoodTextureId(textureId);
  return failed.has(id);
}

export function getLoadedCourtWoodTexture(
  textureId?: string | null,
): HTMLImageElement | null {
  const id = normalizeCourtWoodTextureId(textureId);
  return loaded.get(id) ?? null;
}

export function loadCourtWoodTexture(
  textureId?: string | null,
): Promise<HTMLImageElement> {
  const id = normalizeCourtWoodTextureId(textureId);
  const cached = loaded.get(id);
  if (cached) return Promise.resolve(cached);

  const pending = inflight.get(id);
  if (pending) return pending;

  const promise = loadImage(courtWoodTextureUrl(id))
    .then((img) => {
      loaded.set(id, img);
      failed.delete(id);
      inflight.delete(id);
      notify();
      return img;
    })
    .catch((err) => {
      inflight.delete(id);
      failed.add(id);
      notify();
      throw err;
    });

  inflight.set(id, promise);
  return promise;
}

export function preloadCourtWoodTextures() {
  for (const id of Object.keys(COURT_WOOD_TEXTURES) as CourtWoodTextureId[]) {
    void loadCourtWoodTexture(id).catch(() => {
      /* fallback planks render on failure */
    });
  }
}

if (typeof window !== "undefined") {
  preloadCourtWoodTextures();
}
