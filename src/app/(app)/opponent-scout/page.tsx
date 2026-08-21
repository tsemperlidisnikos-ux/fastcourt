import { Suspense } from "react";
import { OpponentScoutScreen } from "@/components/opponent-scout/OpponentScoutScreen";

export default function OpponentScoutPage() {
  return (
    <Suspense
      fallback={
        <div id="screen-opponent-scout" className="fc-opponent-scout-screen">
          <p className="fc-os-empty" style={{ padding: 24 }}>
            Loading opponent scout…
          </p>
        </div>
      }
    >
      <OpponentScoutScreen />
    </Suspense>
  );
}
