import { useAuthStore } from "@/stores/auth-store";

export function kickAuthRehydrate() {
  const persist = useAuthStore.persist;
  if (!persist || persist.hasHydrated()) return;
  void persist.rehydrate()?.catch((err) => {
    console.error("FastCourt auth rehydrate failed:", err);
  });
}

/** Wait for persisted session before cloud bootstrap (avoids false sign-out after login). */
export async function awaitAuthRehydrate() {
  const persist = useAuthStore.persist;
  if (!persist || persist.hasHydrated()) return;
  try {
    await persist.rehydrate();
  } catch (err) {
    console.error("FastCourt auth rehydrate failed:", err);
  }
}

export function subscribeAuthHydration(onChange: () => void) {
  const persist = useAuthStore.persist;
  if (!persist) {
    onChange();
    return () => {};
  }
  kickAuthRehydrate();
  if (persist.hasHydrated() || useAuthStore.getState().session) {
    onChange();
  }
  return persist.onFinishHydration(onChange);
}

export function getAuthHydratedSnapshot() {
  const persist = useAuthStore.persist;
  if (!persist) return true;
  if (persist.hasHydrated()) return true;
  // Session set in-memory after login before persist finishes rehydrating.
  return useAuthStore.getState().session !== null;
}
