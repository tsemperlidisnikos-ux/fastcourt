/** Allow only same-origin relative app paths (blocks protocol-relative //evil). */
export function safeNextPath(next: string | null | undefined, fallback = "/library") {
  const value = (next ?? fallback).trim();
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\") || /[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}

/** Apply a validated next path onto a URL (preserves query string in `next`). */
export function applySafeNextPath(url: URL, next: string | null | undefined) {
  const safe = safeNextPath(next);
  const queryIndex = safe.indexOf("?");
  url.pathname = queryIndex >= 0 ? safe.slice(0, queryIndex) : safe;
  url.search = queryIndex >= 0 ? safe.slice(queryIndex) : "";
}

export const PASSWORD_RECOVERY_LOGIN_PATH = "/login?recovery=1";

export const LOGIN_SIGNED_OUT_PARAM = "signed_out";

export function isLoginSignedOut(
  searchParams: Pick<URLSearchParams, "get"> | null | undefined,
) {
  return searchParams?.get(LOGIN_SIGNED_OUT_PARAM) === "1";
}

export function loginSignedOutUrl(next?: string | null) {
  const url = new URL("/login", "http://local");
  url.searchParams.set(LOGIN_SIGNED_OUT_PARAM, "1");
  if (next) {
    url.searchParams.set("next", safeNextPath(next));
  }
  return `${url.pathname}${url.search}`;
}

export function isPasswordRecoveryLogin(
  pathname: string,
  recoveryParam: string | null | undefined,
) {
  return pathname === "/login" && recoveryParam === "1";
}
