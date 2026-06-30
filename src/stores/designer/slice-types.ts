import type { StoreApi } from "zustand";
import type { DesignerState } from "./types";

export type DesignerSet = StoreApi<DesignerState>["setState"];
export type DesignerGet = StoreApi<DesignerState>["getState"];

export type DesignerSliceCreator = (
  set: DesignerSet,
  get: DesignerGet,
) => Partial<DesignerState>;
