"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppLogoSrc } from "@/hooks/useAppLogoSrc";
import { isCloudAuthEnabled, useCloudEnabled } from "@/hooks/useCloudEnabled";
import { getAccessError } from "@/lib/auth/access";
import { enforceDeviceAccessAsync } from "@/lib/auth/device-access";
import { friendlyAuthError } from "@/lib/auth/errors";
import { appNotice } from "@/stores/dialog-store";
import { useSettingsStore } from "@/stores/settings-store";
import {
  fetchProfile,
  localDemoSession,
  profileToAuthSession,
} from "@/lib/auth/profile";
import {
  isPasswordRecoveryLogin,
  safeNextPath,
} from "@/lib/auth/safe-next-path";
import { finalizeAuthSession } from "@/lib/auth/session-bootstrap";
import { upsertProfileForUser } from "@/lib/auth/signup";
import { ensureLibraryReadyForUser, prepareLibrarySessionForUser, resetLibraryOnSignOut } from "@/lib/cloud/library-sync";
import { activateLibraryScope } from "@/lib/library/library-scope";
import { createClient } from "@/lib/supabase/client";
import { WelcomeOAuthButtons } from "@/components/auth/WelcomeOAuthButtons";
import { useAuthStore } from "@/stores/auth-store";

type AuthMode = "login" | "signup";

const DEVICE_FOOTNOTE = "Includes 1 tablet per account.";

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter.";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include at least one symbol.";
  }
  return null;
}

function EyeIcon() {
  return (
    <svg className="welcome-eye-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
      />
    </svg>
  );
}

function PasswordField({
  id,
  name,
  value,
  onChange,
  placeholder,
  autoComplete,
  minLength,
}: {
  id: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="welcome-password-wrap">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        className="welcome-input"
        autoComplete={autoComplete}
        placeholder={placeholder}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
      <button
        type="button"
        className={`welcome-password-toggle${visible ? " is-visible" : ""}`}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
      >
        <EyeIcon />
      </button>
    </div>
  );
}

function decodeUrlErrorParam(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

interface LoginFormProps {
  /** Resolved on the server from ?signup=1 so SSR matches the first client render. */
  initialSignup?: boolean;
  /** Resolved on the server from ?recovery=1 so SSR matches the first client render. */
  initialRecovery?: boolean;
}

function resolveAuthMode(
  signupParam: string | null,
  initialSignup: boolean,
): AuthMode {
  if (signupParam != null) {
    return signupParam === "1" ? "signup" : "login";
  }
  return initialSignup ? "signup" : "login";
}

function resolveRecoveryMode(
  recoveryParam: string | null,
  initialRecovery: boolean,
): boolean {
  if (recoveryParam != null) {
    return isPasswordRecoveryLogin("/login", recoveryParam);
  }
  return initialRecovery;
}

export function LoginForm({
  initialSignup = false,
  initialRecovery = false,
}: LoginFormProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const signOut = useAuthStore((s) => s.signOut);
  const appLogoSrc = useAppLogoSrc();

  const signupParam = searchParams.get("signup");
  const recoveryParam = searchParams.get("recovery");
  const recoveryMode = resolveRecoveryMode(recoveryParam, initialRecovery);

  const [mode, setMode] = useState<AuthMode>(() =>
    resolveAuthMode(signupParam, initialSignup),
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signupEmailSent, setSignupEmailSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recoveryVerified, setRecoveryVerified] = useState<boolean | null>(() =>
    recoveryMode ? null : false,
  );

  const cloud = useCloudEnabled();
  const next = safeNextPath(searchParams.get("next"));
  const urlError = searchParams.get("error");
  const displayError =
    error ??
    (urlError ? friendlyAuthError(decodeUrlErrorParam(urlError)) : null);

  const subtitle = useMemo(() => {
    if (recoveryMode) {
      if (recoveryVerified === null) return "Checking your reset link…";
      if (recoveryVerified === false) {
        return "Request a new password reset link to continue.";
      }
      return email.trim()
        ? `Choose a new password for ${email.trim()}.`
        : "Choose a new password for your account.";
    }
    if (mode === "login") {
      return "Welcome back — enter your email and password.";
    }
    if (signupEmailSent) {
      return `Check your inbox at ${signupEmailSent} and confirm your email to finish creating your account.`;
    }
    return "Start your free trial — enter your email and choose a password.";
  }, [recoveryMode, recoveryVerified, email, mode, signupEmailSent]);

  useEffect(() => {
    if (recoveryMode) return;
    const nextMode = resolveAuthMode(searchParams.get("signup"), initialSignup);
    setMode(nextMode);
    if (nextMode === "login") {
      setSignupEmailSent(null);
    }
  }, [initialSignup, recoveryMode, searchParams]);

  useEffect(() => {
    if (!recoveryMode || !cloud) {
      if (recoveryMode && !cloud) {
        setRecoveryVerified(false);
        setError("Password reset requires cloud sign-in.");
      }
      return;
    }

    const client = createClient();
    if (!client) {
      setRecoveryVerified(false);
      setError("Cloud sign-in is not configured.");
      return;
    }
    const authClient = client;

    let active = true;

    async function verifyRecoverySession() {
      const {
        data: { user },
      } = await authClient.auth.getUser();
      if (!active) return;
      if (user?.email) {
        setEmail(user.email);
        setRecoveryVerified(true);
        setError(null);
        return;
      }
      setRecoveryVerified(false);
      setError("This password reset link has expired or is invalid. Request a new one.");
    }

    void verifyRecoverySession();

    const {
      data: { subscription },
    } = authClient.auth.onAuthStateChange((event, authSession) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" && authSession?.user?.email) {
        setEmail(authSession.user.email);
        setRecoveryVerified(true);
        setError(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [recoveryMode, cloud]);

  async function completeAuthSession(
    session: ReturnType<typeof profileToAuthSession>,
    redirectTo?: string,
  ): Promise<string | null> {
    const finalized = finalizeAuthSession(session);
    const accessError = getAccessError(finalized.session.user);
    if (accessError) return accessError;

    setSession(finalized.session);

    if (!finalized.session.cloud) {
      try {
        await prepareLibrarySessionForUser(finalized.session.user, null);
      } catch (err) {
        console.error("FastCourt local library prepare failed:", err);
        activateLibraryScope(
          finalized.session.user.id,
          finalized.session.user.id,
          finalized.session.user,
        );
      }
    }

    const destination = redirectTo ?? next;
    if (finalized.session.cloud) {
      window.location.assign(destination);
    } else {
      router.replace(destination);
    }

    void (async () => {
      const deviceError = await enforceDeviceAccessAsync(finalized.session.user);
      if (deviceError) {
        signOut();
        const supabase = createClient();
        if (supabase) await supabase.auth.signOut();
        router.replace(`/login?error=${encodeURIComponent(deviceError)}`);
        return;
      }

      if (finalized.session.cloud) {
        const supabase = createClient();
        if (!supabase) return;
        try {
          await prepareLibrarySessionForUser(finalized.session.user, supabase);
          void ensureLibraryReadyForUser(finalized.session.user, supabase);
        } catch (err) {
          console.error("FastCourt library prepare failed:", err);
        }
      }

      try {
        await useSettingsStore.getState().hydrateForUser(finalized.session.user);
      } catch (err) {
        console.error("FastCourt settings hydrate failed:", err);
      }
    })();

    return null;
  }

  function validateEmail(raw?: string): string | null {
    const normalized = (raw ?? email).trim().toLowerCase();
    if (!normalized || !normalized.includes("@")) {
      setError("Enter a valid email address.");
      return null;
    }
    setError(null);
    return normalized;
  }

  async function handleForgotPassword() {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes("@")) {
      setError("Enter your email address first.");
      return;
    }
    if (!isCloudAuthEnabled()) {
      appNotice(
        "Password reset",
        "Password reset is available in cloud mode. Contact your club administrator on this device.",
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      if (!supabase) {
        setError("Cloud sign-in is not configured.");
        return;
      }
      const redirectTo = `${window.location.origin}/auth/confirm?recovery=1`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        normalized,
        { redirectTo },
      );
      if (resetError) {
        setError(friendlyAuthError(resetError.message));
        return;
      }
      appNotice(
        "Password reset",
        `If an account exists for ${normalized}, a password reset link has been sent.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  }

  async function submitPasswordRecovery() {
    if (recoveryVerified !== true) {
      setError("This password reset link has expired or is invalid. Request a new one.");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      if (!supabase) {
        setError("Cloud sign-in is not configured.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(friendlyAuthError(updateError.message));
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Session expired. Request a new reset link.");
        return;
      }

      let profile = await fetchProfile(supabase, user.id);
      if (!profile) {
        profile = await upsertProfileForUser(supabase, user);
      }
      if (!profile) {
        setError("Account profile not found.");
        return;
      }

      const session = profileToAuthSession(profile);
      const accessError = await completeAuthSession(session);
      if (accessError) {
        await supabase.auth.signOut();
        setError(accessError);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setLoading(false);
    }
  }

  async function submitLogin(normalized: string, passwordValue: string) {
    if (passwordValue.length < 4) {
      setError("Enter your password (min 4 characters).");
      return;
    }

    setLoading(true);
    setStatus("Signing in…");
    let redirecting = false;
    try {
      if (!isCloudAuthEnabled()) {
        const session = localDemoSession(normalized);
        const accessError = await completeAuthSession(session);
        if (accessError) setError(accessError);
        else redirecting = true;
        return;
      }

      const supabase = createClient();
      if (!supabase) {
        setError("Cloud sign-in is not configured.");
        return;
      }

      const previousUserId = useAuthStore.getState().session?.user?.id;
      if (previousUserId) {
        await resetLibraryOnSignOut();
      }

      setStatus("Connecting to Supabase…");
      const signInResult = await Promise.race([
        supabase.auth.signInWithPassword({
          email: normalized,
          password: passwordValue,
        }),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => {
            reject(
              new Error(
                "Sign-in timed out. Check your internet connection and Supabase settings.",
              ),
            );
          }, 30_000);
        }),
      ]);

      const { data, error: authError } = signInResult;

      if (authError) {
        setError(friendlyAuthError(authError.message));
        return;
      }

      if (!data.user) {
        setError("Login failed.");
        return;
      }

      setStatus("Loading your profile…");
      let profile = await fetchProfile(supabase, data.user.id);
      if (!profile) {
        profile = await upsertProfileForUser(supabase, data.user);
      }
      if (!profile) {
        await supabase.auth.signOut();
        setError("Account profile not found.");
        return;
      }

      const session = profileToAuthSession(profile);
      const accessError = await completeAuthSession(session);
      if (accessError) {
        await supabase.auth.signOut();
        setError(accessError);
        return;
      }
      redirecting = true;
      setStatus("Opening library…");
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : "Authentication failed."));
    } finally {
      if (!redirecting) {
        setLoading(false);
        setStatus(null);
      }
    }
  }

  async function submitSignup(normalized: string) {
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (!isCloudAuthEnabled()) {
        const session = localDemoSession(normalized);
        const accessError = await completeAuthSession(session);
        if (accessError) setError(accessError);
        return;
      }

      const supabase = createClient();
      if (!supabase) {
        setError("Cloud sign-in is not configured.");
        return;
      }

      const redirectTo = `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`;
      const { data, error: authError } = await supabase.auth.signUp({
        email: normalized,
        password,
        options: { emailRedirectTo: redirectTo },
      });

      if (authError) {
        setError(friendlyAuthError(authError.message));
        return;
      }

      if (data.session && data.user) {
        let profile = await fetchProfile(supabase, data.user.id);
        if (!profile) {
          profile = await upsertProfileForUser(supabase, data.user);
        }
        if (!profile) {
          await supabase.auth.signOut();
          setError("Account profile not found.");
          return;
        }

        const session = profileToAuthSession(profile);
        const accessError = await completeAuthSession(session);
        if (accessError) {
          await supabase.auth.signOut();
          setError(accessError);
        }
        return;
      }

      setSignupEmailSent(normalized);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        friendlyAuthError(err instanceof Error ? err.message : "Sign up failed."),
      );
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setStatus(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const emailInput = String(formData.get("email") ?? "").trim();
    const passwordInput = String(formData.get("password") ?? "");
    const confirmInput = String(formData.get("confirm-password") ?? "");

    if (emailInput && emailInput !== email) setEmail(emailInput);
    if (passwordInput && passwordInput !== password) setPassword(passwordInput);
    if (confirmInput && confirmInput !== confirmPassword) setConfirmPassword(confirmInput);

    if (recoveryMode) {
      await submitPasswordRecovery();
      return;
    }

    if (mode === "signup") {
      if (signupEmailSent) return;
      const normalized = validateEmail(emailInput);
      if (!normalized) return;
      await submitSignup(normalized);
      return;
    }

    const normalized = validateEmail(emailInput);
    if (!normalized) return;
    await submitLogin(normalized, passwordInput || password);
  }

  const submitLabel = loading
    ? "Please wait…"
    : recoveryMode
      ? "Save password"
      : mode === "login"
        ? "Log in"
        : signupEmailSent
          ? "Email sent"
          : "Create account";

  return (
    <div className="welcome-screen" id="screen-welcome">
      <div className="welcome-page">
        <div className="welcome-inner welcome-card">
          <div className="welcome-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={appLogoSrc}
              alt="FastCourt"
              className="welcome-logo"
              width={245}
              height={245}
              decoding="async"
            />
            <h1 className="welcome-title visually-hidden">FastCourt</h1>
          </div>

          <div className="welcome-auth-head">
            <div className="welcome-auth-heading">
              <h2 className="welcome-form-title" id="auth-modal-title">
                {recoveryMode
                  ? "Set New Password"
                  : mode === "login"
                    ? "Log In"
                    : "Create Account"}
              </h2>
            </div>
            <p className="welcome-form-subtitle" id="auth-modal-subtitle">
              {subtitle}
            </p>
          </div>

          <div className="welcome-auth-body">
            <form
              className="welcome-auth-form"
              noValidate
              onSubmit={(e) => {
                void onSubmit(e).catch((err) => {
                  setError(
                    err instanceof Error ? err.message : "Something went wrong.",
                  );
                });
              }}
            >
              {recoveryMode ? (
                recoveryVerified === null ? (
                  <p className="welcome-form-subtitle" style={{ margin: 0 }}>
                    Checking your reset link…
                  </p>
                ) : (
                  <>
                    {recoveryVerified ? (
                      <div className="welcome-field welcome-field-email-lock">
                        <label>Email</label>
                        <div className="welcome-email-lock-row">
                          <span className="welcome-email-lock-value">{email.trim()}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="welcome-field">
                        <label htmlFor="auth-email">
                          Email <span className="welcome-required" aria-hidden="true">*</span>
                        </label>
                        <input
                          id="auth-email"
                          name="email"
                          type="email"
                          className="welcome-input"
                          autoComplete="email"
                          placeholder="admin@fastcourt.eu"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="welcome-link-btn welcome-resend-btn"
                          onClick={() => void handleForgotPassword()}
                          disabled={loading}
                        >
                          Send reset link
                        </button>
                      </div>
                    )}

                    {recoveryVerified ? (
                      <>
                        <div className="welcome-field">
                          <label htmlFor="auth-password">
                            New password{" "}
                            <span className="welcome-required" aria-hidden="true">*</span>
                          </label>
                          <PasswordField
                            id="auth-password"
                            name="password"
                            value={password}
                            onChange={setPassword}
                            placeholder="New password"
                            autoComplete="new-password"
                            minLength={8}
                          />
                        </div>
                        <div className="welcome-field">
                          <label htmlFor="auth-confirm-password">
                            Confirm password{" "}
                            <span className="welcome-required" aria-hidden="true">*</span>
                          </label>
                          <PasswordField
                            id="auth-confirm-password"
                            name="confirm-password"
                            value={confirmPassword}
                            onChange={setConfirmPassword}
                            placeholder="Confirm new password"
                            autoComplete="new-password"
                            minLength={8}
                          />
                        </div>
                      </>
                    ) : null}
                  </>
                )
              ) : mode === "login" ? (
                <>
                  {cloud ? <WelcomeOAuthButtons next={next} mode="login" /> : null}
                  <div className="welcome-field">
                    <label htmlFor="auth-email">
                      Email <span className="welcome-required" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="auth-email"
                      name="email"
                      type="email"
                      className="welcome-input"
                      autoComplete="email"
                      placeholder="admin@fastcourt.eu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="welcome-field">
                    <label htmlFor="auth-password">
                      Password <span className="welcome-required" aria-hidden="true">*</span>
                    </label>
                    <PasswordField
                      id="auth-password"
                      name="password"
                      value={password}
                      onChange={setPassword}
                      placeholder="Your password"
                      autoComplete="current-password"
                      minLength={4}
                    />
                  </div>
                  {cloud ? (
                    <button
                      type="button"
                      className="welcome-link-btn welcome-forgot-btn"
                      onClick={() => void handleForgotPassword()}
                      disabled={loading}
                    >
                      Forgot password?
                    </button>
                  ) : null}
                </>
              ) : signupEmailSent ? (
                <div className="welcome-signup-step-panel" id="welcome-signup-verify-email">
                  <p className="welcome-signup-lead">Confirm your email</p>
                  <p className="welcome-signup-hint">
                    We sent a confirmation link to <strong>{signupEmailSent}</strong>. Open it
                    to activate your account, then log in here.
                  </p>
                  <button
                    type="button"
                    className="welcome-link-btn"
                    onClick={() => {
                      setSignupEmailSent(null);
                      setMode("login");
                      setError(null);
                    }}
                  >
                    Back to log in
                  </button>
                </div>
              ) : (
                <>
                  {cloud ? <WelcomeOAuthButtons next={next} mode="signup" /> : null}
                  <div className="welcome-field">
                    <label htmlFor="auth-email">
                      Email <span className="welcome-required" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="auth-email"
                      name="email"
                      type="email"
                      className="welcome-input"
                      autoComplete="email"
                      placeholder="coach@club.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="welcome-field">
                    <label htmlFor="auth-password">
                      Password <span className="welcome-required" aria-hidden="true">*</span>
                    </label>
                    <PasswordField
                      id="auth-password"
                      name="password"
                      value={password}
                      onChange={setPassword}
                      placeholder="Create a password"
                      autoComplete="new-password"
                      minLength={8}
                    />
                    <p className="welcome-signup-password-note">
                      At least 8 characters with a number, uppercase letter, and symbol.
                    </p>
                  </div>
                  <div className="welcome-field">
                    <label htmlFor="auth-confirm-password">
                      Confirm password{" "}
                      <span className="welcome-required" aria-hidden="true">*</span>
                    </label>
                    <PasswordField
                      id="auth-confirm-password"
                      name="confirm-password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      minLength={8}
                    />
                  </div>
                </>
              )}

              {displayError ? (
                <p className="welcome-auth-error" role="alert">
                  {displayError}
                </p>
              ) : null}

              {status && loading ? (
                <p className="welcome-form-subtitle" role="status" style={{ margin: 0 }}>
                  {status}
                </p>
              ) : null}

              {mode === "login" || recoveryMode || (mode === "signup" && !signupEmailSent) ? (
                <button
                  type="submit"
                  className="welcome-submit-btn"
                  id="btn-auth-continue"
                  disabled={loading || (recoveryMode && recoveryVerified === null)}
                >
                  {submitLabel}
                </button>
              ) : null}
            </form>

            {!recoveryMode ? (
              <p className="welcome-switch-mode">
                {mode === "login" ? (
                  <>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      className="welcome-link-btn"
                      onClick={() => {
                        setError(null);
                        setSignupEmailSent(null);
                        setMode("signup");
                      }}
                    >
                      Create Account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="welcome-link-btn"
                      onClick={() => {
                        setError(null);
                        setSignupEmailSent(null);
                        setMode("login");
                      }}
                    >
                      Log in
                    </button>
                  </>
                )}
              </p>
            ) : null}

            {!recoveryMode && mode === "login" ? (
              <p className="welcome-footnote">{DEVICE_FOOTNOTE}</p>
            ) : null}
            {!recoveryMode && mode === "signup" && !signupEmailSent ? (
              <p className="welcome-footnote">{DEVICE_FOOTNOTE}</p>
            ) : null}
          </div>

          <p className="welcome-legal">
            <Link href="/privacy">Privacy</Link>
            <span aria-hidden="true"> · </span>
            <Link href="/terms">Terms</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
