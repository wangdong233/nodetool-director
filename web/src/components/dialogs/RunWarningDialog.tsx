/** @jsxImportSource @emotion/react */
import React, { memo, useCallback, useState } from "react";
import { useRunWarningStore } from "../../stores/RunWarningStore";
import { Dialog, Checkbox, Text, FlexColumn } from "../ui_primitives";
import { useTranslation } from "react-i18next";

/**
 * Confirmation shown before a "Run Entire Workflow" action that would execute many
 * provider/model nodes at once. Mounted once at the app root; driven entirely
 * by {@link useRunWarningStore}.
 */
const RunWarningDialog: React.FC = () => {
  const { t } = useTranslation();
  const open = useRunWarningStore((s) => s.open);
  const kind = useRunWarningStore((s) => s.kind);
  const heavyCount = useRunWarningStore((s) => s.heavyCount);
  const threshold = useRunWarningStore((s) => s.threshold);
  const confirm = useRunWarningStore((s) => s.confirm);
  const cancel = useRunWarningStore((s) => s.cancel);

  const [dontAskAgain, setDontAskAgain] = useState(false);

  const handleConfirm = useCallback(() => {
    // The session suppression only applies to the heavy-run warning; a
    // concurrent-run confirmation always asks.
    confirm(kind === "heavy" && dontAskAgain);
    setDontAskAgain(false);
  }, [confirm, dontAskAgain, kind]);

  const handleCancel = useCallback(() => {
    cancel();
    setDontAskAgain(false);
  }, [cancel]);

  const isConcurrent = kind === "concurrent";

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      title={
        isConcurrent
          ? t("editor:ui.startAnotherEntireWorkflowRun", { defaultValue: "Start another entire workflow run?" })
          : t("editor:ui.runTheEntireWorkflow", { defaultValue: "Run the entire workflow?" })
      }
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      confirmText={isConcurrent ? t("editor:ui.startSecondRun", { defaultValue: "Start second run" }) : t("editor:ui.runAnyway", { defaultValue: "Run anyway" })}
      cancelText={t("common:action.cancel", { defaultValue: "Cancel" })}
      content={
        <FlexColumn gap={1.5}>
          {isConcurrent ? (
            <Text>
              {t("editor:ui.thisWorkflowIs", { defaultValue: "This workflow is " })}
              <strong>{t("editor:ui.alreadyRunning", { defaultValue: "already running" })}</strong>
              {t("editor:ui.concurrentRunTail", { defaultValue: ". Starting another run will execute both at the same time — for realtime audio patches that means overlapping sound. Stop the current run first if you meant to restart it." })}
            </Text>
          ) : (
            <>
              <Text>
                {t("editor:ui.thisRunWillExecute", { defaultValue: "This run will execute " })}
                <strong>{t("editor:ui.modelProviderNodes", { defaultValue: "{{count}} model/provider nodes", count: heavyCount })}</strong>
                {t("editor:ui.heavyRunTail", { defaultValue: " — above the warning threshold of {{threshold}}. Each may call an external API or run a model, so running them all at once can be slow or hit provider rate limits.", threshold })}
              </Text>
              <Checkbox
                label={t("editor:ui.donTAskAgainForThisSession", { defaultValue: "Don't ask again for this session" })}
                checked={dontAskAgain}
                onChange={(_event, checked) => setDontAskAgain(checked)}
              />
            </>
          )}
        </FlexColumn>
      }
    />
  );
};

RunWarningDialog.displayName = "RunWarningDialog";

export default memo(RunWarningDialog);
