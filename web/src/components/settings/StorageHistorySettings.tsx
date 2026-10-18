import { useCallback, useState } from "react";
import type { StorageRetentionPolicy } from "@nodetool-ai/protocol/api-schemas/settings.js";
import { useStorageHistory } from "../../serverState/useStorageHistory";
import { useNotificationStore } from "../../stores/NotificationStore";
import { ConfirmDialog, LoadingSpinner } from "../ui_primitives";
import { NumberSetting } from "../menus/NumberSetting";
import {
  AlertBanner,
  EditorButton,
  FlexRow,
  LabeledSwitch,
  Text
} from "../ui_primitives";
import { useTranslation } from "react-i18next";

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "Not available";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function StorageHistorySettings() {
  const { t } = useTranslation("settings");
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
          content: `Could not update history limits: ${String(error)}`
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
                ? `Removed ${total} old history records and cleared prompt data from ${redactedPredictions} generation records.`
                : `Removed ${total} old history records.`
          });
        })
        .catch((error) => {
          addNotification({
            type: "error",
            content: `History cleanup failed: ${String(error)}`
          });
        });
    } else if (confirmation === "compact") {
      void history
        .compact()
        .then(() => {
          addNotification({
            type: "success",
            content: "Database compaction completed."
          });
        })
        .catch((error) => {
          addNotification({
            type: "error",
            content: `Database compaction failed: ${String(error)}`
          });
        });
    }
  }, [addNotification, confirmation, history]);

  if (history.isLoading) {
    return <LoadingSpinner size="small" text="Loading history status" />;
  }
  if (history.error || !policy || !status) {
    return (
      <AlertBanner severity="error" compact>
        Could not load database history settings.
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
          label={t("settings:storage.lblAutosavesPer", { defaultValue: "Autosaves per workflow" })}
          description={t("settings:storage.descAutosavesPer", { defaultValue: "Maximum recent autosaves kept for each workflow. Manual versions do not count toward this limit." })}
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
          label={t("settings:storage.lblKeepDays", { defaultValue: "Keep autosaves (days)" })}
          description={t("settings:storage.descKeepDays", { defaultValue: "Autosaves older than this are removed even when the workflow is below its count limit." })}
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
          label={t("settings:storage.lblKeepManual", { defaultValue: "Keep manual versions (days)" })}
          description={t("settings:storage.descKeepManual", { defaultValue: "Manual workflow snapshots older than this are removed. Checkpoints are always preserved." })}
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
          label={t("settings:storage.lblKeepRuns", { defaultValue: "Keep completed runs (days)" })}
          description={t("settings:storage.descKeepRuns", { defaultValue: "Completed, failed, and cancelled run records older than this are removed. Active runs are preserved." })}
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
          label={t("settings:storage.lblKeepRunLogs", { defaultValue: "Keep run event logs (days)" })}
          description={t("settings:storage.descKeepRunLogs", { defaultValue: "Per-node event logs from a run are removed after this many days. The run record itself follows the limit above." })}
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
          label={t("settings:storage.lblKeepRunTrace", { defaultValue: "Keep app run inputs and outputs (days)" })}
          description="After this many days, inputs, outputs, and document snapshots expire. Status, timing, and cost remain until the completed run record expires."
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
          label={t("settings:storage.lblKeepGen", { defaultValue: "Keep generation details (days)" })}
          description="After this many days, prompts, parameters, and logs are cleared from generation records. The billing record — model, provider, tokens, cost, and date — is kept."
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
          label={t("settings:storage.lblAutoClean", { defaultValue: "Automatic history cleanup" })}
          checked={policy.automaticCleanup}
          onChange={(checked) => updatePolicy({ automaticCleanup: checked })}
          description={t("settings:storage.descAutoClean", { defaultValue: "Apply these limits in the background once per day. Database compaction remains manual." })}
          disabled={disabled}
        />
      </div>
      <div className="settings-item">
        <Text>
          Database: {formatBytes(status.databaseBytes)} ·{" "}
          {status.workflowVersions} workflow versions · {status.jobs} runs ·{" "}
          {status.runEvents} run events
        </Text>
        <Text className="description">
          {cleanupCount} records exceed the current limits. Deleted SQLite pages
          currently use {formatBytes(status.unusedBytes)} and are returned to
          disk only after compaction.
        </Text>
        <Text className="description">
          {redactionCount} of {status.predictionsWithPayload} generation records
          still holding prompts and parameters are past the limit. Cleaning
          clears that text and keeps the billing record.
        </Text>
        <FlexRow gap={2} wrap sx={{ marginTop: 2 }}>
          <EditorButton
            variant="outlined"
            onClick={() => setConfirmation("cleanup")}
            disabled={disabled || pendingCount === 0}
          >
            {history.isCleaning ? t("settings:storage.cleaning", { defaultValue: "Cleaning…" }) : `Clean now (${pendingCount})`}
          </EditorButton>
          {isSqlite && (
            <EditorButton
              variant="outlined"
              onClick={() => setConfirmation("compact")}
              disabled={disabled}
            >
              {history.isCompacting ? t("settings:storage.compacting", { defaultValue: "Compacting…" }) : "Compact database"}
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
            ? t("settings:storage.confirmCompactTitle", { defaultValue: "Compact database?" }) : "Clean old history?"
        }
        content={
          confirmation === "compact"
            ? "Compaction returns unused SQLite pages to disk. It can pause database writes while it rebuilds a large local database."
            : `Remove ${cleanupCount} old workflow-history, completed-run, and run-event records, and clear prompts and parameters from ${redactionCount} generation records? The billing record for each generation is kept. Current workflows, assets, checkpoints, and active runs are not changed.`
        }
        confirmText={confirmation === "compact" ? t("settings:storage.confirmCompact", { defaultValue: "Compact" }) : "Clean"}
        cancelText="Cancel"
      />
    </>
  );
}
