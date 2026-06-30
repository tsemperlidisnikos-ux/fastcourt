"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { APP_NAME } from "@/lib/config";
import {
  dismissBanner,
  isDismissed,
  isIosSafari,
  isStandaloneDisplay,
  PWA_INSTALL_DISMISS_KEY,
  PWA_IOS_HINT_DISMISS_KEY,
} from "@/lib/pwa/environment";
import {
  activateWaitingWorker,
  registerServiceWorker,
} from "@/lib/pwa/register-sw";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const INSTALL_ROUTES = new Set(["/library", "/designer", "/login", "/"]);

function useInstallPromptEligible(pathname: string | null) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay()) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  useEffect(() => {
    if (isStandaloneDisplay()) {
      setShowIosHint(false);
      return;
    }
    if (!pathname || !INSTALL_ROUTES.has(pathname)) {
      setShowIosHint(false);
      return;
    }
    setShowIosHint(
      isIosSafari() && !isDismissed(PWA_IOS_HINT_DISMISS_KEY),
    );
  }, [pathname]);

  const showAndroidInstall =
    !!deferred &&
    !isStandaloneDisplay() &&
    !!pathname &&
    INSTALL_ROUTES.has(pathname) &&
    !isDismissed(PWA_INSTALL_DISMISS_KEY);

  return { deferred, showAndroidInstall, showIosHint, setShowIosHint };
}

export function PwaBootstrap() {
  const pathname = usePathname();
  const [waitingRegistration, setWaitingRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [installHidden, setInstallHidden] = useState(false);
  const { deferred, showAndroidInstall, showIosHint, setShowIosHint } =
    useInstallPromptEligible(pathname);

  const showInstall =
    showAndroidInstall && !installHidden;

  useEffect(() => {
    void registerServiceWorker((registration) => {
      setWaitingRegistration(registration);
    });
  }, []);

  const onInstall = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismissBanner(PWA_INSTALL_DISMISS_KEY);
    setInstallHidden(true);
  }, [deferred]);

  const onDismissInstall = useCallback(() => {
    dismissBanner(PWA_INSTALL_DISMISS_KEY);
    setInstallHidden(true);
  }, []);

  const onDismissIos = useCallback(() => {
    dismissBanner(PWA_IOS_HINT_DISMISS_KEY);
    setShowIosHint(false);
  }, [setShowIosHint]);

  const onReloadUpdate = useCallback(() => {
    if (waitingRegistration) {
      activateWaitingWorker(waitingRegistration);
      return;
    }
    window.location.reload();
  }, [waitingRegistration]);

  return (
    <>
      {waitingRegistration ? (
        <div className="fc-pwa-banner fc-pwa-banner-update" role="status">
          <p>A new version of {APP_NAME} is ready.</p>
          <div className="fc-pwa-banner-actions">
            <button type="button" className="fc-pwa-banner-primary" onClick={onReloadUpdate}>
              Reload
            </button>
          </div>
        </div>
      ) : null}

      {showInstall ? (
        <div className="fc-pwa-banner fc-pwa-banner-install" role="dialog" aria-label="Install app">
          <p>Install {APP_NAME} on this device for quick access from your home screen.</p>
          <div className="fc-pwa-banner-actions">
            <button type="button" className="fc-pwa-banner-primary" onClick={() => void onInstall()}>
              Install
            </button>
            <button type="button" className="fc-pwa-banner-ghost" onClick={onDismissInstall}>
              Not now
            </button>
          </div>
        </div>
      ) : null}

      {showIosHint ? (
        <div className="fc-pwa-banner fc-pwa-banner-ios" role="dialog" aria-label="Add to Home Screen">
          <p>
            Install {APP_NAME}: tap <strong>Share</strong> then{" "}
            <strong>Add to Home Screen</strong>.
          </p>
          <div className="fc-pwa-banner-actions">
            <button type="button" className="fc-pwa-banner-ghost" onClick={onDismissIos}>
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
