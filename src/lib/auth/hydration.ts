import { useAuthStore } from "@/stores/auth-store";

export function subscribeAuthHydration(onChange: () => void) {
  const persist = useAuthStore.persist;
  if (!persist) {
    onChange();
    return () => {};
  }
  if (persist.hasHydrated()) {
    onChange();
  }
  return persist.onFinishHydration(onChange);
}

export function getAuthHydratedSnapshot() {
  return useAuthStore.persist?.hasHydrated() ?? true;
}
