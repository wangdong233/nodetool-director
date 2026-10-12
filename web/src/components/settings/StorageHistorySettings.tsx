import { useCallback, useState } from "react";
import type { StorageRetentionPolicy } from "@nodetool-ai/protocol/api-schemas/settings.js";
import { useStorageHistory } from "../../serverState/useStorageHistory";
import { useNotificationStore } from "../../stores/NotificationStore";
import { ConfirmDialog } from "../ui_primitives";
import { NumberSetting } from "../menus/NumberSetting";
import {
  AlertBanner,
  EditorButton,
  FlexRow,
  LabeledSwitch,
  Text
} from "../ui_primitives";
import { i18n, useAppLanguage } from "../../i18n";
import { useTranslation } from "react-i18next";

const st = (key: string, fallback: string, options?: Record<string, string>) =>
  i18n.t(`settings:storage.${key}`, { defaultValue: fallback, ...options });

function formatBytes(bytes: number | null): string {
  if (bytes === null) return st("bytesNA", "Not available");
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function StorageHistorySettings() {
  const { t } = useTranslation();
  // Subscribe so catalog reads re-render on language change.
  useAppLanguage();
  const history = useStorageHistory();
  const addNotification = useNotificationStore(
    (state) => state.addNotification
  );
  const [confirmation, setConfirmation] = useState<
    "cleanup" | "compact" | null
  >(null);
  const policy = history.data?.policy;
  const status = history.data?.status;

  const updatePolicy = useCallback(
    (changes: Partial<StorageRetentionPolicy>) => {
      if (!policy) return;
      void history.updatePolicy({ ...policy, ...changes }).catch((error) => {
        addNotification({
          type: "error",
          content: st("notifUpdateFail", "Could not update history limits: {{error}}", { error: String(error) })
        });
      });
    },
    [addNotification, history, policy]
  );

  const runConfirmedAction = useCallback(() => {
    if (confirmation === "cleanup") {
      void history
        .cleanup()
        .then((result) => {
          const { total, redactedPredictions } = result.deleted;
          addNotification({
            type: "success",
            content:
              redactedPredictions > 0
                ? st("notifCleanSome", "Removed {{total}} old history records and cleared prompt data from {{redact}} generation records.", { total: String(total), redact: String(redactedPredictions) })
                : st("notifCleanAll", "Removed {{total}} old history records.", { total: String(total) })
          });
        })
        .catch((error) => {
          addNotification({
            type: "error",
            content: st("notifCleanFail", "History cleanup failed: {{error}}", { error: String(error) })
          });
        });
    } else if (confirmation === "compact") {
      void history
        .compact()
        .then(() => {
          addNotification({
            type: "success",
            content: st("notifCompactDone", "Database compaction completed.")
          });
        })
        .catch((error) => {
          addNotification({
            type: "error",
            content: st("notifCompactFail", "Database compaction failed: {{error}}", { error: String(error) })
          });
        });
    }
  }, [addNotification, confirmation, history]);

  if (history.isLoading) {
    return <Text className="description">{st("loading", "Loading history status…")}</Text>;
  }
  if (history.error || !policy || !status) {
    return (
      <AlertBanner severity="error" compact>
        {st("loadError", "Could not load database history settings.")}
      </AlertBanner>
    );
  }

  const disabled =
    history.isUpdating || history.isCleaning || history.isCompacting;
  const cleanupCount = status.cleanup.total;
  const redactionCount = status.cleanup.redactedPredictions;
  // Records this sweep will change: the ones it removes plus the ones it
  // clears. `cleanup.total` counts removals only, so it cannot stand in here.
  const pendingCount = cleanupCount + redactionCount;
  const isSqlite = status.dialect === "sqlite";

  return (
    <>
      <div className="settings-item">
        <NumberSetting
          label={st("lblAutosavesPer", "Autosaves per workflow")}
          description={st("descAutosavesPer", "Maximum recent autosaves kept for each workflow. Manual versions do not count toward this limit.")}
          value={policy.maxAutosavesPerWorkflow}
          onCommit={(value) => updatePolicy({ maxAutosavesPerWorkflow: value })}
          min={1}
          max={500}
          fallback={10}
          disabled={disabled}
        />
      </div>
      <div className="settings-item">
        <NumberSetting
          label={st("lblKeepDays", "Keep autosaves (days)")}
          description={st("descKeepDays", "Autosaves older than this are removed even when the workflow is below its count limit.")}
          value={policy.autosaveRetentionDays}
          onCommit={(value) => updatePolicy({ autosaveRetentionDays: value })}
          min={1}
          max={3650}
          fallback={7}
          disabled={disabled}
        />
      </div>
      <div className="settings-item">
        <NumberSetting
          label={st("lblKeepManual", "Keep manual versions (days)")}
          description={st("descKeepManual", "Manual workflow snapshots older than this are removed. Checkpoints are always preserved.")}
          value={policy.manualVersionRetentionDays}
          onCommit={(value) =>
            updatePolicy({ manualVersionRetentionDays: value })
          }
          min={1}
          max={3650}
          fallback={90}
          disabled={disabled}
        />
      </div>
      <div className="settings-item">
        <NumberSetting
          label={st("lblKeepRuns", "Keep completed runs (days)")}
          description={st("descKeepRuns", "Completed, failed, and cancelled run records older than this are removed. Active runs are preserved.")}
          value={policy.terminalJobRetentionDays}
          onCommit={(value) =>
            updatePolicy({ terminalJobRetentionDays: value })
          }
          min={1}
          max={3650}
          fallback={30}
          disabled={disabled}
        />
      </div>
      <div className="settings-item">
        <NumberSetting
          label={st("lblKeepRunLogs", "Keep run event logs (days)")}
          description={st("descKeepRunLogs", "Per-node event logs from a run are removed after this many days. The run record itself follows the limit above.")}
          value={policy.runEventRetentionDays ?? 30}
          onCommit={(value) => updatePolicy({ runEventRetentionDays: value })}
          min={1}
          max={3650}
          fallback={30}
          disabled={disabled}
        />
      </div>
      <div className="settings-item">
        <NumberSetting
          label={st("lblKeepRunTrace", "Keep app run inputs and outputs (days)")}
          description={st("descKeepRunTrace", "After this many days, inputs, outputs, and document snapshots expire. Status, timing, and cost remain until the completed run record expires.")}
          value={policy.runTraceRetentionDays ?? 30}
          onCommit={(value) => updatePolicy({ runTraceRetentionDays: value })}
          min={1}
          max={3650}
          fallback={30}
          disabled={disabled}
        />
      </div>
      <div className="settings-item">
        <NumberSetting
          label={st("lblKeepGen", "Keep generation details (days)")}
          description={st("descKeepGen", "After this many days, prompts, parameters, and logs are cleared from generation records. The billing record — model, provider, tokens, cost, and date — is kept.")}
          value={policy.predictionRetentionDays ?? 400}
          onCommit={(value) => updatePolicy({ predictionRetentionDays: value })}
          min={1}
          max={3650}
          fallback={400}
          disabled={disabled}
        />
      </div>
      <div className="settings-item">
        <LabeledSwitch
          label={st("lblAutoClean", "Automatic history cleanup")}
          checked={policy.automaticCleanup}
          onChange={(checked) => updatePolicy({ automaticCleanup: checked })}
          description={st("descAutoClean", "Apply these limits in the background once per day. Database compaction remains manual.")}
          disabled={disabled}
        />
      </div>
      <div className="settings-item">
        <Text>
          {st("dbLine", "Database: {{size}} · {{versions}} workflow versions · {{runs}} runs · {{events}} run events", {
            size: formatBytes(status.databaseBytes),
            versions: String(status.workflowVersions),
            runs: String(status.jobs),
            events: String(status.runEvents)
          })}
        </Text>
        <Text className="description">
          {st("pendingLine", "{{count}} records exceed the current limits. Deleted SQLite pages currently use {{size}} and are returned to disk only after compaction.", {
            count: String(cleanupCount),
            size: formatBytes(status.unusedBytes)
          })}
        </Text>
        <Text className="description">
          {st("redactedLine", "{{count}} of {{total}} generation records still holding prompts and parameters are past the limit. Cleaning clears that text and keeps the billing record.", {
            count: String(redactionCount),
            total: String(status.predictionsWithPayload)
          })}
        </Text>
        <FlexRow gap={2} wrap sx={{ marginTop: 2 }}>
          <EditorButton
            variant="outlined"
            onClick={() => setConfirmation("cleanup")}
            disabled={disabled || pendingCount === 0}
          >
            {history.isCleaning ? st("cleaning", "Cleaning…") : st("cleanNow", "Clean now ({{count}})", { count: String(pendingCount) })}
          </EditorButton>
          {isSqlite && (
            <EditorButton
              variant="outlined"
              onClick={() => setConfirmation("compact")}
              disabled={disabled}
            >
              {history.isCompacting ? st("compacting", "Compacting…") : st("compact", "Compact database")}
            </EditorButton>
          )}
        </FlexRow>
      </div>
      <ConfirmDialog
        open={confirmation !== null}
        onClose={() => setConfirmation(null)}
        onConfirm={runConfirmedAction}
        title={
          confirmation === "compact"
            ? st("confirmCompactTitle", "Compact database?")
            : st("confirmCleanTitle", "Clean old history?")
        }
        content={
          confirmation === "compact"
            ? st("confirmCompactBody", "Compaction returns unused SQLite pages to disk. It can pause database writes while it rebuilds a large local database.")
            : st("confirmCleanBody", "Remove {{clean}} old workflow-history, completed-run, and run-event records, and clear prompts and parameters from {{redact}} generation records? The billing record for each generation is kept. Current workflows, assets, checkpoints, and active runs are not changed.", {
                clean: String(cleanupCount),
                redact: String(redactionCount)
              })
        }
        confirmText={confirmation === "compact" ? st("confirmCompact", "Compact") : st("confirmClean", "Clean")}
        cancelText={t("common:action.cancel", { defaultValue: "Cancel" })}
      />
    </>
  );
}
