"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ADMIN_EMAIL, ROLES } from "@/lib/config";
import { useAppLogoSrc } from "@/hooks/useAppLogoSrc";
import { getAccessError } from "@/lib/auth/access";
import { friendlyAuthError } from "@/lib/auth/errors";
import { appNotice } from "@/stores/dialog-store";
import { isMasterAdminEmail } from "@/lib/auth/roles";
import {
  fetchProfile,
  localDemoSession,
  profileToAuthSession,
} from "@/lib/auth/profile";
import {
  sessionToAdminUser,
  upsertAdminUser,
} from "@/lib/auth/admin-users";
import { upsertProfileForUser } from "@/lib/auth/signup";
import {
  getPendingInvite,
  memberRoleLabel,
  type PendingTeamInvite,
} from "@/lib/auth/team-invite";
import { createClient, isCloudEnabled } from "@/lib/supabase/client";
import { WelcomeOAuthButtons } from "@/components/auth/WelcomeOAuthButtons";
import {
  SignupWizard,
  type SignupWizardValues,
} from "@/components/auth/SignupWizard";
import {
  defaultSignupValues,
  nextSignupStep,
  resolveSignupRoleChoice,
  signupSteps,
  signupSubmitLabel,
  signupSubtitle,
  validateSignupTeamStep,
  type SignupStep,
} from "@/components/auth/signup-flow";
import { useAuthStore } from "@/stores/auth-store";

type AuthMode = "login" | "signup";
type LoginStep = "email" | "password";

const TRIAL_DAYS = 14;
const DEVICE_FOOTNOTE = "Includes 1 tablet per account.";

function validateSignupPassword(password: string): string | null {
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
  value,
  onChange,
  placeholder,
  autoComplete,
  minLength,
}: {
  id: string;
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

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const appLogoSrc = useAppLogoSrc();

  const [mode, setMode] = useState<AuthMode>("login");
  const [loginStep, setLoginStep] = useState<LoginStep>("email");
  const [signupStep, setSignupStep] = useState<SignupStep>("basic");
  const [skipVerify, setSkipVerify] = useState(false);
  const [signupValues, setSignupValues] = useState<SignupWizardValues>(
    defaultSignupValues(),
  );
  const [resendSeconds, setResendSeconds] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [teamInvite, setTeamInvite] = useState<PendingTeamInvite | null>(null);
  const [emailInviteLocked, setEmailInviteLocked] = useState(false);

  const cloud = isCloudEnabled();
  const next = searchParams.get("next") || "/library";
  const urlError = searchParams.get("error");
  const displayError =
    error ??
    (urlError ? friendlyAuthError(decodeURIComponent(urlError)) : null);

  const steps = useMemo(
    () => signupSteps(cloud, skipVerify),
    [cloud, skipVerify],
  );

  const subtitle = useMemo(() => {
    if (mode === "login") {
      return "Welcome back — enter your email and password.";
    }
    return signupSubtitle(signupStep);
  }, [mode, signupStep]);

  const footnote = useMemo(() => {
    if (mode === "login") {
      return DEVICE_FOOTNOTE;
    }
    if (signupStep === "done") return "";
    const trialNote = cloud
      ? `${TRIAL_DAYS}-day free trial after sign up.`
      : `${TRIAL_DAYS}-day free trial on this device.`;
    return `${trialNote} ${DEVICE_FOOTNOTE}`;
  }, [mode, cloud, signupStep]);

  useEffect(() => {
    const invite = getPendingInvite();
    if (!invite?.email) return;
    setTeamInvite(invite);
    setEmail(invite.email);
    setEmailInviteLocked(true);
    setMode("signup");
    setSignupStep("basic");
  }, []);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => {
      setResendSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  function resetForm() {
    setLoginStep("email");
    setSignupStep("basic");
    setSkipVerify(false);
    setSignupValues(defaultSignupValues());
    setPassword("");
    setResendSeconds(0);
    setError(null);
    if (!teamInvite) {
      setEmailInviteLocked(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    resetForm();
  }

  function updateSignupValue<K extends keyof SignupWizardValues>(
    key: K,
    value: SignupWizardValues[K],
  ) {
    setSignupValues((prev) => ({ ...prev, [key]: value }));
  }

  function validateEmail(): string | null {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes("@")) {
      setError("Enter a valid email address.");
      return null;
    }
    setError(null);
    return normalized;
  }

  function advanceSignupStep() {
    const nextStep = nextSignupStep(steps, signupStep);
    if (nextStep) setSignupStep(nextStep);
  }

  async function openAppAfterSignup(normalized: string) {
    if (!cloud) {
      const session = localDemoSession(normalized, signupValues.displayName);
      const role = resolveSignupRoleChoice(normalized, signupValues.signupRole);
      session.user = { ...session.user, role };
      setSession(session);
      const record = sessionToAdminUser(session.user);
      record.organization = signupValues.teamName.trim() || undefined;
      upsertAdminUser(record);
      router.replace(next);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError("Cloud sign-in is not configured.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Session expired. Please sign in.");
      switchMode("login");
      return;
    }

    const role = resolveSignupRoleChoice(normalized, signupValues.signupRole);
    await supabase.auth.updateUser({
      data: {
        display_name: signupValues.displayName.trim(),
        signup_status: "active",
        signup_role: signupValues.signupRole,
        organization: signupValues.teamName.trim(),
        team_country: signupValues.teamCountry,
        team_level: signupValues.teamLevel,
        signup_payment_method: "trial",
      },
    });

    let profile = await fetchProfile(supabase, user.id);
    if (!profile) {
      profile = await upsertProfileForUser(
        supabase,
        user,
        signupValues.displayName,
      );
    }

    if (!profile) {
      setError("Account created but profile setup failed.");
      return;
    }

    const session = profileToAuthSession(profile);
    session.user = {
      ...session.user,
      role: isMasterAdminEmail(normalized) ? ROLES.admin : role,
    };
    const accessError = getAccessError(session.user);
    if (accessError) {
      await supabase.auth.signOut();
      setError(accessError);
      return;
    }

    setSession(session);
    router.replace(next);
  }

  async function submitSignupBasic(normalized: string) {
    if (!signupValues.displayName.trim()) {
      setError("Enter your full name.");
      return;
    }
    const passwordError = validateSignupPassword(signupValues.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (!cloud) {
      advanceSignupStep();
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) {
        setError("Cloud sign-in is not configured.");
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalized,
        password: signupValues.password,
        options: {
          data: {
            display_name: signupValues.displayName.trim(),
            signup_status: "pending_verification",
          },
        },
      });

      if (signUpError) {
        setError(friendlyAuthError(signUpError.message));
        return;
      }

      if (!data.user) {
        setError("Sign up failed.");
        return;
      }

      if (data.session) {
        setSkipVerify(true);
        setSignupStep("role");
        return;
      }

      setSkipVerify(false);
      setResendSeconds(30);
      setSignupStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed.");
    } finally {
      setLoading(false);
    }
  }

  async function submitSignupVerify(normalized: string) {
    const code = signupValues.verifyCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) {
        setError("Cloud sign-in is not configured.");
        return;
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: normalized,
        token: code,
        type: "signup",
      });

      if (verifyError) {
        setError(friendlyAuthError(verifyError.message));
        return;
      }

      setError(null);
      advanceSignupStep();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  async function resendSignupCode(normalized: string) {
    if (resendSeconds > 0) return;
    setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) return;
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: normalized,
      });
      if (resendError) {
        setError(friendlyAuthError(resendError.message));
        return;
      }
      setResendSeconds(30);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code.");
    } finally {
      setLoading(false);
    }
  }

  async function submitSignupPayment(normalized: string) {
    setLoading(true);
    try {
      if (!cloud) {
        setSignupStep("done");
        return;
      }

      const supabase = createClient();
      if (!supabase) {
        setError("Cloud sign-in is not configured.");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Session expired. Please start sign up again.");
        setSignupStep("basic");
        return;
      }

      await supabase.auth.updateUser({
        data: {
          signup_payment_method: "trial",
          signup_payment_interval: "trial",
        },
      });

      setSignupStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish signup.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes("@")) {
      setError("Enter your email on the previous step first.");
      setLoginStep("email");
      return;
    }
    if (!cloud) {
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
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/login")}`;
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

  async function submitLogin(normalized: string) {
    if (password.length < 4) {
      setError("Enter your password (min 4 characters).");
      return;
    }

    setLoading(true);
    try {
      if (!cloud) {
        const session = localDemoSession(normalized);
        setSession(session);
        router.replace(next);
        return;
      }

      const supabase = createClient();
      if (!supabase) {
        setError("Cloud sign-in is not configured.");
        return;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normalized,
        password,
      });

      if (authError) {
        setError(friendlyAuthError(authError.message));
        return;
      }

      if (!data.user) {
        setError("Login failed.");
        return;
      }

      const meta = data.user.user_metadata ?? {};
      const pendingVerification =
        meta.signup_status === "pending_verification" ||
        meta.email_verified === false;
      if (pendingVerification) {
        await supabase.auth.signOut();
        setError("Please verify your email before logging in.");
        return;
      }

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
      const accessError = getAccessError(session.user);
      if (accessError) {
        await supabase.auth.signOut();
        setError(accessError);
        return;
      }

      setSession(session);
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function onContinue(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "login") {
      const normalized = validateEmail();
      if (!normalized) return;

      if (loginStep === "email") {
        setLoginStep("password");
        return;
      }

      await submitLogin(normalized);
      return;
    }

    const normalized = validateEmail();
    if (!normalized) return;

    if (signupStep === "done") {
      setLoading(true);
      try {
        await openAppAfterSignup(normalized);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not open app.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (signupStep === "basic") {
      await submitSignupBasic(normalized);
      return;
    }

    if (signupStep === "verify") {
      await submitSignupVerify(normalized);
      return;
    }

    if (signupStep === "role") {
      advanceSignupStep();
      return;
    }

    if (signupStep === "team") {
      const teamError = validateSignupTeamStep(signupValues.teamName);
      if (teamError) {
        setError(teamError);
        return;
      }
      advanceSignupStep();
      return;
    }

    if (signupStep === "payment") {
      await submitSignupPayment(normalized);
    }
  }

  const showOAuth =
    (mode === "login" && loginStep === "email") ||
    (mode === "signup" && signupStep === "basic");

  const showEmailField =
    mode === "login"
      ? loginStep !== "password"
      : signupStep === "basic";

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
                {mode === "login" ? "Log In" : "Create Account"}
              </h2>
              {mode === "signup" && signupStep !== "done" ? (
                <span className="auth-trial-badge" id="auth-trial-badge">
                  {TRIAL_DAYS}-day trial
                </span>
              ) : null}
            </div>
            <p className="welcome-form-subtitle" id="auth-modal-subtitle">
              {subtitle}
            </p>
          </div>

          <div className="welcome-auth-body">
          {teamInvite ? (
            <div
              className="welcome-team-invite-banner"
              id="welcome-team-invite-banner"
            >
              <p className="welcome-team-invite-title" id="welcome-team-invite-title">
                Invitation — {teamInvite.organizationName || "Team"}
              </p>
              <p className="welcome-team-invite-text" id="welcome-team-invite-text">
                You&apos;ve been invited as {memberRoleLabel(teamInvite.memberRole)} for{" "}
                {teamInvite.organizationName || "your team"}.{" "}
                {mode === "login" ? "Log in" : "Sign up or log in"} with{" "}
                {teamInvite.email}.
              </p>
            </div>
          ) : null}
          <form className="welcome-auth-form" onSubmit={onContinue}>
            {showOAuth ? (
              <WelcomeOAuthButtons next={next} mode={mode} />
            ) : null}

            {mode === "login" && loginStep === "password" ? (
              <div className="welcome-field welcome-field-email-lock">
                <label>Email</label>
                <div className="welcome-email-lock-row">
                  <span className="welcome-email-lock-value">{email.trim()}</span>
                  <button
                    type="button"
                    className="welcome-link-btn welcome-email-edit-btn"
                    onClick={() => {
                      setLoginStep("email");
                      setPassword("");
                      setError(null);
                    }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            ) : showEmailField ? (
              <div className="welcome-field">
                <label htmlFor="auth-email">
                  Email <span className="welcome-required" aria-hidden="true">*</span>
                </label>
                <input
                  id="auth-email"
                  type="email"
                  className="welcome-input"
                  autoComplete="email"
                  placeholder="admin@fastcourt.eu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={emailInviteLocked}
                  required
                />
              </div>
            ) : null}

            {mode === "signup" ? (
              <SignupWizard
                step={signupStep}
                email={email}
                values={signupValues}
                onChange={updateSignupValue}
                resendSeconds={resendSeconds}
                onResendCode={
                  signupStep === "verify"
                    ? () => {
                        const normalized = email.trim().toLowerCase();
                        if (normalized) void resendSignupCode(normalized);
                      }
                    : undefined
                }
                PasswordField={PasswordField}
              />
            ) : null}

            {mode === "login" && loginStep === "password" ? (
              <div className="welcome-field">
                <label htmlFor="auth-password">
                  Password <span className="welcome-required" aria-hidden="true">*</span>
                </label>
                <PasswordField
                  id="auth-password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Your password"
                  autoComplete="current-password"
                  minLength={4}
                />
              </div>
            ) : null}

            {displayError ? (
              <div className="welcome-auth-error" id="auth-error" role="alert">
                {displayError}
              </div>
            ) : null}

            {mode === "login" && loginStep === "password" ? (
              <button
                type="button"
                className="welcome-link-btn welcome-forgot-link"
                id="btn-welcome-forgot-password"
                onClick={() => void handleForgotPassword()}
              >
                Forgot password?
              </button>
            ) : null}

            <button
              type="submit"
              className="welcome-continue-btn"
              id="confirm-auth"
              disabled={loading}
            >
              {loading ? (
                <span className="welcome-continue-spinner" aria-hidden="true" />
              ) : null}
              <span id="welcome-auth-submit-label">
                {mode === "login"
                  ? loading
                    ? "Signing in…"
                    : "Continue"
                  : signupSubmitLabel(signupStep, loading)}
              </span>
            </button>

            <p className="welcome-switch-line">
              <span id="auth-switch-label">
                {mode === "login"
                  ? "Don't have an account?"
                  : "Already have an account?"}
              </span>
              <button
                type="button"
                className="welcome-link-btn"
                id="auth-switch-mode"
                onClick={() => switchMode(mode === "login" ? "signup" : "login")}
              >
                {mode === "login" ? "Create Account" : "Sign in"}
              </button>
            </p>
          </form>
          </div>

          <p className="welcome-footnote" id="auth-footnote">
            {footnote}
          </p>

          <p className="welcome-support" id="welcome-support">
            <a
              href={`mailto:${ADMIN_EMAIL}`}
              className="welcome-support-link"
              id="welcome-support-link"
            >
              {ADMIN_EMAIL}
            </a>
          </p>
        </div>

        <p className="welcome-legal">
          By continuing, you agree to our{" "}
          <Link href="/privacy" className="welcome-link-btn" id="btn-welcome-privacy">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="welcome-link-btn" id="btn-welcome-terms">
            Terms of Service
          </Link>
        </p>
      </div>
    </div>
  );
}
