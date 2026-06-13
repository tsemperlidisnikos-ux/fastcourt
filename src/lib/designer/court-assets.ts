import type { CourtType } from "@/types/designer";

export function courtImagePath(courtType: CourtType) {
  return courtType === "full"
    ? "/assets/courts/full_court.png"
    : "/assets/courts/half_court.png";
}

export function courtImageUrl(courtType: CourtType) {
  if (typeof window === "undefined") {
    return courtImagePath(courtType);
  }
  return new URL(courtImagePath(courtType), window.location.origin).href;
}
