import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getCloudConfigIssue,
  isCloudConfigured,
  isValidSupabaseProjectUrl,
} from "@/lib/supabase/env";

describe("supabase env validation", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  function restoreEnv() {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  }

  it("rejects API-key-shaped URL as project URL", () => {
    assert.equal(
      isValidSupabaseProjectUrl("https://sb_publishable_abc123"),
      false,
    );
  });

  it("accepts valid supabase.co project URL", () => {
    assert.equal(
      isValidSupabaseProjectUrl("https://abcdefgh.supabase.co"),
      true,
    );
  });

  it("isCloudConfigured is false for placeholder values", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://xxxx.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
    assert.equal(isCloudConfigured(), false);
    restoreEnv();
  });

  it("isCloudConfigured is true for valid-looking env", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abcdefgh.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";
    assert.equal(isCloudConfigured(), true);
    restoreEnv();
  });

  it("getCloudConfigIssue flags publishable key used as URL", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://sb_publishable_test";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiJ9.x";
    const issue = getCloudConfigIssue();
    assert.ok(issue?.includes("project URL"));
    restoreEnv();
  });
});
