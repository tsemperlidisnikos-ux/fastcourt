import { getLoadedCourtWoodTexture } from "@/lib/designer/court-wood-texture-cache";

function countReadyCourts(root: HTMLElement): {
  expected: number;
  ready: number;
} {
  const cells = root.querySelectorAll(".fd-cell:not(.fd-cell-empty)");
  const courts = root.querySelectorAll(
    ".fd-cell-court canvas, .fc-print-frame-court canvas, .fc-practice-frame-court canvas, .fc-print-konva-snapshot",
  );
  const expected =
    cells.length > 0
      ? cells.length
      : root.querySelectorAll(
          ".fc-print-frame-court, .fc-practice-frame-court, .fd-cell-court",
        ).length;
  return { expected, ready: courts.length };
}

function woodTexturesReady(root: HTMLElement): boolean {
  const nodes = root.querySelectorAll("[data-fc-await-wood-texture]");
  if (nodes.length === 0) return true;
  for (const node of nodes) {
    const id = node.getAttribute("data-fc-await-wood-texture");
    if (!id) continue;
    if (!getLoadedCourtWoodTexture(id)) return false;
  }
  return true;
}

/** Wait until Konva courts / print snapshots exist, or timeout. */
export function waitForPrintContentReady(
  contentRootId: string,
  timeoutMs = 8000,
): Promise<void> {
  return new Promise((resolve) => {
    const root = document.getElementById(contentRootId);
    if (!root) {
      resolve();
      return;
    }

    const started = performance.now();

    const finish = () => {
      const needsWoodPaint = !!root.querySelector("[data-fc-await-wood-texture]");
      let framesLeft = needsWoodPaint ? 4 : 2;
      const tick = () => {
        if (framesLeft <= 0) {
          resolve();
          return;
        }
        framesLeft -= 1;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const check = () => {
      const { expected, ready } = countReadyCourts(root);
      const courtsReady = expected === 0 || ready >= expected;
      const woodReady = woodTexturesReady(root);
      const timedOut = performance.now() - started >= timeoutMs;
      if ((courtsReady && woodReady) || timedOut) {
        finish();
        return;
      }
      window.setTimeout(check, 50);
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(check);
    });
  });
}
