"use client";

import { useEffect, useState } from "react";
import { fetchFilmAnalyzeStatus } from "@/lib/film-room/film-clip-analyze-client";

export function useAiAssistantStatus() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [model, setModel] = useState("gpt-4o-mini");

  useEffect(() => {
    let active = true;
    void fetchFilmAnalyzeStatus().then((status) => {
      if (!active) return;
      setConfigured(status.configured);
      setModel(status.model);
    });
    return () => {
      active = false;
    };
  }, []);

  return {
    configured,
    model,
    loading: configured === null,
  };
}
