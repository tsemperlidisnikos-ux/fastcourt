const SNAPSHOT_CLASS = "fc-print-konva-snapshot";

type SnapshotEntry = {
  canvas: HTMLCanvasElement;
  snapshot: HTMLImageElement;
  prevDisplay: string;
};

function pickSceneCanvas(
  canvases: HTMLCanvasElement[],
): HTMLCanvasElement | null {
  const usable = canvases.filter((canvas) => {
    if (canvas.width <= 0 || canvas.height <= 0) return false;
    const style = window.getComputedStyle(canvas);
    return style.display !== "none" && style.visibility !== "hidden";
  });
  if (!usable.length) return null;
  return usable.reduce((best, canvas) =>
    canvas.width * canvas.height >= best.width * best.height ? canvas : best,
  );
}

function groupCanvasesByParent(root: ParentNode) {
  const groups = new Map<ParentNode, HTMLCanvasElement[]>();
  root.querySelectorAll("canvas").forEach((node) => {
    const canvas = node as HTMLCanvasElement;
    const parent = canvas.parentElement;
    if (!parent) return;
    const list = groups.get(parent) ?? [];
    list.push(canvas);
    groups.set(parent, list);
  });
  return groups;
}

function snapshotCanvas(canvas: HTMLCanvasElement): HTMLImageElement | null {
  let dataUrl = "";
  try {
    dataUrl = canvas.toDataURL("image/png");
  } catch {
    return null;
  }
  if (!dataUrl.startsWith("data:image")) return null;

  const isInkOverlay = canvas.classList.contains("fc-practice-sheet-ink");
  const img = document.createElement("img");
  img.className = isInkOverlay
    ? `${SNAPSHOT_CLASS} fc-practice-sheet-ink`
    : SNAPSHOT_CLASS;
  img.alt = "";
  img.src = dataUrl;
  img.style.display = "block";
  img.style.maxWidth = "100%";

  if (isInkOverlay) {
    img.style.position = "absolute";
    img.style.inset = "0";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "contain";
  } else {
    img.style.width = "100%";
    img.style.height = "auto";
    img.style.maxWidth = "100%";
  }

  return img;
}

export function installKonvaPrintSnapshots(
  root: ParentNode | null,
): () => void {
  if (!root) return () => {};

  const entries: SnapshotEntry[] = [];

  groupCanvasesByParent(root).forEach((canvases) => {
    const canvas = pickSceneCanvas(canvases);
    if (!canvas) return;

    const img = snapshotCanvas(canvas);
    if (!img) return;

    const parent = canvas.parentElement;
    if (!parent) return;
    parent.insertBefore(img, canvas);

    const prevDisplay = canvas.style.display;
    canvas.style.display = "none";
    entries.push({ canvas, snapshot: img, prevDisplay });
  });

  return () => {
    for (const { canvas, snapshot, prevDisplay } of entries) {
      snapshot.remove();
      canvas.style.display = prevDisplay;
    }
  };
}
