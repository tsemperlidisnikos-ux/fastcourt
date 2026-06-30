import { appConfirm } from "@/stores/dialog-store";

export async function confirmDiscardDesignerChanges(): Promise<boolean> {
  return appConfirm({
    title: "Discard changes",
    message: "You have unsaved changes in this play. Leave without saving?",
    confirmLabel: "Discard",
    danger: true,
  });
}
