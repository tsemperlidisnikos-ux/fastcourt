"use client";

import type { ComponentType } from "react";
import { DEFAULT_TRIAL_DAYS } from "@/lib/config";
import type { SignupStep } from "@/components/auth/signup-flow";
import { LOCAL_SIGNUP_STEPS } from "@/components/auth/signup-flow";
import type { SignupWizardValues } from "@/types/signup";

export type { SignupWizardValues };

interface Props {
  step: SignupStep;
  steps: SignupStep[];
  email: string;
  values: SignupWizardValues;
  onChange: <K extends keyof SignupWizardValues>(
    key: K,
    value: SignupWizardValues[K],
  ) => void;
  devCodeHint?: string | null;
  resendSeconds?: number;
  onResendCode?: () => void;
  PasswordField: ComponentType<{
    id: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    autoComplete: string;
    minLength?: number;
  }>;
}

function stepIndex(step: SignupStep, steps: SignupStep[]) {
  const flowSteps = steps?.length ? steps : LOCAL_SIGNUP_STEPS;
  return flowSteps.indexOf(step);
}

function CountrySelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      id={id}
      className="welcome-input welcome-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="GR">Greece</option>
      <option value="CY">Cyprus</option>
      <option value="US">United States</option>
      <option value="GB">United Kingdom</option>
      <option value="DE">Germany</option>
      <option value="FR">France</option>
      <option value="IT">Italy</option>
      <option value="ES">Spain</option>
      <option value="TR">Turkey</option>
      <option value="OTHER">Other</option>
    </select>
  );
}

export function SignupWizard({
  step,
  steps,
  email,
  values,
  onChange,
  devCodeHint,
  resendSeconds = 0,
  onResendCode,
  PasswordField,
}: Props) {
  const flowSteps = steps?.length ? steps : LOCAL_SIGNUP_STEPS;
  const activeIdx = stepIndex(step, flowSteps);

  return (
    <div className="welcome-signup-flow" id="welcome-signup-flow">
      <div
        className="welcome-signup-progress"
        id="welcome-signup-progress"
        aria-hidden="true"
      >
        {flowSteps.map((dotStep, idx) => {
          const done = idx < activeIdx;
          const active = dotStep === step;
          return (
            <span
              key={dotStep}
              className={`welcome-signup-dot${active ? " is-active" : ""}${done ? " is-done" : ""}`}
              data-step={dotStep}
            />
          );
        })}
      </div>

      {step === "basic" ? (
        <div className="welcome-signup-step-panel" id="welcome-signup-step-basic">
          <div className="welcome-field">
            <label htmlFor="auth-display-name">
              Full name <span className="welcome-required" aria-hidden="true">*</span>
            </label>
            <input
              id="auth-display-name"
              type="text"
              className="welcome-input"
              autoComplete="name"
              placeholder="Your full name"
              value={values.displayName}
              onChange={(e) => onChange("displayName", e.target.value)}
              required
            />
          </div>
          <div className="welcome-field">
            <label htmlFor="auth-signup-password">
              Password <span className="welcome-required" aria-hidden="true">*</span>
            </label>
            <PasswordField
              id="auth-signup-password"
              value={values.password}
              onChange={(v) => onChange("password", v)}
              placeholder="Create a password"
              autoComplete="new-password"
              minLength={8}
            />
            <p className="welcome-signup-password-note">
              8+ characters, 1 number, 1 uppercase, 1 symbol.
            </p>
          </div>
        </div>
      ) : null}

      {step === "verify" ? (
        <div className="welcome-signup-step-panel" id="welcome-signup-step-verify">
          <p className="welcome-signup-lead">We sent you a 6-digit code</p>
          <p className="welcome-signup-hint" id="welcome-verify-email-hint">
            Check <strong>{email.trim()}</strong> for your verification code.
          </p>
          <div className="welcome-field">
            <label htmlFor="auth-verify-code">Verification code</label>
            <input
              id="auth-verify-code"
              type="text"
              className="welcome-input welcome-code-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              pattern="[0-9]{6}"
              value={values.verifyCode}
              onChange={(e) =>
                onChange("verifyCode", e.target.value.replace(/\D/g, "").slice(0, 6))
              }
            />
          </div>
          {devCodeHint ? (
            <p className="welcome-signup-dev-code" id="welcome-signup-dev-code">
              {devCodeHint}
            </p>
          ) : null}
          <button
            type="button"
            className="welcome-link-btn welcome-resend-btn"
            id="btn-signup-resend-code"
            disabled={resendSeconds > 0 || !onResendCode}
            onClick={onResendCode}
          >
            {resendSeconds > 0 ? `Resend code (${resendSeconds}s)` : "Resend code"}
          </button>
        </div>
      ) : null}

      {step === "role" ? (
        <div className="welcome-signup-step-panel" id="welcome-signup-step-role">
          <p className="welcome-signup-lead">Choose your role</p>
          <div className="welcome-role-grid" role="radiogroup" aria-label="Role">
            <label className="welcome-role-card">
              <input
                type="radio"
                name="auth-signup-role"
                value="coach"
                checked={values.signupRole === "coach"}
                onChange={() => onChange("signupRole", "coach")}
              />
              <span className="welcome-role-card-inner">
                <strong>Coach</strong>
                <span>Individual coach — draw plays and manage your library</span>
              </span>
            </label>
            <label className="welcome-role-card">
              <input
                type="radio"
                name="auth-signup-role"
                value="team"
                checked={values.signupRole === "team"}
                onChange={() => onChange("signupRole", "team")}
              />
              <span className="welcome-role-card-inner">
                <strong>Team</strong>
                <span>Club or organization lead</span>
              </span>
            </label>
          </div>
        </div>
      ) : null}

      {step === "country" ? (
        <div className="welcome-signup-step-panel" id="welcome-signup-step-country">
          <p className="welcome-signup-lead">Country</p>
          <div className="welcome-field">
            <label htmlFor="auth-coach-country">Country</label>
            <CountrySelect
              id="auth-coach-country"
              value={values.teamCountry}
              onChange={(v) => onChange("teamCountry", v)}
            />
          </div>
        </div>
      ) : null}

      {step === "team" ? (
        <div className="welcome-signup-step-panel" id="welcome-signup-step-team">
          <p className="welcome-signup-lead">Team / organization</p>
          <div className="welcome-field">
            <label htmlFor="auth-organization">Team name</label>
            <input
              id="auth-organization"
              type="text"
              className="welcome-input"
              autoComplete="organization"
              placeholder="Club or team name"
              value={values.teamName}
              onChange={(e) => onChange("teamName", e.target.value)}
            />
          </div>
          <div className="welcome-field">
            <label htmlFor="auth-team-country">Country</label>
            <CountrySelect
              id="auth-team-country"
              value={values.teamCountry}
              onChange={(v) => onChange("teamCountry", v)}
            />
          </div>
          <div className="welcome-field">
            <label htmlFor="auth-team-level">Level</label>
            <select
              id="auth-team-level"
              className="welcome-input welcome-select"
              value={values.teamLevel}
              onChange={(e) => onChange("teamLevel", e.target.value)}
            >
              <option value="pro">Pro</option>
              <option value="semi_pro">Semi-Pro</option>
              <option value="amateur">Amateur</option>
              <option value="youth">Youth</option>
              <option value="academy">Academy</option>
              <option value="personal">Personal use</option>
            </select>
          </div>
        </div>
      ) : null}

      {step === "payment" ? (
        <div className="welcome-signup-step-panel" id="welcome-signup-step-payment">
          <p className="welcome-signup-lead">
            Subscription &amp; payment{" "}
            <span className="welcome-required" aria-hidden="true">*</span>
          </p>
          <p className="welcome-signup-hint">
            Start with a free trial — no card required today.
          </p>
          <div className="welcome-signup-payment" id="welcome-signup-payment-panel">
            <p className="welcome-signup-plan" id="welcome-signup-plan">
              {DEFAULT_TRIAL_DAYS} days Coach trial — full designer and library access.
            </p>
            <p className="welcome-signup-payment-note" id="welcome-signup-payment-note">
              You can add billing later from Settings. Includes 1 tablet per account.
            </p>
          </div>
        </div>
      ) : null}

      {step === "done" ? (
        <div
          className="welcome-signup-step-panel welcome-signup-done-panel"
          id="welcome-signup-step-done"
        >
          <div className="welcome-signup-done-icon" aria-hidden="true">
            ✓
          </div>
          <p className="welcome-signup-lead">Your FastCourt workspace is ready</p>
          <p className="welcome-signup-hint" id="welcome-signup-done-hint">
            {values.teamName.trim()
              ? `${values.teamName.trim()} is set up. Open your library to start drawing.`
              : "Open your library to start drawing plays."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
