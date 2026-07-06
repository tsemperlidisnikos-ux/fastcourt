"use client";

import { CountersDemoOverlay } from "@/components/demo/CountersDemoOverlay";
import { useCountersDemo } from "@/hooks/useCountersDemo";
import "@/styles/fc-counters-demo.css";

export function CountersDemoHost() {
  const { open, closeDemo } = useCountersDemo();
  if (!open) return null;
  return <CountersDemoOverlay onClose={closeDemo} />;
}
