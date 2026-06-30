"use client";

import { useEffect, useState } from "react";
import { isCloudEnabled } from "@/lib/supabase/client";

/** Defer cloud detection until after mount to avoid SSR hydration mismatches. */
export function useCloudEnabled() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isCloudEnabled());
  }, []);

  return enabled;
}
