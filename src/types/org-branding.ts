export interface OrgBrandingSettings {
  clubName?: string;
  subtitle?: string;
  footerText?: string;
  headerColor?: string;
  logoDataUrl?: string | null;
  /** When false, coaches must use organization branding. */
  allowCoachBranding?: boolean;
}
