import { APP_BUILD } from "@/lib/config";

export function swScriptUrl(): string {
  const build = encodeURIComponent(APP_BUILD);
  return `/sw.js?build=${build}`;
}

let pendingSwReload = false;

export async function registerServiceWorker(
  onUpdate: (registration: ServiceWorkerRegistration) => void,
): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(swScriptUrl(), {
      scope: "/",
      updateViaCache: "none",
    });

    if (registration.waiting) {
      onUpdate(registration);
    }

    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          onUpdate(registration);
        }
      });
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!pendingSwReload) return;
      window.location.reload();
    });

    return registration;
  } catch (err) {
    console.warn("[FastCourt] Service worker registration failed:", err);
    return null;
  }
}

export function activateWaitingWorker(
  registration: ServiceWorkerRegistration,
): void {
  pendingSwReload = true;
  registration.waiting?.postMessage({ type: "SKIP_WAITING" });
}
