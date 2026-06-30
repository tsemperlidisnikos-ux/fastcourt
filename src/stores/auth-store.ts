"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AuthSession } from "@/types/auth";

interface AuthState {
  session: AuthSession | null;
  setSession: (session: AuthSession | null) => void;
  signOut: () => void;
}

type AuthPersistedState = Pick<AuthState, "session">;

const authStorage = createJSONStorage<AuthPersistedState>(() => {
  if (typeof window === "undefined") {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
  return localStorage;
});

export const useAuthStore = create<AuthState>()(
  persist<AuthState, [], [], AuthPersistedState>(
    (set, get) => ({
      session: null,
      setSession: (session) => {
        const prevUserId = get().session?.user?.id;
        const nextUserId = session?.user?.id;
        if (prevUserId && nextUserId && prevUserId !== nextUserId) {
          void import("@/stores/library-store").then(({ useLibraryStore }) => {
            useLibraryStore.setState({
              items: [],
              loading: true,
              hydrated: false,
              error: null,
            });
          });
        }
        set({ session });
      },
      signOut: () => set({ session: null }),
    }),
    {
      name: "fastcourt_session_v2",
      storage: authStorage,
      partialize: (state) => ({ session: state.session }),
      skipHydration: true,
    },
  ),
);
