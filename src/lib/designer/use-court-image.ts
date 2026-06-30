"use client";

import { useEffect, useState } from "react";
import { courtImageUrl } from "@/lib/designer/court-assets";
import type { CourtType } from "@/types/designer";

interface CourtImageState {
  image: HTMLImageElement | null;
  failed: boolean;
  courtType: CourtType;
}

function scheduleStateUpdate(run: () => void) {
  queueMicrotask(run);
}

export function useCourtImage(courtType: CourtType) {
  const [state, setState] = useState<CourtImageState>({
    image: null,
    failed: false,
    courtType,
  });

  useEffect(() => {
    let active = true;
    const img = new window.Image();

    const commitLoaded = () => {
      if (!active) return;
      setState({ image: img, failed: false, courtType });
    };
    const commitFailed = () => {
      if (!active) return;
      setState({ image: null, failed: true, courtType });
    };

    img.onload = () => scheduleStateUpdate(commitLoaded);
    img.onerror = () => scheduleStateUpdate(commitFailed);
    img.crossOrigin = "anonymous";
    img.src = courtImageUrl(courtType);

    if (img.complete) {
      if (img.naturalWidth > 0) scheduleStateUpdate(commitLoaded);
      else scheduleStateUpdate(commitFailed);
    }

    return () => {
      active = false;
    };
  }, [courtType]);

  const pending = state.courtType !== courtType;
  return {
    image: pending ? null : state.image,
    failed: pending ? false : state.failed,
  };
}
