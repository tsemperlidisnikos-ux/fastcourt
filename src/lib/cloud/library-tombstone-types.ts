export type LibraryTombstoneKind = "play" | "playbook" | "practice" | "gameplan" | "homework";

export interface LibraryTombstone {
  id: string;
  kind: LibraryTombstoneKind;
  deletedAt: string;
}
