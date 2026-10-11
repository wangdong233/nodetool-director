import { useState, type ReactElement } from "react";
import { trpc, trpcClient } from "../../trpc/client";
import { getGameDraftStore } from "../../stores/game/GameDraftStore";
import { saveBlobAsFile } from "../../utils/downloadResponse";
import { EditorButton, EmptyState, FlexColumn, LoadingSpinner, SPACING, Text } from "../ui_primitives";
import ReportBugButton from "../support/ReportBugButton";
import { useTranslation } from "react-i18next";
import GameRevisions from "./panels/revisions/GameRevisions";

interface GameDraftRecoveryProps {
  readonly refId: string;
}

export function isMissingDraft(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("data" in error)) { return false; }
  const data = error.data;
  return !!data && typeof data === "object" && "code" in data && data.code === "PRECONDITION_FAILED";
}

export default function GameDraftRecovery({ refId }: GameDraftRecoveryProps): ReactElement {
  const { t } = useTranslation();
  const published = trpc.games.get.useQuery({ id: refId }, { staleTime: 15_000 });
  const revisions = trpc.games.revisions.useQuery({ id: refId }, { staleTime: 15_000 });
  const queries = trpc.useUtils();
  const [restoring, setRestoring] = useState(false);
  const [recoveryState, setRecoveryState] = useState<"ready" | "restored" | "refresh-failed">("ready");
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [localCopy] = useState(() => {
    const state = getGameDraftStore(refId).getState();
    return state.document ? JSON.stringify({ document: state.document, pendingOps: state.pendingOps,
      commandHistory: state.commandHistory, baseUpdatedAt: state.baseUpdatedAt }, null, 2) : null;
  });
  const [exported, setExported] = useState(false);
  const needsExport = localCopy !== null && !exported;
  const error = restoreError ?? published.error?.message ?? revisions.error?.message;

  function exportLocalCopy(): void {
    if (!localCopy) { return; }
    try {
      saveBlobAsFile(new Blob([localCopy], { type: "application/json" }),
        `game-${refId}-local-draft.json`);
      setExported(true);
    } catch {
      setRestoreError("Could not export the local draft. Your edits are still in this tab.");
    }
  }

  async function restore(revision: string): Promise<void> {
    if (!published.data || restoring || recoveryState !== "ready" || needsExport) { return; }
    setRestoring(true);
    setRestoreError(null);
    let committed = false;
    try {
      const result = await trpcClient.games.restoreDraft.mutate({ id: refId,
        baseUpdatedAt: published.data.game.draftUpdatedAt, revision });
      committed = true;
      setRecoveryState("restored");
      getGameDraftStore(refId).getState().load(result.document, result.game.draftUpdatedAt);
      queries.games.getDraft.setData({ id: refId }, result);
      await queries.games.draftChanges.invalidate({ id: refId }, undefined, { throwOnError: true });
    } catch (failure) {
      if (committed) {
        setRestoreError(t("editor:ui.draftRestoredButTheEditorCouldNotRefreshReloadTheGameToContinue"));
      } else {
        setRestoreError(failure instanceof Error ? failure.message : t("editor:ui.couldNotRestoreTheSelectedRevision"));
        try {
          const currentPublished = await trpcClient.games.get.query({ id: refId });
          try {
            const currentDraft = await trpcClient.games.getDraft.query({ id: refId });
            setRecoveryState("restored");
            setRestoreError(null);
            queries.games.getDraft.setData({ id: refId }, currentDraft);
          } catch (readError) {
            if (!isMissingDraft(readError)) { throw readError; }
            queries.games.get.setData({ id: refId }, currentPublished);
          }
        } catch {
          setRecoveryState("refresh-failed");
          setRestoreError(t("editor:ui.couldNotRefreshTheDraftAfterTheFailedRestoreReloadTheGameBeforeTryingAgain"));
        }
      }
    } finally {
      setRestoring(false);
    }
  }

  return <FlexColumn gap={SPACING.sm}>
    <EmptyState variant="error" title={t("editor:ui.draftSourceUnavailable")}
      description={t("editor:ui.chooseAPublishedRevisionToReplaceTheUnavailableDraftThisCannotRecoverUnpublishedEditsFromTheMissingSource")} />
    {localCopy && <>
      <Text>{t("editor:ui.exportTheLocalDraftBeforeRestoringTheExportIncludesYourEditsAndUndoHistoryKeepThisTabOpenUntilTheDownloadFinishes")}</Text>
      <EditorButton onClick={exportLocalCopy}>{t("editor:ui.exportLocalDraft")}</EditorButton>
    </>}
    {published.isPending || revisions.isPending ? <LoadingSpinner text={t("editor:ui.loadingPublishedRevisions")} /> :
      <GameRevisions revisions={revisions.data ?? []} busy={restoring || recoveryState !== "ready" || !published.data || needsExport} onRestore={restore} />}
    {error && <EmptyState variant="error" title={recoveryState === "restored" ? t("editor:ui.draftRestored") : t("editor:ui.couldNotRestoreDraft")} description={error} />}
    <ReportBugButton context={{ source: "panel-crash", summary: "Game draft source is unavailable",
      errorText: error ?? "Game draft source is unavailable", nodeDetail: `Game: ${refId}` }} />
  </FlexColumn>;
}
