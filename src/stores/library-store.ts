"use client";

import { create } from "zustand";
import {
  blankStoredPlay,
  storedPlayToLibraryItem,
} from "@/lib/library/convert";
import {
  deleteStoredPlay,
  getMetaFlag,
  getStoredPlay,
  listStoredPlays,
  putStoredPlay,
  setMetaFlag,
} from "@/lib/library/idb";
import { MOCK_LIBRARY } from "@/lib/library/mock-data";
import type { LibraryItem, PlayDetailsValues, StoredPlay } from "@/types/library";

const SEED_META_KEY = "seeded_mock_v1";

interface LibraryState {
  items: LibraryItem[];
  loading: boolean;
  error: string | null;
  hydrated: boolean;
  refresh: () => Promise<void>;
  createPlay: (title?: string) => Promise<StoredPlay>;
  createPlayFromDetails: (details: PlayDetailsValues) => Promise<StoredPlay>;
  toggleFavorite: (id: string) => Promise<void>;
  duplicatePlay: (id: string) => Promise<StoredPlay | undefined>;
  removePlay: (id: string) => Promise<void>;
  getPlayDocument: (id: string) => Promise<StoredPlay | undefined>;
  savePlayDocument: (play: StoredPlay) => Promise<void>;
}

async function seedMockIfEmpty() {
  const seeded = await getMetaFlag(SEED_META_KEY);
  if (seeded) return;

  const existing = await listStoredPlays();
  if (existing.length > 0) {
    await setMetaFlag(SEED_META_KEY, true);
    return;
  }

  const now = new Date().toISOString();
  const seeds: StoredPlay[] = MOCK_LIBRARY.map((item) => ({
    id: item.id,
    title: item.title,
    courtType: "half",
    frames: [
      {
        id: `frame-${item.id}`,
        name: "Frame 1",
        objects: [],
        actions: [],
        actionSequence: [],
      },
    ],
    type: item.type,
    season: "2025-26",
    team: item.tags[0] ?? "No Team",
    series: item.tags[1] ?? "",
    tags: item.tags,
    favorite: item.favorite,
    createdAt: now,
    updatedAt: item.updatedAt,
    source: "manual",
  }));

  for (const play of seeds) {
    await putStoredPlay(play);
  }
  await setMetaFlag(SEED_META_KEY, true);
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  items: [],
  loading: true,
  error: null,
  hydrated: false,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      await seedMockIfEmpty();
      const plays = await listStoredPlays();
      set({
        items: plays.map(storedPlayToLibraryItem),
        loading: false,
        hydrated: true,
      });
      const { useOrganizerStore } = await import("@/stores/organizer-store");
      useOrganizerStore.setState({ plays });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Library load failed.",
        hydrated: true,
      });
    }
  },

  createPlay: async (title = "New play") => {
    const play = blankStoredPlay(title);
    await putStoredPlay(play);
    await get().refresh();
    return play;
  },

  createPlayFromDetails: async (details) => {
    const now = new Date().toISOString();
    const base = blankStoredPlay(details.title);
    const play: StoredPlay = {
      ...base,
      title: details.title,
      courtType: details.courtType,
      type: details.type,
      season: details.season,
      team: details.team,
      series: details.series,
      tags: details.tags,
      playNotes: details.playNotes || undefined,
      videoUrl: details.videoUrl || undefined,
      createdAt: now,
      updatedAt: now,
    };
    await putStoredPlay(play);
    await get().refresh();
    return play;
  },

  toggleFavorite: async (id) => {
    const play = await getStoredPlay(id);
    if (!play) return;
    const updated = {
      ...play,
      favorite: !play.favorite,
      updatedAt: new Date().toISOString(),
    };
    await putStoredPlay(updated);
    await get().refresh();
  },

  duplicatePlay: async (id) => {
    const play = await getStoredPlay(id);
    if (!play) return undefined;
    const now = new Date().toISOString();
    const copy: StoredPlay = {
      ...(JSON.parse(JSON.stringify(play)) as StoredPlay),
      id: `play_${crypto.randomUUID()}`,
      title: play.title.trim() ? `${play.title} copy` : "Copy",
      favorite: false,
      createdAt: now,
      updatedAt: now,
    };
    await putStoredPlay(copy);
    await get().refresh();
    return copy;
  },

  removePlay: async (id) => {
    await deleteStoredPlay(id);
    await get().refresh();
  },

  getPlayDocument: async (id) => {
    const play = await getStoredPlay(id);
    if (!play) return undefined;
    if (play.lazyPending && play.fastDrawLazy) {
      const { decodeLazyPlay } = await import("@/lib/library/fdb-lazy");
      const decoded = await decodeLazyPlay(play);
      if (decoded) {
        await putStoredPlay(decoded);
        await get().refresh();
        return decoded;
      }
    }
    return play;
  },

  savePlayDocument: async (play) => {
    const updated = { ...play, updatedAt: new Date().toISOString() };
    await putStoredPlay(updated);
    await get().refresh();
  },
}));
