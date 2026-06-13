import { Suspense } from "react";
import { DesignerScreen } from "@/components/designer/DesignerScreen";

export default function DesignerPage() {
  return (
    <Suspense
      fallback={
        <div
          id="screen-designer"
          className="fd-play-editor-pane fd-ui designer-route active"
        >
          <p className="p-6 text-sm text-[#64748b]">Loading designer…</p>
        </div>
      }
    >
      <DesignerScreen />
    </Suspense>
  );
}
