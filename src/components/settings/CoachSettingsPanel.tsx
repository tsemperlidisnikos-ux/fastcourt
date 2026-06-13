"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { APP_BUILD, APP_NAME } from "@/lib/config";
import { formatExpiryLabel } from "@/lib/auth/admin-users";
import { hasFullAccess } from "@/lib/auth/roles";
import { SubscriptionSection } from "@/components/billing/SubscriptionSection";
import { AccountSystemSection } from "@/components/settings/AccountSystemSection";
import { PdfBrandingSection } from "@/components/settings/PdfBrandingSection";
import { ToolsSection } from "@/components/settings/ToolsSection";
import { useSettingsStore } from "@/stores/settings-store";
import { appConfirm } from "@/stores/dialog-store";
import type { AuthSession } from "@/types/auth";
import type { PdfBrandSettings } from "@/types/pdf-branding";
import "@/styles/admin-settings.css";
import "@/styles/billing-ui.css";

export function CoachSettingsPanel({ session }: { session: AuthSession }) {
  const router = useRouter();
  const pdfBrand = useSettingsStore((s) => s.pdfBrand);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const setPdfBrand = useSettingsStore((s) => s.setPdfBrand);
  const persistAll = useSettingsStore((s) => s.persistAll);

  const [draftBrand, setDraftBrand] = useState<PdfBrandSettings>(pdfBrand);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (hydrated && !dirty) {
      setDraftBrand(pdfBrand);
    }
  }, [hydrated, pdfBrand, dirty]);

  const accessLabel = useMemo(() => {
    if (hasFullAccess(session.user)) return "Unlimited access";
    if (!session.user.expiresAt) return "Trial active";
    return `Access until ${formatExpiryLabel(session.user.expiresAt)}`;
  }, [session.user]);

  function handleApply() {
    setPdfBrand(draftBrand, true);
    persistAll();
    setDirty(false);
  }

  async function handleClose() {
    if (
      dirty &&
      !(await appConfirm({
        title: "Discard changes",
        message: "Discard unsaved changes?",
        confirmLabel: "Discard",
        danger: true,
      }))
    ) {
      return;
    }
    router.push("/library");
  }

  return (
    <div className="fc-admin-settings fc-coach-settings org-settings-overlay">
      <div className="org-settings-box">
        <div className="org-settings-title">Settings</div>

        <div className="org-settings-body">
          <div className="org-settings-user-card">
            <strong>{session.user.displayName}</strong>
            <span>{session.user.email}</span>
          </div>

          <div className="org-settings-access-card">
            <div className="org-settings-sublabel">Access</div>
            <p>{accessLabel}</p>
          </div>

          <SubscriptionSection user={session.user} />

          <div className="org-settings-coach-split">
            <PdfBrandingSection
              brand={draftBrand}
              onChange={(next) => {
                setDraftBrand(next);
                setDirty(true);
              }}
              onLogoChange={(next) => {
                setDraftBrand(next);
                const saved = setPdfBrand(next, true);
                if (!saved) return false;
                return true;
              }}
            />
            <ToolsSection />
          </div>

          <AccountSystemSection session={session} />
        </div>

        <div className="org-settings-footer">
          <div className="org-settings-footer-left">
            <span className="org-settings-build">
              {APP_NAME} {APP_BUILD}
            </span>
          </div>
          <div className="org-settings-footer-actions">
            {dirty ? (
              <span className="org-settings-dirty-hint">Unsaved changes</span>
            ) : null}
            <button
              type="button"
              className={`org-settings-apply${dirty ? " has-unsaved-changes" : ""}`}
              onClick={handleApply}
            >
              Apply
            </button>
            <button type="button" className="org-settings-close" onClick={handleClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
