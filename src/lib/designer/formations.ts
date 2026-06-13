export interface FormationSpot {
  num: number;
  nx: number;
  ny: number;
  hasBall?: boolean;
}

export const FIVE_OUT_SPACING: FormationSpot[] = [
  { num: 1, nx: 0.5, ny: 0.61, hasBall: true },
  { num: 2, nx: 0.2, ny: 0.47 },
  { num: 3, nx: 0.8, ny: 0.47 },
  { num: 4, nx: 0.12, ny: 0.15 },
  { num: 5, nx: 0.88, ny: 0.15 },
];

export const FORMATION_PRESETS = {
  horns: {
    label: "Horns",
    offense: [
      { num: 1, nx: 0.5, ny: 0.78, hasBall: true },
      { num: 2, nx: 0.18, ny: 0.58 },
      { num: 3, nx: 0.82, ny: 0.58 },
      { num: 4, nx: 0.38, ny: 0.48 },
      { num: 5, nx: 0.62, ny: 0.48 },
    ],
  },
  "4-out-1-in": {
    label: "4 Out · 1 In",
    offense: [
      { num: 1, nx: 0.5, ny: 0.75, hasBall: true },
      { num: 2, nx: 0.12, ny: 0.52 },
      { num: 3, nx: 0.88, ny: 0.52 },
      { num: 4, nx: 0.32, ny: 0.38 },
      { num: 5, nx: 0.68, ny: 0.62 },
    ],
  },
  "5-out": {
    label: "5 Out",
    offense: FIVE_OUT_SPACING,
  },
  box: {
    label: "Box",
    offense: [
      { num: 1, nx: 0.5, ny: 0.72, hasBall: true },
      { num: 2, nx: 0.22, ny: 0.55 },
      { num: 3, nx: 0.78, ny: 0.55 },
      { num: 4, nx: 0.35, ny: 0.68 },
      { num: 5, nx: 0.65, ny: 0.68 },
    ],
  },
  "1-4-high": {
    label: "1-4 High",
    offense: [
      { num: 1, nx: 0.5, ny: 0.78, hasBall: true },
      { num: 2, nx: 0.15, ny: 0.35 },
      { num: 3, nx: 0.38, ny: 0.35 },
      { num: 4, nx: 0.62, ny: 0.35 },
      { num: 5, nx: 0.85, ny: 0.35 },
    ],
  },
} as const;

export type FormationKey = keyof typeof FORMATION_PRESETS;
