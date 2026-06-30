import type { AppearanceSettings } from "@/types/appearance-settings";
import type { PdfBrandSettings } from "@/types/pdf-branding";
import type { PracticeLivePrefs } from "@/lib/practice/live-prefs";

export interface DesignerUserPrefs {
  defaultCourtZoom: number;
}

export interface NotificationPrefs {
  trialExpiryReminder: boolean;
  practiceSessionReminders: boolean;
}

export interface RegisteredDevice {
  id: string;
  label: string;
  lastSeenAt: string;
}

export interface UserSettingsBundle {
  appearance?: AppearanceSettings;
  pdfBrand?: PdfBrandSettings;
  practiceLive?: PracticeLivePrefs;
  designer?: DesignerUserPrefs;
  notifications?: NotificationPrefs;
  useOrgBranding?: boolean;
  devices?: RegisteredDevice[];
  cloudSyncedAt?: string | null;
}

export const DEFAULT_DESIGNER_PREFS: DesignerUserPrefs = {
  defaultCourtZoom: 90,
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  trialExpiryReminder: true,
  practiceSessionReminders: true,
};
