"use client";

import { create } from "zustand";
import {
  deleteFilmRoomSession,
  getFilmRoomBlob,
  listFilmRoomSessions,
  putFilmRoomBlob,
  putFilmRoomSession,
} from "@/lib/film-room/film-room-idb";
import {
  appendFilmAnalysisRecord,
  removeFilmAnalysisRecord as dropAnalysisRecord,
} from "@/lib/film-room/film-analysis-history";
import { findLastFilmEvent } from "@/lib/film-room/film-event-tags";
import type {
  FilmRoomSession,
  FilmRoomVideoSource,
  FilmRoomEvent,
  FilmRoomEventKind,
  FilmRoomAnalysisRecord,
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
  addFilmEvent: (
    id: string,
    kind: FilmRoomEventKind,
    time: number,
    note?: string,
  ) => void;
  updateFilmEvent: (
    id: string,
    eventId: string,
    patch: { kind?: FilmRoomEventKind; time?: number; note?: string },
  ) => void;
  undoLastFilmEvent: (id: string) => void;
  removeFilmEvent: (id: string, eventId: string) => void;
  appendAnalysisRecord: (id: string, record: FilmRoomAnalysisRecord) => void;
  removeAnalysisRecord: (id: string, recordId: string) => void;
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
      events: [],
      analyses: [],
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
      events: [],
      analyses: [],
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

  addFilmEvent(id, kind, time, note) {
    const existing = get().sessions.find((s) => s.id === id);
    if (!existing) return;
    const event: FilmRoomEvent = {
      id: newId("film_evt"),
      kind,
      time: Math.max(0, time),
      note: note?.trim() || undefined,
      createdAt: Date.now(),
    };
    const events = [...(existing.events ?? []), event];
    const next = { ...existing, events, updatedAt: Date.now() };
    set((s) => ({
      sessions: s.sessions.map((row) => (row.id === id ? next : row)),
    }));
    void putFilmRoomSession(next).catch(() => {
      /* UI already updated */
    });
  },

  removeFilmEvent(id, eventId) {
    const existing = get().sessions.find((s) => s.id === id);
    if (!existing) return;
    const events = (existing.events ?? []).filter((row) => row.id !== eventId);
    if (events.length === (existing.events ?? []).length) return;
    const next = { ...existing, events, updatedAt: Date.now() };
    set((s) => ({
      sessions: s.sessions.map((row) => (row.id === id ? next : row)),
    }));
    void putFilmRoomSession(next).catch(() => {
      /* UI already updated */
    });
  },

  updateFilmEvent(id, eventId, patch) {
    const existing = get().sessions.find((s) => s.id === id);
    if (!existing) return;
    const events = (existing.events ?? []).map((row) => {
      if (row.id !== eventId) return row;
      return {
        ...row,
        ...(patch.kind ? { kind: patch.kind } : {}),
        ...(typeof patch.time === "number" && Number.isFinite(patch.time)
          ? { time: Math.max(0, patch.time) }
          : {}),
        ...(patch.note !== undefined
          ? { note: patch.note.trim() || undefined }
          : {}),
      };
    });
    const next = { ...existing, events, updatedAt: Date.now() };
    set((s) => ({
      sessions: s.sessions.map((row) => (row.id === id ? next : row)),
    }));
    void putFilmRoomSession(next).catch(() => {
      /* UI already updated */
    });
  },

  undoLastFilmEvent(id) {
    const existing = get().sessions.find((s) => s.id === id);
    if (!existing) return;
    const last = findLastFilmEvent(existing.events ?? []);
    if (!last) return;
    const events = (existing.events ?? []).filter((row) => row.id !== last.id);
    const next = { ...existing, events, updatedAt: Date.now() };
    set((s) => ({
      sessions: s.sessions.map((row) => (row.id === id ? next : row)),
    }));
    void putFilmRoomSession(next).catch(() => {
      /* UI already updated */
    });
  },

  appendAnalysisRecord(id, record) {
    const existing = get().sessions.find((s) => s.id === id);
    if (!existing) return;
    const next = appendFilmAnalysisRecord(existing, record);
    set((s) => ({
      sessions: s.sessions.map((row) => (row.id === id ? next : row)),
    }));
    void putFilmRoomSession(next).catch(() => {
      /* UI already updated */
    });
  },

  removeAnalysisRecord(id, recordId) {
    const existing = get().sessions.find((s) => s.id === id);
    if (!existing) return;
    const next = dropAnalysisRecord(existing, recordId);
    if (next === existing) return;
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
