import type { PdfBrandSettings } from "@/types/pdf-branding";
import type { OrgBrandingSettings } from "@/types/org-branding";
import { DEFAULT_PDF_BRAND } from "@/lib/settings/pdf-branding";
import type { SessionUser } from "@/types/auth";
import type { TeamOrganization } from "@/types/team-org";

export function orgBrandingToPdfBrand(
  branding: OrgBrandingSettings | undefined,
  orgName: string,
): PdfBrandSettings | null {
  if (!branding) return null;
  const hasContent =
    branding.clubName?.trim() ||
    branding.subtitle?.trim() ||
    branding.footerText?.trim() ||
    branding.logoDataUrl?.trim() ||
    branding.headerColor?.trim();
  if (!hasContent) return null;

  return {
    clubName: branding.clubName?.trim() || orgName,
    subtitle: branding.subtitle?.trim() || "",
    footerText: branding.footerText?.trim() || "",
    headerColor: branding.headerColor?.trim() || DEFAULT_PDF_BRAND.headerColor,
    logoDataUrl: branding.logoDataUrl?.trim() ? branding.logoDataUrl : null,
  };
}

export function orgHasConfiguredBranding(
  org: TeamOrganization | null | undefined,
): boolean {
  return orgBrandingToPdfBrand(org?.branding, org?.name ?? "") != null;
}

export function coachMayCustomizeBranding(org: TeamOrganization | null | undefined): boolean {
  if (!org?.branding) return true;
  return org.branding.allowCoachBranding !== false;
}

export function shouldApplyOrgBranding(
  user: SessionUser,
  org: TeamOrganization | null | undefined,
  useOrgBranding: boolean,
): boolean {
  if (!org || !user.organizationId) return false;
  if (!coachMayCustomizeBranding(org)) return true;
  return useOrgBranding && Boolean(org.branding);
}

export function mergeOrgBrandingIntoPdfBrand(
  personal: PdfBrandSettings,
  org: TeamOrganization | null | undefined,
  forced: boolean,
): PdfBrandSettings {
  const orgBrand = orgBrandingToPdfBrand(org?.branding, org?.name ?? "");
  if (!orgBrand) return personal;
  if (!forced) return personal;

  return {
    ...personal,
    clubName: orgBrand.clubName || personal.clubName,
    subtitle: orgBrand.subtitle || personal.subtitle,
    footerText: orgBrand.footerText || personal.footerText,
    headerColor: orgBrand.headerColor || personal.headerColor,
    logoDataUrl: orgBrand.logoDataUrl ?? personal.logoDataUrl,
  };
}
