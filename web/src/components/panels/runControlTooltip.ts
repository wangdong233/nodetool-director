import type { ReactNode } from "react";
import { i18n } from "../../i18n";
import { getShortcutTooltip } from "../../config/shortcuts";

export interface RunControlTooltipState {
  isStopping: boolean;
  isWorkflowActive: boolean;
  runControlLabel: string;
  runControlDetail?: string | null;
  queuePosition?: number | null;
  pendingRunCount: number;
}

/**
 * Tooltip for the canvas composer's "Run entire workflow" button. The idle
 * tooltip is the shortcut element itself: interpolating it into a template
 * string renders "[object Object]".
 */
export const runControlTooltip = ({
  isStopping,
  isWorkflowActive,
  runControlLabel,
  runControlDetail,
  queuePosition,
  pendingRunCount
}: RunControlTooltipState): ReactNode => {
  if (isStopping) {
    return i18n.t("editor:ui.stoppingWorkflow", { defaultValue: "Stopping workflow" });
  }
  if (runControlLabel.startsWith("Error")) {
    // Suffix composition keeps the existing dictionary keys byte-aligned.
    const detail =
      runControlDetail ??
      i18n.t("editor:ui.workflowFailedToStart", { defaultValue: "Workflow failed to start" });
    return (
      detail +
      i18n.t("editor:ui.clickToRetryTheEntireWorkflow", {
        defaultValue: ". Click to retry the entire workflow."
      })
    );
  }
  if (queuePosition != null) {
    return i18n.t("editor:ui.queuedAtPosition", {
      defaultValue: "Queued (#{{position}})",
      position: queuePosition
    });
  }
  if (pendingRunCount > 0) {
    return i18n.t("editor:ui.runningQueuedClickToQueue", {
      defaultValue: "Running — {{count}} queued (click to queue another)",
      count: pendingRunCount
    });
  }
  if (isWorkflowActive) {
    return (
      runControlLabel +
      i18n.t("editor:ui.clickToQueueAnotherEntireWorkflowRun", {
        defaultValue: " (click to queue another entire workflow run)"
      })
    );
  }
  return getShortcutTooltip("runWorkflow", undefined, "full", true);
};
