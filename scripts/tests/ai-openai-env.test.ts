import assert from "node:assert/strict";
import test from "node:test";
import { isOpenAiConfigured } from "../../src/lib/ai/env.ts";

test("isOpenAiConfigured rejects placeholder keys", () => {
  const original = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-YOUR_KEY";
  assert.equal(isOpenAiConfigured(), false);
  if (original === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = original;
});

test("isOpenAiConfigured accepts real-looking keys", () => {
  const original = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-proj-test1234567890abcdefghij";
  assert.equal(isOpenAiConfigured(), true);
  if (original === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = original;
});
