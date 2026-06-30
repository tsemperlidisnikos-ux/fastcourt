"use client";

import {
  PlaybookNameDialog,
  PlaybookNoticeDialog,
} from "@/components/library/PlaybookDialogs";
import {
  PracticeConfirmDialog,
  PracticeInputDialog,
} from "@/components/library/PracticeDialogs";
import { useDialogStore } from "@/stores/dialog-store";

export function AppDialogHost() {
  const notice = useDialogStore((s) => s.notice);
  const confirmDialog = useDialogStore((s) => s.confirmDialog);
  const input = useDialogStore((s) => s.input);
  const copyLink = useDialogStore((s) => s.copyLink);
  const playbookNameDialog = useDialogStore((s) => s.playbookNameDialog);
  const closeNotice = useDialogStore((s) => s.closeNotice);
  const resolveConfirm = useDialogStore((s) => s.resolveConfirm);
  const resolveInput = useDialogStore((s) => s.resolveInput);
  const resolvePlaybookName = useDialogStore((s) => s.resolvePlaybookName);
  const closeCopyLink = useDialogStore((s) => s.closeCopyLink);

  return (
    <>
      <PlaybookNoticeDialog
        open={notice != null}
        title={notice?.title ?? ""}
        message={notice?.message ?? ""}
        onClose={closeNotice}
      />
      <PracticeConfirmDialog
        open={confirmDialog != null}
        title={confirmDialog?.title ?? ""}
        message={confirmDialog?.message ?? ""}
        confirmLabel={confirmDialog?.confirmLabel ?? "Confirm"}
        danger={confirmDialog?.danger}
        onClose={() => resolveConfirm(false)}
        onConfirm={() => resolveConfirm(true)}
      />
      {input ? (
        <PracticeInputDialog
          open={input != null}
          title={input.title}
          subtitle={input.subtitle}
          label={input.label}
          initialValue={input.initialValue}
          placeholder={input.placeholder}
          submitLabel={input.submitLabel}
          allowEmpty={input.allowEmpty}
          multiline={input.multiline}
          onClose={() => resolveInput(null)}
          onSubmit={async (value) => resolveInput(value)}
        />
      ) : null}
      {copyLink ? (
        <PracticeInputDialog
          open={copyLink != null}
          title={copyLink.title}
          subtitle="Copy the link below."
          label="Link"
          initialValue={copyLink.url}
          submitLabel="Close"
          allowEmpty
          onClose={closeCopyLink}
          onSubmit={async () => {
            try {
              await navigator.clipboard.writeText(copyLink.url);
            } catch {
              /* user can copy manually from the field */
            }
            closeCopyLink();
          }}
        />
      ) : null}
      {playbookNameDialog ? (
        <PlaybookNameDialog
          open={playbookNameDialog != null}
          mode={playbookNameDialog.mode}
          initialName={playbookNameDialog.initialName}
          initialTeam={playbookNameDialog.initialTeam}
          teams={playbookNameDialog.teams}
          existingNames={playbookNameDialog.existingNames}
          onClose={() => resolvePlaybookName(null)}
          onSubmit={async (name, team) => resolvePlaybookName({ name, team })}
        />
      ) : null}
    </>
  );
}
