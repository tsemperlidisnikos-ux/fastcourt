import { getMetaJson, setMetaJson } from "@/lib/library/meta";
import { templateSpecToSessionItems } from "@/lib/practice/practice-items";
import type { PracticeSession, PracticeTemplate } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";

const TEMPLATES_KEY = "practiceTemplates_v1";

export const BUILTIN_PRACTICE_TEMPLATES: PracticeTemplate[] = [
  {
    id: "builtin_shootaround",
    builtin: true,
    name: "Pre-game shootaround",
    title: "Shootaround",
    notes: "Light intensity. Game-spot shots and quick review of ATOs.",
    items: [
      {
        cueLabel: "Dynamic warm-up",
        durationMin: 8,
        notes: "Layups, stretches, both baskets",
      },
      {
        matchNames: ["shell", "4v0"],
        durationMin: 12,
        notes: "Walk through set plays",
      },
      {
        cueLabel: "Shooting stations",
        durationMin: 15,
        notes: "Catch-and-shoot, pull-ups from actions",
      },
      {
        cueLabel: "Free throws",
        durationMin: 5,
        notes: "Pressure reps — make 2 in a row",
      },
      {
        matchNames: ["ATO", "out of bounds"],
        durationMin: 10,
        notes: "One side OOB, one ATO",
      },
    ],
  },
  {
    id: "builtin_offense",
    builtin: true,
    name: "Offense & transition",
    title: "Practice — Offense focus",
    notes: "Spacing, pace, and decision-making in transition.",
    items: [
      { cueLabel: "Dynamic warm-up", durationMin: 10, notes: "" },
      {
        matchNames: ["transition", "break"],
        durationMin: 15,
        notes: "Push pace, fill lanes",
      },
      { matchNames: ["shell"], durationMin: 18, notes: "Half-court sets vs shell" },
      {
        matchNames: ["drill", "shooting"],
        durationMin: 12,
        notes: "Actions into shots",
      },
      {
        cueLabel: "5v5 controlled",
        durationMin: 20,
        notes: "Emphasis on spacing rules",
      },
      { cueLabel: "Cool down", durationMin: 5, notes: "Stretch, review" },
    ],
  },
  {
    id: "builtin_recovery",
    builtin: true,
    name: "Recovery day",
    title: "Light practice",
    notes: "Low load day — technique and film cues.",
    items: [
      { cueLabel: "Mobility & stretch", durationMin: 12, notes: "" },
      {
        matchNames: ["shooting", "form"],
        durationMin: 15,
        notes: "Form shooting, no defense",
      },
      { cueLabel: "Walk-through", durationMin: 15, notes: "No live defense" },
      { cueLabel: "Team meeting / film", durationMin: 15, notes: "" },
    ],
  },
];

export async function loadCustomPracticeTemplates(): Promise<PracticeTemplate[]> {
  const parsed = await getMetaJson<PracticeTemplate[]>(TEMPLATES_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

export async function saveCustomPracticeTemplates(
  list: PracticeTemplate[],
): Promise<void> {
  await setMetaJson(TEMPLATES_KEY, list);
}

export async function deleteCustomPracticeTemplate(id: string): Promise<void> {
  const list = await loadCustomPracticeTemplates();
  await saveCustomPracticeTemplates(list.filter((t) => t.id !== id));
}

export async function saveCustomPracticeTemplate(
  template: PracticeTemplate,
): Promise<void> {
  const list = await loadCustomPracticeTemplates();
  await saveCustomPracticeTemplates([template, ...list]);
}

export async function getAllPracticeTemplates(): Promise<PracticeTemplate[]> {
  const custom = await loadCustomPracticeTemplates();
  return [...BUILTIN_PRACTICE_TEMPLATES, ...custom];
}

export function sessionFromTemplate(
  template: PracticeTemplate,
  plays: StoredPlay[],
  defaultTeam: string,
): Omit<PracticeSession, "id" | "createdAt" | "updatedAt"> {
  const now = new Date();
  return {
    date: now.toISOString().slice(0, 10),
    title: template.title || template.name || "Practice",
    team: template.team || defaultTeam,
    notes: template.notes || "",
    items: templateSpecToSessionItems(template.items, plays),
  };
}

export function templateFromSession(
  session: PracticeSession,
  name: string,
): PracticeTemplate {
  return {
    id: `tpl_${Date.now()}`,
    name: name.trim(),
    title: session.title,
    notes: session.notes,
    team: session.team,
    items: session.items.map((item) => {
      if (item.playId) {
        return {
          playId: item.playId,
          durationMin: item.durationMin,
          notes: item.notes || "",
        };
      }
      return {
        playId: null,
        cueLabel: item.cueLabel || "Block",
        durationMin: item.durationMin,
        notes: item.notes || "",
      };
    }),
    createdAt: new Date().toISOString(),
  };
}
