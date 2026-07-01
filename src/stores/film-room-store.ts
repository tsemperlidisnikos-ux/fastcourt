"use client";

import { create } from "zustand";
import {
  deleteFilmRoomSession,
  getFilmRoomBlob,
  listFilmRoomSessions,
  putFilmRoomBlob,
  putFilmRoomSession,
} from "@/lib/film-room/film-room-idb";
import type {
  FilmRoomSession,
  FilmRoomVideoSource,
  VideoAnnotationStroke,
} from "@/types/film-room";
import { withoutPenStrokes } from "@/lib/film-room/film-room-strokes";

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

interface FilmRoomState {
  sessions: FilmRoomSession[];
  activeSessionId: string | null;
  hydrated: boolean;
  load: () => Promise<void>;
  setActiveSession: (id: string | null) => void;
  createUploadSession: (file: File, title?: string) => Promise<string>;
  createUrlSession: (
    source: FilmRoomVideoSource,
    title: string,
  ) => Promise<string>;
  updateSessionTitle: (id: string, title: string) => Promise<void>;
  setStrokes: (id: string, strokes: VideoAnnotationStroke[]) => void;
  appendStroke: (id: string, stroke: VideoAnnotationStroke) => void;
  clearPenStrokes: (id: string) => void;
  removeSession: (id: string) => Promise<void>;
  resolveUploadObjectUrl: (blobId: string) => Promise<string | null>;
}

export const useFilmRoomStore = create<FilmRoomState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  hydrated: false,

  async load() {
    const sessions = await listFilmRoomSessions();
    set({
      sessions,
      hydrated: true,
      activeSessionId: get().activeSessionId ?? sessions[0]?.id ?? null,
    });
  },

  setActiveSession(id) {
    set({ activeSessionId: id });
  },

  async createUploadSession(file, title) {
    const blobId = newId("film_blob");
    await putFilmRoomBlob(blobId, file, file.name, file.type || undefined);
    const session: FilmRoomSession = {
      id: newId("film"),
      title: title?.trim() || file.name.replace(/\.[^.]+$/, "") || "Untitled clip",
      source: {
        kind: "upload",
        blobId,
        fileName: file.name,
        mimeType: file.type || undefined,
      },
      strokes: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await putFilmRoomSession(session);
    set((s) => ({
      sessions: [session, ...s.sessions],
      activeSessionId: session.id,
    }));
    return session.id;
  },

  async createUrlSession(source, title) {
    const session: FilmRoomSession = {
      id: newId("film"),
      title: title.trim() || "Untitled clip",
      source,
      strokes: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await putFilmRoomSession(session);
    set((s) => ({
      sessions: [session, ...s.sessions],
      activeSessionId: session.id,
    }));
    return session.id;
  },

  async updateSessionTitle(id, title) {
    const existing = get().sessions.find((s) => s.id === id);
    if (!existing) return;
    const next = { ...existing, title: title.trim(), updatedAt: Date.now() };
    await putFilmRoomSession(next);
    set((s) => ({
      sessions: s.sessions.map((row) => (row.id === id ? next : row)),
    }));
  },

  setStrokes(id, strokes) {
    const existing = get().sessions.find((s) => s.id === id);
    if (!existing) return;
    const next = { ...existing, strokes, updatedAt: Date.now() };
    set((s) => ({
      sessions: s.sessions.map((row) => (row.id === id ? next : row)),
    }));
    void putFilmRoomSession(next).catch(() => {
      /* UI already updated */
    });
  },

  appendStroke(id, stroke) {
    const existing = get().sessions.find((s) => s.id === id);
    if (!existing) return;
    const strokes = [...existing.strokes, stroke];
    const next = { ...existing, strokes, updatedAt: Date.now() };
    set((s) => ({
      sessions: s.sessions.map((row) => (row.id === id ? next : row)),
    }));
    void putFilmRoomSession(next).catch(() => {
      /* UI already updated */
    });
  },

  clearPenStrokes(id) {
    const existing = get().sessions.find((s) => s.id === id);
    if (!existing) return;
    const strokes = withoutPenStrokes(existing.strokes);
    if (strokes.length === existing.strokes.length) return;
    const next = { ...existing, strokes, updatedAt: Date.now() };
    set((s) => ({
      sessions: s.sessions.map((row) => (row.id === id ? next : row)),
    }));
    void putFilmRoomSession(next).catch(() => {
      /* UI already updated */
    });
  },

  async removeSession(id) {
    await deleteFilmRoomSession(id);
    set((s) => {
      const sessions = s.sessions.filter((row) => row.id !== id);
      const activeSessionId =
        s.activeSessionId === id ? (sessions[0]?.id ?? null) : s.activeSessionId;
      return { sessions, activeSessionId };
    });
  },

  async resolveUploadObjectUrl(blobId) {
    const blob = await getFilmRoomBlob(blobId);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  },
}));
