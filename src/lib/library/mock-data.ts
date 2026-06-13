import type { LibraryItem } from "@/types/library";

export const MOCK_LIBRARY: LibraryItem[] = [
  {
    id: "play-horns-flare",
    title: "Horns Flare",
    type: "play",
    tags: ["half-court", "motion"],
    frameCount: 6,
    updatedAt: "2026-06-08T10:00:00.000Z",
    favorite: true,
  },
  {
    id: "drill-shell",
    title: "Shell Defense 4v4",
    type: "drill",
    tags: ["defense", "shell"],
    frameCount: 4,
    updatedAt: "2026-06-07T14:30:00.000Z",
  },
  {
    id: "pb-motion",
    title: "Motion Offense Playbook",
    type: "playbook",
    tags: ["offense"],
    frameCount: 24,
    updatedAt: "2026-06-05T09:15:00.000Z",
  },
];
