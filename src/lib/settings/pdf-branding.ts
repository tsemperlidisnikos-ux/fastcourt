import type { PdfBrandSettings } from "@/types/pdf-branding";

const STORAGE_KEY = "fastcourt_print_brand_v1";
const LOGO_STORAGE_KEY = "fastcourt_print_brand_logo_v1";

export const DEFAULT_PDF_BRAND: PdfBrandSettings = {
  clubName: "",
  subtitle: "",
  footerText: "",
  headerColor: "#000000",
  logoDataUrl: null,
};

function isBrowser() {
  return typeof window !== "undefined";
}

function readStoredLogo(): string | null {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(LOGO_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredLogo(logoDataUrl: string | null): boolean {
  if (!isBrowser()) return false;
  try {
    if (logoDataUrl?.trim()) {
      localStorage.setItem(LOGO_STORAGE_KEY, logoDataUrl);
    } else {
      localStorage.removeItem(LOGO_STORAGE_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

export function loadPdfBrandSettings(): PdfBrandSettings {
  if (!isBrowser()) return { ...DEFAULT_PDF_BRAND };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw
      ? ({ ...DEFAULT_PDF_BRAND, ...(JSON.parse(raw) as PdfBrandSettings) })
      : { ...DEFAULT_PDF_BRAND };

    const dedicatedLogo = readStoredLogo();
    if (dedicatedLogo?.trim()) {
      parsed.logoDataUrl = dedicatedLogo;
    } else if (parsed.logoDataUrl?.trim()) {
      writeStoredLogo(parsed.logoDataUrl);
    }

    return parsed;
  } catch {
    const fallback = { ...DEFAULT_PDF_BRAND };
    const dedicatedLogo = readStoredLogo();
    if (dedicatedLogo?.trim()) fallback.logoDataUrl = dedicatedLogo;
    return fallback;
  }
}

export function savePdfBrandSettings(brand: PdfBrandSettings): boolean {
  if (!isBrowser()) return false;

  const { logoDataUrl, ...rest } = brand;
  const logo = logoDataUrl?.trim() ? logoDataUrl : null;

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...rest, logoDataUrl: null }),
    );
  } catch {
    return false;
  }

  return writeStoredLogo(logo);
}
