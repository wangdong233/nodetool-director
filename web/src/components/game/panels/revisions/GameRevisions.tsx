import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Caption, Dialog, EditorButton, FlexRow, SPACING, Text } from "../../../ui_primitives";

interface GameRevision {
  readonly revision: string;
  readonly modifiedAt: number;
  readonly current: boolean;
  readonly message: string | null;
}

interface GameRevisionsProps {
  readonly revisions: readonly GameRevision[];
  readonly busy: boolean;
  readonly onRestore: (revision: string) => Promise<void>;
}

export default function GameRevisions({ revisions, busy, onRestore }: GameRevisionsProps): React.ReactElement {
  const { t } = useTranslation();
  const [pendingRevision, setPendingRevision] = useState<string | null>(null);
  return <>{revisions.slice(0, 10).map((entry) => <FlexRow key={entry.revision} gap={SPACING.xs} align="center">
    <Caption>{entry.message || entry.revision.slice(0, 12)} · {new Date(entry.modifiedAt).toLocaleString()}{entry.current ? t("game:revisions.currentBadge", { defaultValue: " · Current" }) : ""}</Caption>
    <EditorButton disabled={busy} onClick={() => setPendingRevision(entry.revision)}>{t("game:revisions.restoreToDraft", { defaultValue: "Restore to draft" })}</EditorButton>
  </FlexRow>)}
    <Dialog open={pendingRevision !== null} title={t("game:revisions.restoreTitle", { defaultValue: "Restore revision to draft" })} onClose={() => setPendingRevision(null)}
      confirmText={t("game:revisions.restoreToDraft", { defaultValue: "Restore to draft" })} isLoading={busy} showActions onConfirm={() => {
        if (!pendingRevision || busy) { return; }
        void onRestore(pendingRevision);
        setPendingRevision(null);
      }}>
      <Text>{t("game:revisions.restoringWarning", { defaultValue: "Restoring replaces the draft and clears its undo history." })}</Text>
    </Dialog>
  </>;
}
