import { Suspense } from "react";
import { LibraryScreen } from "@/components/library/LibraryScreen";

export default function LibraryPage() {
  return (
    <Suspense fallback={<div className="fd-ui p-6">Loading library…</div>}>
      <LibraryScreen />
    </Suspense>
  );
}
