"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FdAppFooter, FdAppHeader } from "@/components/library/FdAppHeader";
import { FilmRoomAnnotator } from "@/components/film-room/FilmRoomAnnotator";
import { FilmRoomNewSessionPanel } from "@/components/film-room/FilmRoomNewSessionPanel";
import { filmRoomSourceLabel } from "@/lib/film-room/film-room-source";
import { parseFilmRoomDeepLink } from "@/lib/film-room/film-game-plan-link";
import { useLibraryNavModules } from "@/hooks/useLibraryNavModules";
import { isLibraryNavModuleEnabled } from "@/lib/settings/library-nav-modules";
import { useFilmRoomStore } from "@/stores/film-room-store";
import { useOrganizerStore } from "@/stores/organizer-store";
import { appConfirm } from "@/stores/dialog-store";

export function FilmRoomScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLink = useMemo(
    () => parseFilmRoomDeepLink(searchParams),
    [searchParams],
  );
  const navModules = useLibraryNavModules();
  const hydrated = useFilmRoomStore((s) => s.hydrated);
  const sessions = useFilmRoomStore((s) => s.sessions);
  const activeSessionId = useFilmRoomStore((s) => s.activeSessionId);
  const load = useFilmRoomStore((s) => s.load);
  const setActiveSession = useFilmRoomStore((s) => s.setActiveSession);
  const removeSession = useFilmRoomStore((s) => s.removeSession);
  const metaHydrated = useOrganizerStore((s) => s.hydrated);
  const loadMeta = useOrganizerStore((s) => s.loadMeta);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!metaHydrated) void loadMeta();
  }, [metaHydrated, loadMeta]);

  useEffect(() => {
    if (!isLibraryNavModuleEnabled(navModules, "film-room")) {
      router.replace("/library");
    }
  }, [navModules, router]);

  useEffect(() => {
    if (!hydrated || !deepLink.sessionId) return;
    const exists = sessions.some((session) => session.id === deepLink.sessionId);
    if (exists) setActiveSession(deepLink.sessionId);
  }, [deepLink.sessionId, hydrated, sessions, setActiveSession]);

  const activeSession =
    sessions.find((session) => session.id === activeSessionId) ?? null;

  async function handleDelete(id: string) {
    const session = sessions.find((row) => row.id === id);
    if (!session) return;
    const ok = await appConfirm({
      title: "Delete film session and its annotations?",
      message: "",
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) void removeSession(id);
  }

  return (
    <div
      className="fd-ui screen-root active library-film-room-mode"
      id="screen-organizer"
    >
      <FdAppHeader />
      <div className="org-body">
        <div id="screen-film-room" className="fc-film-room-screen">
          <aside className="fc-film-sidebar" aria-label="Film sessions">
            <div className="fc-film-sidebar-head">
              <h1 className="fc-film-sidebar-title">Film Room</h1>
              <p className="fc-film-sidebar-sub">
                Video breakdown with time-synced whiteboard — like Video Pencil.
              </p>
            </div>

            <FilmRoomNewSessionPanel />

            <div className="fc-film-session-list" aria-label="Saved sessions">
              {!hydrated ? (
                <p className="fc-film-empty">Loading sessions…</p>
              ) : sessions.length === 0 ? (
                <p className="fc-film-empty">
                  No clips yet. Upload a video or paste a YouTube link.
                </p>
              ) : (
                sessions.map((session) => {
                  const active = session.id === activeSessionId;
                  return (
                    <div
                      key={session.id}
                      className={`fc-film-session-row${active ? " is-active" : ""}`}
                    >
                      <button
                        type="button"
                        className="fc-film-session-btn"
                        onClick={() => setActiveSession(session.id)}
                      >
                        <span className="fc-film-session-name">{session.title}</span>
                        <span className="fc-film-session-meta">
                          {filmRoomSourceLabel(session.source)} · {session.strokes.length}{" "}
                          marks
                        </span>
                      </button>
                      <button
                        type="button"
                        className="fc-film-session-delete"
                        title="Delete session"
                        aria-label={`Delete ${session.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDelete(session.id);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          <section className="fc-film-main">
            {!hydrated ? (
              <div className="fc-film-main-empty">Loading…</div>
            ) : activeSession ? (
              <FilmRoomAnnotator
                key={activeSession.id}
                session={activeSession}
                initialSeekTime={
                  deepLink.sessionId === activeSession.id
                    ? deepLink.timestamp
                    : null
                }
              />
            ) : (
              <div className="fc-film-main-empty">
                <h2>Annotate game film</h2>
                <p>
                  Upload an MP4 or add a YouTube link, then draw on the video. Annotations sync to
                  the playhead — rewind to see them again at the right moment.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
      <FdAppFooter />
    </div>
  );
}
