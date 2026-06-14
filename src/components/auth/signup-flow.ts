import { ROLES } from "@/lib/config";
import type { SignupWizardValues } from "@/types/signup";

export type SignupStep =
  | "basic"
  | "verify"
  | "role"
  | "team"
  | "payment"
  | "done";

export const LOCAL_SIGNUP_STEPS: SignupStep[] = [
  "basic",
  "role",
  "team",
  "payment",
  "done",
];

export const CLOUD_SIGNUP_STEPS: SignupStep[] = [
  "basic",
  "verify",
  "role",
  "team",
  "payment",
  "done",
];

export function signupSteps(cloud: boolean, skipVerify: boolean): SignupStep[] {
  if (!cloud) return LOCAL_SIGNUP_STEPS;
  if (skipVerify) {
    return CLOUD_SIGNUP_STEPS.filter((s) => s !== "verify");
  }
  return CLOUD_SIGNUP_STEPS;
}

export function nextSignupStep(
  steps: SignupStep[],
  current: SignupStep,
): SignupStep | null {
  const idx = steps.indexOf(current);
  if (idx < 0 || idx >= steps.length - 1) return null;
  return steps[idx + 1];
}

export function signupSubtitle(step: SignupStep): string {
  switch (step) {
    case "basic":
      return "Step 1 — enter your email, name, and password.";
    case "verify":
      return "Step 2 — verify your email with the 6-digit code.";
    case "role":
      return "Choose how you'll use FastCourt.";
    case "team":
      return "Tell us about your team or organization.";
    case "payment":
      return "Confirm your trial plan.";
    case "done":
      return "You're all set.";
    default:
      return "";
  }
}

export function signupSubmitLabel(
  step: SignupStep,
  loading: boolean,
): string {
  if (loading) {
    switch (step) {
      case "basic":
        return "Please wait…";
      case "verify":
        return "Verifying…";
      case "payment":
        return "Finishing…";
      case "done":
        return "Opening…";
      default:
        return "Please wait…";
    }
  }
  if (step === "done") return "Open FastCourt";
  return "Continue";
}

export function defaultSignupValues(): SignupWizardValues {
  return {
    displayName: "",
    password: "",
    verifyCode: "",
    signupRole: "coach",
    teamName: "",
    teamCountry: "GR",
    teamLevel: "amateur",
  };
}

export function resolveSignupRoleChoice(
  email: string,
  signupRole: "coach" | "team",
) {
  if (signupRole === "team") return ROLES.teamAdmin;
  return ROLES.coach;
}

export function validateSignupTeamStep(teamName: string): string | null {
  if (!teamName.trim()) {
    return "Enter your team or organization name.";
  }
  return null;
}
