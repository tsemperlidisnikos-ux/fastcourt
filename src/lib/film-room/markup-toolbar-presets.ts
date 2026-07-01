import type { FilmRoomInkTool } from "@/types/film-room";

export type FilmRoomMarkupPreset =
  | "red-pen"
  | "yellow-pen"
  | "green-marker"
  | "white-marker"
  | "blue-marker"
  | "eraser";

export type FilmRoomMarkupIconVariant = "marker" | "eraser";

export interface FilmRoomMarkupPresetDef {
  id: FilmRoomMarkupPreset;
  tool: FilmRoomInkTool;
  color: string;
  width: number;
  icon: FilmRoomMarkupIconVariant;
  title: string;
}

export const FILM_ROOM_MARKUP_PRESETS: FilmRoomMarkupPresetDef[] = [
  {
    id: "red-pen",
    tool: "pen",
    color: "#ff3b30",
    width: 2,
    icon: "marker",
    title: "Red pen",
  },
  {
    id: "yellow-pen",
    tool: "pen",
    color: "#ffcc00",
    width: 2,
    icon: "marker",
    title: "Yellow pen",
  },
  {
    id: "green-marker",
    tool: "pen",
    color: "#34c759",
    width: 8,
    icon: "marker",
    title: "Green marker",
  },
  {
    id: "white-marker",
    tool: "pen",
    color: "#f2f2f7",
    width: 5,
    icon: "marker",
    title: "White marker",
  },
  {
    id: "blue-marker",
    tool: "pen",
    color: "#007aff",
    width: 10,
    icon: "marker",
    title: "Blue marker",
  },
  {
    id: "eraser",
    tool: "eraser",
    color: "#000000",
    width: 4,
    icon: "eraser",
    title: "Eraser",
  },
];

export const DEFAULT_FILM_ROOM_MARKUP_PRESET: FilmRoomMarkupPreset = "green-marker";

export function filmRoomMarkupPreset(
  id: FilmRoomMarkupPreset,
): FilmRoomMarkupPresetDef {
  const preset = FILM_ROOM_MARKUP_PRESETS.find((row) => row.id === id);
  return preset ?? FILM_ROOM_MARKUP_PRESETS[2];
}
