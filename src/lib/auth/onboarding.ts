const WELCOME_QUERY = "welcome";
const ONBOARDING_DISMISSED_KEY = "fastcourt_onboarding_dismissed";

export function buildPostSignupLibraryUrl(nextPath: string): string {
  const base = nextPath.trim() || "/library";
  const url = new URL(base, "http://local");
  url.searchParams.set(WELCOME_QUERY, "1");
  return `${url.pathname}${url.search}`;
}

export function shouldShowOnboarding(
  welcomeParam: string | null,
  dismissed: boolean,
): boolean {
  return welcomeParam === "1" && !dismissed;
}

export function isOnboardingDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "1";
}

export function dismissOnboardingForever() {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_DISMISSED_KEY, "1");
}

export function stripWelcomeFromPath(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  params.delete(WELCOME_QUERY);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
