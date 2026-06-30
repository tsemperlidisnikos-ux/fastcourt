import { APP_DESCRIPTION, DEFAULT_TRIAL_DAYS } from "@/lib/config";

export const LANDING_HERO_BG = "/assets/landing/hero-court-bg.png";
export const LANDING_DESIGN_SHOT = "/assets/landing/explore-designer.png";

export const LANDING_HERO = {
  headline: ["Design plays.", "Run your team."],
  subtitle:
    "FastCourt helps coaches draw tactical plays, organize a cloud library, build playbooks, and plan practice — tablet-friendly, built for the bench.",
  ctaPrimary: "Sign up",
  ctaSecondary: "Log in",
} as const;

export const LANDING_PILLARS = [
  {
    id: "design",
    title: "Design",
    summary: "Full-court designer with frames, animation, and export-ready play diagrams.",
    image: LANDING_DESIGN_SHOT,
    imageAlt: "FastCourt play designer with court and player actions",
  },
  {
    id: "organize",
    title: "Organize",
    summary: "Library, tags, playbooks, and import — keep every drill and set play in one place.",
    image: "/assets/landing/explore-organize.png",
    imageAlt: "FastCourt library and playbook organization",
  },
  {
    id: "practice",
    title: "Practice",
    summary: "Build practice sessions from your plays, run a live gym timer, and share plans with staff.",
    image: "/assets/landing/explore-practice-planner.png",
    imageAlt: "FastCourt practice planner session view",
  },
] as const;

export const LANDING_AUDIENCE = {
  title: "Built for coaches and clubs",
  lead: "Start solo on trial, then grow into a shared club library when your organization is ready.",
  items: [
    {
      title: "Individual coach",
      body: "Draw plays, animate sets, and keep your personal library synced to the cloud.",
    },
    {
      title: "Club / academy",
      body: "Team admins invite coaches, manage seats, and keep everyone on the same playbook system.",
    },
  ],
} as const;

export const LANDING_FAQ = [
  {
    question: "Is there a free trial?",
    answer: `Yes. New coaches get ${DEFAULT_TRIAL_DAYS} days to explore the designer, library, playbooks, and practice planner.`,
  },
  {
    question: "Does FastCourt work on a tablet?",
    answer:
      "Yes. FastCourt is built for touch and sideline use — draw, present, and run practice from a tablet or laptop.",
  },
  {
    question: "Is my library saved online?",
    answer:
      "With cloud sign-in, your plays and organizer data sync to your account so you can move between devices.",
  },
  {
    question: "Can I import existing plays?",
    answer:
      "You can import compatible .fdb play files into your library and continue editing them in the designer.",
  },
] as const;

export const LANDING_FINAL_CTA = {
  title: "Ready to draw your next set?",
  subtitle: APP_DESCRIPTION,
  primary: "Start free trial",
  secondary: "Contact us",
} as const;

export function formatLandingTrialNote(trialDays: number) {
  return `${trialDays}-day free trial · No credit card required to start`;
}
