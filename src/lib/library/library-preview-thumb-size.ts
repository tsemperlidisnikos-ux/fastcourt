import { getCourtAspect } from "@/lib/designer/court-hg-templates";
import type { CourtTemplate, CourtType } from "@/types/designer";

export const LIBRARY_PREVIEW_GRID_COLS = 3;
export const LIBRARY_PREVIEW_GRID_GAP_PX = 12;
export const LIBRARY_PREVIEW_GRID_PAD_X_PX = 32; /* 16px left + 16px right */
export const LIBRARY_PREVIEW_COURT_PAD_X_PX = 12; /* 6px left + 6px right */
export const LIBRARY_PREVIEW_THUMB_BORDER_X_PX = 4; /* 2px left + 2px right */

function courtAspect(
  courtType: CourtType,
  courtTemplate: CourtTemplate = "NCAA",
) {
  return getCourtAspect(courtTemplate, courtType);
}

function fitScale(courtType: CourtType) {
  return courtType === "full" ? 0.95 : 0.9;
}

export function deriveLibraryPreviewThumbHeight(
  thumbWidth: number,
  courtType: CourtType,
  courtTemplate: CourtTemplate = "NCAA",
) {
  const aspect = courtAspect(courtType, courtTemplate);
  const scale = fitScale(courtType);
  return Math.max(1, Math.round((thumbWidth / aspect) * scale));
}

export function getLibraryPreviewThumbSize(
  gridClientWidth: number,
  courtType: CourtType,
  columns = LIBRARY_PREVIEW_GRID_COLS,
  courtTemplate: CourtTemplate = "NCAA",
) {
  const gridInnerW = Math.max(0, gridClientWidth - LIBRARY_PREVIEW_GRID_PAD_X_PX);
  const gap = LIBRARY_PREVIEW_GRID_GAP_PX;
  const colW = Math.floor(
    (gridInnerW - gap * Math.max(0, columns - 1)) / columns,
  );
  const thumbWidth = Math.max(
    1,
    colW - LIBRARY_PREVIEW_COURT_PAD_X_PX - LIBRARY_PREVIEW_THUMB_BORDER_X_PX,
  );
  const thumbHeight = deriveLibraryPreviewThumbHeight(
    thumbWidth,
    courtType,
    courtTemplate,
  );

  return {
    columnWidth: colW,
    thumbWidth,
    thumbHeight,
    courtType,
  };
}
