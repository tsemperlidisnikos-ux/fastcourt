import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canInlineEmbedVideo,
  isValidVideoUrl,
  parseVideoUrl,
} from "@/lib/library/video-url";

describe("video url parsing", () => {
  it("parses YouTube watch and short links", () => {
    const watch = parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    assert.ok(watch);
    assert.equal(watch!.provider, "youtube");
    assert.match(watch!.embedUrl ?? "", /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);

    const short = parseVideoUrl("https://youtu.be/dQw4w9WgXcQ");
    assert.equal(short?.provider, "youtube");
  });

  it("parses Vimeo links", () => {
    const parsed = parseVideoUrl("https://vimeo.com/123456789");
    assert.ok(parsed);
    assert.equal(parsed!.provider, "vimeo");
    assert.equal(parsed!.embedUrl, "https://player.vimeo.com/video/123456789");
  });

  it("detects Hudl as external provider", () => {
    const parsed = parseVideoUrl("https://www.hudl.com/video/3/team/clip-id");
    assert.ok(parsed);
    assert.equal(parsed!.provider, "hudl");
    assert.equal(parsed!.embedUrl, undefined);
  });

  it("parses direct mp4 files for inline playback", () => {
    const parsed = parseVideoUrl("https://cdn.example.com/clip.mp4");
    assert.ok(parsed);
    assert.equal(parsed!.provider, "direct");
    assert.equal(parsed!.embedUrl, parsed!.openUrl);
    assert.equal(canInlineEmbedVideo(parsed!.originalUrl), true);
  });

  it("allows empty video url in forms", () => {
    assert.equal(isValidVideoUrl(""), true);
    assert.equal(isValidVideoUrl("   "), true);
    assert.equal(isValidVideoUrl("not a url"), false);
  });
});
