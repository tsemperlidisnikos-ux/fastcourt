export function friendlyAuthError(msg: string) {
  const m = String(msg || "");
  if (/invalid login credentials/i.test(m)) {
    return "Incorrect email or password.";
  }
  if (/email not confirmed/i.test(m)) {
    return "Confirm your email before logging in.";
  }
  if (/already registered/i.test(m)) {
    return "An account with this email already exists.";
  }
  if (/provider is not enabled/i.test(m)) {
    return "This sign-in provider is not enabled yet in Supabase.";
  }
  if (/user cancelled|access_denied|popup closed/i.test(m)) {
    return "Sign-in was cancelled.";
  }
  return m || "Authentication failed.";
}
