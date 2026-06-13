"use client";

export const PRACTICE_SHEET_PDF_URL = "/templates/practice-2026.pdf";

export interface PracticeSheetPageSize {
  width: number;
  height: number;
}

export interface PracticeSheetRenderHandle {
  size: PracticeSheetPageSize;
  cancel: () => void;
}

let pdfWorkerConfigured = false;
let cachedPdfPromise: Promise<import("pdfjs-dist").PDFDocumentProxy> | null = null;

const canvasRenderChains = new WeakMap<HTMLCanvasElement, Promise<void>>();

async function getPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfWorkerConfigured && typeof window !== "undefined") {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    pdfWorkerConfigured = true;
  }
  return pdfjs;
}

async function getPracticeSheetPdf(
  url: string = PRACTICE_SHEET_PDF_URL,
): Promise<import("pdfjs-dist").PDFDocumentProxy> {
  if (!cachedPdfPromise) {
    cachedPdfPromise = getPdfJs()
      .then((pdfjs) => pdfjs.getDocument({ url }).promise)
      .catch((err) => {
        cachedPdfPromise = null;
        throw err;
      });
  }
  return cachedPdfPromise;
}

/** Scale PDF to fill the available width (height may extend — scroll in the viewer). */
export async function computePracticeSheetWidthScale(
  url: string = PRACTICE_SHEET_PDF_URL,
  availableWidth: number,
): Promise<number> {
  const pdf = await getPracticeSheetPdf(url);
  const page = await pdf.getPage(1);
  const base = page.getViewport({ scale: 1, rotation: 0 });
  if (base.width <= 0) return 1;
  return availableWidth / base.width;
}

async function withCanvasRenderLock<T>(
  canvas: HTMLCanvasElement,
  task: () => Promise<T>,
): Promise<T> {
  const previous = canvasRenderChains.get(canvas) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chain = previous.then(() => gate);
  canvasRenderChains.set(canvas, chain.then(() => undefined));

  await previous.catch(() => undefined);

  try {
    return await task();
  } finally {
    release();
  }
}

export async function renderPracticeSheetPdf(
  canvas: HTMLCanvasElement,
  url: string = PRACTICE_SHEET_PDF_URL,
  scale = 1.35,
): Promise<PracticeSheetRenderHandle> {
  return withCanvasRenderLock(canvas, async () => {
    const pdf = await getPracticeSheetPdf(url);
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale, rotation: 0 });
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not get canvas context");
    }

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const renderTask = page.render({
      canvas,
      canvasContext: context,
      viewport,
    });

    try {
      await renderTask.promise;
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name === "RenderingCancelledException") {
        throw err;
      }
      throw err;
    }

    return {
      size: {
        width: canvas.width,
        height: canvas.height,
      },
      cancel: () => renderTask.cancel(),
    };
  });
}
