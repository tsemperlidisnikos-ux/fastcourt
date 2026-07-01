export type FilmRoomInkTool = "pointer" | "pen" | "laser" | "eraser";

export type FilmRoomVideoSource =
  | {
      kind: "upload";
      blobId: string;
      fileName: string;
      mimeType?: string;
    }
  | {
      kind: "youtube";
      videoId: string;
      originalUrl: string;
    }
  | {
      kind: "direct";
      url: string;
      label?: string;
    };

export interface VideoAnnotationStroke {
  id: string;
  /** Video timestamp (seconds) when the stroke was drawn. */
  time: number;
  /** Normalized 0–1 coordinates relative to the video overlay. */
  points: number[];
  color: string;
  width: number;
  /** Laser strokes fade after a short hold; pen strokes persist. */
  kind: "pen" | "laser";
}

export interface FilmRoomSession {
  id: string;
  title: string;
  source: FilmRoomVideoSource;
  strokes: VideoAnnotationStroke[];
  createdAt: number;
  updatedAt: number;
}
