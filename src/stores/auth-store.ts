"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AuthSession } from "@/types/auth";

interface AuthState {
  session: AuthSession | null;
  setSession: (session: AuthSession | null) => void;
  signOut: () => void;
}

const authStorage = createJSONStorage<AuthState>(() => {
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
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      signOut: () => set({ session: null }),
    }),
    {
      name: "fastcourt_session_v2",
      storage: authStorage,
    },
  ),
);
