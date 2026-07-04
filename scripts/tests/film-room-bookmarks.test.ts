import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createFilmBookmark,
  defaultFilmBookmarkLabel,
  normalizeFilmBookmarks,
  sortFilmBookmarks,
} from "../../src/lib/film-room/film-room-bookmarks.ts";
import { normalizeFilmRoomSession } from "../../src/lib/film-room/film-room-session.ts";
import { buildFilmScoutPrintModelFromSession } from "../../src/lib/film-room/film-scout-print-model.ts";
import type { FilmRoomSession } from "../../src/types/film-room.ts";

describe("film room bookmarks", () => {
  it("creates default chapter labels from playhead time", () => {
    assert.equal(defaultFilmBookmarkLabel(83), "Chapter @ 1:23");
    const bookmark = createFilmBookmark(45, "", "Horns entry");
    assert.equal(bookmark.label, "Chapter @ 0:45");
    assert.equal(bookmark.note, "Horns entry");
  });

  it("sorts bookmarks by time", () => {
    const sorted = sortFilmBookmarks([
      createFilmBookmark(120, "Late"),
      createFilmBookmark(20, "Early"),
    ]);
    assert.equal(sorted[0]?.time, 20);
    assert.equal(sorted[1]?.time, 120);
  });

  it("normalizes legacy sessions without bookmarks", () => {
    const session = normalizeFilmRoomSession({
      id: "film_1",
      title: "Clip",
      source: { kind: "upload", blobId: "b1", fileName: "game.mp4" },
      strokes: [],
      events: [],
      analyses: [],
      createdAt: 1,
      updatedAt: 1,
    } as FilmRoomSession);
    assert.deepEqual(session.bookmarks, []);
  });

  it("exports chapter-only session PDF model", () => {
    const session: FilmRoomSession = {
      id: "film_2",
      title: "Full game",
      source: { kind: "upload", blobId: "b2", fileName: "game.mp4" },
      strokes: [],
      events: [],
      bookmarks: normalizeFilmBookmarks([
        createFilmBookmark(90, "Q2 Horns"),
        createFilmBookmark(180, "ATO"),
      ]),
      analyses: [],
      createdAt: 1,
      updatedAt: 2,
    };

    const model = buildFilmScoutPrintModelFromSession({
      session,
      origin: "https://fastcourt.eu",
      teamName: "Varsity",
      footerText: "",
    });

    assert.ok(model);
    assert.match(model!.reportTitle, /Chapter guide/);
    assert.equal(model!.chapters.length, 2);
    assert.equal(model!.clips.length, 0);
    assert.match(model!.chapters[0]?.clipLink ?? "", /t=90/);
  });
});
