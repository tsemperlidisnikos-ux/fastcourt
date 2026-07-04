import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildFilmRoomDeepLink,
  buildGamePlanDeepLink,
  formatFilmTimestamp,
  parseFilmRoomDeepLink,
  filmScoutNoteFromSession,
} from "../../src/lib/film-room/film-game-plan-link.ts";
import {
  createFilmLinkedTendency,
  normalizeOpponentTendencies,
} from "../../src/lib/game-plan/opponent-board.ts";

describe("film game plan link", () => {
  it("formats timestamps for display", () => {
    assert.equal(formatFilmTimestamp(0), "0:00");
    assert.equal(formatFilmTimestamp(65), "1:05");
    assert.equal(formatFilmTimestamp(undefined), "");
  });

  it("builds and parses film room deep links", () => {
    const url = buildFilmRoomDeepLink("film_abc", 12.4);
    assert.match(url, /session=film_abc/);
    assert.match(url, /t=12\.4/);

    const parsed = parseFilmRoomDeepLink(new URLSearchParams(url.split("?")[1]));
    assert.equal(parsed.sessionId, "film_abc");
    assert.equal(parsed.timestamp, 12.4);
  });

  it("builds game plan deep link", () => {
    const url = buildGamePlanDeepLink("gp_1");
    assert.match(url, /tab=gameplan/);
    assert.match(url, /plan=gp_1/);
  });

  it("creates film-linked tendencies with session metadata", () => {
    const row = createFilmLinkedTendency(
      "zone",
      "film_1",
      "Q1 vs Panathinaikos",
      83,
    );
    assert.equal(row.filmSessionId, "film_1");
    assert.equal(row.filmTimestamp, 83);
    assert.equal(row.kind, "zone");
    assert.match(row.notes || "", /Q1 vs Panathinaikos/);
    assert.match(row.notes || "", /1:23/);
  });

  it("normalizes film timestamp on tendencies", () => {
    const rows = normalizeOpponentTendencies([
      {
        id: "obt1",
        kind: "press",
        label: "Press",
        filmSessionId: "film_x",
        filmTimestamp: 42.5,
        createdAt: "2026-06-01T00:00:00.000Z",
      },
    ]);
    assert.equal(rows[0]?.filmTimestamp, 42.5);
    assert.equal(rows[0]?.filmSessionId, "film_x");
  });

  it("builds scout notes from session title and time", () => {
    assert.equal(
      filmScoutNoteFromSession("Clip A", 30),
      "Film: Clip A @ 0:30",
    );
  });
});
