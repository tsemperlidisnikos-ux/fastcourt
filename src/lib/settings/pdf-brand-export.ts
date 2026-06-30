import type { PdfBrandSettings } from "@/types/pdf-branding";

export function resolvePdfCoverTeam(
  brand: Pick<PdfBrandSettings, "clubName">,
  teamOverride?: string | null,
): string {
  const team = teamOverride?.trim() ?? "";
  if (team && team !== "No Team") return team;
  return brand.clubName.trim();
}

export function resolvePdfCoverSubtitle(
  brand: Pick<PdfBrandSettings, "subtitle">,
  ...overrides: Array<string | null | undefined>
): string {
  for (const value of overrides) {
    const trimmed = value?.trim() ?? "";
    if (trimmed) return trimmed;
  }
  return brand.subtitle.trim();
}

export function resolvePdfFooterText(
  brand: Pick<PdfBrandSettings, "footerText">,
): string {
  return brand.footerText.trim();
}
