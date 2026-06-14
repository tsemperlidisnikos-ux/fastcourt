export interface SignupWizardValues {
  displayName: string;
  password: string;
  verifyCode: string;
  signupRole: "coach" | "team";
  teamName: string;
  teamCountry: string;
  teamLevel: string;
}
