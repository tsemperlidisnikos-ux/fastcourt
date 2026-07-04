import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPossessionPlaylist,
  nextPossessionPlaylistIndex,
  possessionPlaylistIndexAtTime,
  prevPossessionPlaylistIndex,
} from "../../src/lib/film-room/film-possession-playlist.ts";
import { createFilmBookmark } from "../../src/lib/film-room/film-room-bookmarks.ts";

describe("film-possession-playlist", () => {
  it("builds sorted playlist from bookmarks", () => {
    const bookmarks = [
      createFilmBookmark(90, "ATO", undefined, "chapter"),
      createFilmBookmark(30, "Plan broke here", "ICE", "disruption"),
      createFilmBookmark(60, "PnR", undefined, "chapter"),
    ];
    const items = buildPossessionPlaylist(bookmarks);
    assert.equal(items.length, 3);
    assert.equal(items[0]?.time, 30);
    assert.equal(items[0]?.kind, "disruption");
    assert.equal(items[2]?.time, 90);
  });

  it("filters disruption bookmarks only", () => {
    const bookmarks = [
      createFilmBookmark(10, "Chapter", undefined, "chapter"),
      createFilmBookmark(20, "Broke", undefined, "disruption"),
    ];
    const items = buildPossessionPlaylist(bookmarks, "disruption");
    assert.equal(items.length, 1);
    assert.equal(items[0]?.kind, "disruption");
  });

  it("tracks active index from playhead time", () => {
    const items = buildPossessionPlaylist([
      createFilmBookmark(10, "A"),
      createFilmBookmark(40, "B"),
      createFilmBookmark(70, "C"),
    ]);
    assert.equal(possessionPlaylistIndexAtTime(items, 5), 0);
    assert.equal(possessionPlaylistIndexAtTime(items, 45), 1);
    assert.equal(nextPossessionPlaylistIndex(items, 0), 1);
    assert.equal(prevPossessionPlaylistIndex(items, 1), 0);
  });
});
