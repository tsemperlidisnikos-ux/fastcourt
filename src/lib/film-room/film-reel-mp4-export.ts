import type { PossessionReelSegment } from "@/lib/film-room/possession-reel-export";

export type ReelMp4Progress = {
  phase: "loading" | "cutting" | "joining" | "done";
  current: number;
  total: number;
  message: string;
};

export async function exportUploadReelMp4(
  file: Blob,
  segments: PossessionReelSegment[],
  onProgress?: (progress: ReelMp4Progress) => void,
): Promise<Blob> {
  if (!segments.length) {
    throw new Error("No reel segments to export.");
  }

  onProgress?.({
    phase: "loading",
    current: 0,
    total: segments.length,
    message: "Loading video encoder…",
  });

  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { fetchFile } = await import("@ffmpeg/util");
  const ffmpeg = new FFmpeg();

  ffmpeg.on("log", ({ message }) => {
    if (message.includes("Error")) {
      onProgress?.({
        phase: "cutting",
        current: 0,
        total: segments.length,
        message,
      });
    }
  });

  await ffmpeg.load();
  await ffmpeg.writeFile("input.mp4", await fetchFile(file));

  const concatLines: string[] = [];
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]!;
    const outName = `seg_${index}.mp4`;
    onProgress?.({
      phase: "cutting",
      current: index + 1,
      total: segments.length,
      message: `Cutting ${segment.timeLabel} · ${segment.label}`,
    });
    await ffmpeg.exec([
      "-ss",
      String(segment.startSec),
      "-to",
      String(segment.endSec),
      "-i",
      "input.mp4",
      "-c",
      "copy",
      "-avoid_negative_ts",
      "make_zero",
      outName,
    ]);
    concatLines.push(`file '${outName}'`);
  }

  onProgress?.({
    phase: "joining",
    current: segments.length,
    total: segments.length,
    message: "Joining segments…",
  });
  await ffmpeg.writeFile("concat.txt", concatLines.join("\n"));
  await ffmpeg.exec([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    "concat.txt",
    "-c",
    "copy",
    "output.mp4",
  ]);

  const data = await ffmpeg.readFile("output.mp4");
  onProgress?.({
    phase: "done",
    current: segments.length,
    total: segments.length,
    message: "Export complete",
  });
  const bytes =
    typeof data === "string"
      ? new TextEncoder().encode(data)
      : new Uint8Array(data as Uint8Array);
  return new Blob([bytes], { type: "video/mp4" });
}

export function downloadBlobFile(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
