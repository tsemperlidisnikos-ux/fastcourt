import type { BillingConfig, LandingPricingConfig } from "@/types/billing-config";
import { DEFAULT_LANDING_PRICING } from "@/lib/settings/billing-config";

export type LandingBillingCycle = "monthly" | "yearly";

export const LANDING_PRICING_COPY = {
  title: "Pricing",
  subtitle: "Choose the plan that best suits you",
  signupHref: "/login?signup=1",
} as const;

export interface LandingPricingTier {
  id: "free" | "individual" | "club";
  name: string;
  accent: "neutral" | "primary" | "club";
  popular?: boolean;
  cta: string;
  href: string;
  includesIndividualNote?: string;
  features: string[];
}

export function resolveLandingPricing(
  billing?: Pick<BillingConfig, "landingPricing"> | null,
): LandingPricingConfig {
  return billing?.landingPricing ?? DEFAULT_LANDING_PRICING;
}

export function landingYearlySaveLabel(pricing: LandingPricingConfig) {
  return `SAVE ${pricing.yearlySavePercent}%`;
}

export function landingClubContactHref(supportEmail: string) {
  return `mailto:${supportEmail}?subject=${encodeURIComponent("FastCourt club pricing")}`;
}

export function getLandingPricingTiers(
  trialDays: number,
  supportEmail: string,
): LandingPricingTier[] {
  return [
    {
      id: "free",
      name: "Free",
      accent: "neutral",
      cta: "Get started",
      href: LANDING_PRICING_COPY.signupHref,
      features: [
        `${trialDays}-day full trial on signup`,
        "Draw and animate plays in the designer",
        "Save up to 3 plays in your library",
        "Create up to 3 playbooks",
        "Build 3 practice sessions",
        "Import .fdb files",
        "1 tablet per account",
      ],
    },
    {
      id: "individual",
      name: "Individual Coach",
      accent: "primary",
      popular: true,
      cta: "Get started",
      href: LANDING_PRICING_COPY.signupHref,
      features: [
        "Unlimited plays and playbooks",
        "Unlimited practice sessions",
        "Cloud library sync across devices",
        "Animation playback and export",
        "PDF / print playbooks",
        "Organizer: tags, teams, and seasons",
        "Import and duplicate plays",
      ],
    },
    {
      id: "club",
      name: "Club Structure",
      accent: "club",
      cta: "Get started",
      href: landingClubContactHref(supportEmail),
      includesIndividualNote: "+ Everything as Individual",
      features: [
        "Shared cloud library for your club",
        "Team admin invites coach seats",
        "Central org overview and branding",
        "Coach access managed by admin",
        "Ideal for academies and federations",
      ],
    },
  ];
}

function formatEuro(amount: number) {
  return amount.toLocaleString("en-IE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function individualMonthlyPrice(
  pricing: LandingPricingConfig,
  cycle: LandingBillingCycle,
): number {
  if (cycle === "monthly") return pricing.individualMonthlyEur;
  return pricing.individualYearlyEur / 12;
}

export function clubMonthlyPrice(
  pricing: LandingPricingConfig,
  cycle: LandingBillingCycle,
  coachSeats: number,
): number {
  const seats = clampCoachSeats(pricing, coachSeats);
  if (cycle === "monthly") {
    return pricing.clubAdminYearlyEur / 12 + seats * pricing.clubCoachSeatMonthlyEur;
  }
  return (pricing.clubAdminYearlyEur + seats * pricing.clubCoachSeatYearlyEur) / 12;
}

export function clampCoachSeats(pricing: LandingPricingConfig, coachSeats: number) {
  return Math.max(pricing.clubCoachMin, Math.min(pricing.clubCoachMax, coachSeats));
}

export function clubPriceBreakdown(
  pricing: LandingPricingConfig,
  cycle: LandingBillingCycle,
  coachSeats: number,
) {
  const seats = clampCoachSeats(pricing, coachSeats);
  const admin =
    cycle === "monthly"
      ? pricing.individualMonthlyEur
      : pricing.clubAdminYearlyEur / 12;
  const seat =
    cycle === "monthly"
      ? pricing.clubCoachSeatMonthlyEur
      : pricing.clubCoachSeatYearlyEur / 12;
  return {
    seats,
    adminLabel: `Admin (${formatEuro(admin)}€)`,
    coachesLabel: `${seats} coaches (${formatEuro(seat)}€ each)`,
  };
}

export function formatLandingPrice(amount: number) {
  return `${formatEuro(amount)}€`;
}

export function previewLandingPricing(pricing: LandingPricingConfig) {
  const seats = pricing.clubCoachDefault;
  return {
    individualYearlyMonthly: individualMonthlyPrice(pricing, "yearly"),
    individualMonthly: individualMonthlyPrice(pricing, "monthly"),
    clubYearlyMonthly: clubMonthlyPrice(pricing, "yearly", seats),
    clubMonthly: clubMonthlyPrice(pricing, "monthly", seats),
    seats,
  };
}
