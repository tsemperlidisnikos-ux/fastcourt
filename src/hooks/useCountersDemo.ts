"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCountersDemoStore } from "@/stores/counters-demo-store";

export const COUNTERS_DEMO_PARAM = "countersDemo";

export function useCountersDemo() {
  const open = useCountersDemoStore((s) => s.open);
  const openDemoStore = useCountersDemoStore((s) => s.openDemo);
  const closeDemoStore = useCountersDemoStore((s) => s.closeDemo);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get(COUNTERS_DEMO_PARAM) === "1") {
      openDemoStore();
    }
  }, [searchParams, openDemoStore]);

  const openDemo = useCallback(() => {
    openDemoStore();
    if (pathname.startsWith("/library")) {
      const params = new URLSearchParams(searchParams.toString());
      params.set(COUNTERS_DEMO_PARAM, "1");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [openDemoStore, pathname, router, searchParams]);

  const closeDemo = useCallback(() => {
    closeDemoStore();
    if (searchParams.get(COUNTERS_DEMO_PARAM) === "1") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(COUNTERS_DEMO_PARAM);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [closeDemoStore, pathname, router, searchParams]);

  return { open, openDemo, closeDemo };
}
