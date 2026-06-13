"use client";

import { useEffect, useState } from "react";
import { courtImageUrl } from "@/lib/designer/court-assets";
import type { CourtType } from "@/types/designer";

interface CourtImageState {
  image: HTMLImageElement | null;
  failed: boolean;
  courtType: CourtType;
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

    img.onload = () => {
      if (!active) return;
      setState({ image: img, failed: false, courtType });
    };
    img.onerror = () => {
      if (!active) return;
      setState({ image: null, failed: true, courtType });
    };
    img.src = courtImageUrl(courtType);

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
