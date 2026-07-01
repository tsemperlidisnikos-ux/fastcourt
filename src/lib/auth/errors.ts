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
  if (/pkce|code verifier/i.test(m)) {
    return "Open the email link in the same browser where you signed up, or log in with your password. If you already confirmed, use Log in.";
  }
  if (/failed to fetch|networkerror|network error/i.test(m)) {
    return "Cannot reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL in .env (must be https://YOUR_REF.supabase.co) and your internet connection.";
  }
  return m || "Authentication failed.";
}
