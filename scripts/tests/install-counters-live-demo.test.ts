import assert from "node:assert/strict";
import test from "node:test";
import {
  COUNTERS_LIVE_DEMO_PLAN_ID,
  buildCountersLiveDemoPlan,
  countersLiveDemoHref,
} from "../../src/lib/demo/install-counters-live-demo.ts";

test("buildCountersLiveDemoPlan has counters, defense, and scout board", () => {
  const plan = buildCountersLiveDemoPlan();
  assert.equal(plan.id, COUNTERS_LIVE_DEMO_PLAN_ID);
  assert.equal(plan.status, "ready");
  assert.ok((plan.timeoutCues?.length ?? 0) >= 5);
  assert.ok(plan.entries.some((e) => e.categoryId === "defense" && e.playId));
  assert.ok((plan.opponentBoard?.length ?? 0) >= 3);
  assert.ok(plan.scoutingNotes && plan.scoutingNotes.includes("ICE"));
  assert.ok(plan.timeoutCues?.every((cue) => cue.defensePlayId));
});

test("countersLiveDemoHref points at game plan tab", () => {
  assert.equal(
    countersLiveDemoHref(),
    `/library?tab=gameplan&plan=${COUNTERS_LIVE_DEMO_PLAN_ID}`,
  );
});
