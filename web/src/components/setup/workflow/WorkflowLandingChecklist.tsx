/**
 * The landing checklist, at the top of the agent panel (PRD § 11.4).
 *
 * Four lines: `Graph built`, `Validated`, `Test run` with its outcome, and the
 * next step the chosen run mode implies. A validation error or a failed run
 * shows the error here and offers the fix as a message to the agent —
 * **nothing is applied without the creator's click**, which is the rule the PRD
 * states outright and this component enforces by having no apply path at all.
 */

import { useTranslation } from "react-i18next";
import React, { memo } from "react";
import type { WorkflowSetupRunMode } from "@nodetool-ai/protocol/api-schemas/workflows.js";
import { i18n } from "../../../i18n";

import {
  AlertBanner,
  Caption,
  EditorButton,
  FlexColumn,
  FlexRow,
  GAP,
  StatusPill,
  Text
} from "../../ui_primitives";
import type { BuildFromPlanResult } from "../../../hooks/workflow/useBuildFromPlan";

/** What each run mode leaves to do once the graph runs (PRD § 11.4). */
const NEXT_STEP: Readonly<
  Record<WorkflowSetupRunMode, { label: string; labelKey: string; detail: string; detailKey: string }>
> = {
  manual: {
    label: "Continue on canvas",
    labelKey: "editor:ui.continueOnCanvas",
    detail: "Adjust inputs or run the workflow from the canvas.",
    detailKey: "editor:ui.adjustInputsOrRunTheWorkflowFromTheCanvas"
  },
  app: {
    label: "Create Mini App",
    labelKey: "editor:ui.createMiniApp",
    detail: "Create and open a Mini App backed by this workflow.",
    detailKey: "editor:ui.createAndOpenAMiniAppBackedByThisWorkflow"
  },
  trigger: {
    label: "Add a trigger",
    labelKey: "editor:ui.addTrigger",
    detail: "Open the trigger-node picker on this canvas.",
    detailKey: "editor:ui.openTheTriggernodePickerOnThisCanvas"
  }
};

export interface WorkflowLandingChecklistProps {
  result: BuildFromPlanResult;
  runMode: WorkflowSetupRunMode;
  /** Performs the named next operation for the selected run mode. */
  onNextStep: () => void | Promise<void>;
  nextStepPending?: boolean;
  /**
   * Hands the agent panel the first message: the error, with the fix proposed.
   * The creator sends it; this component never applies anything itself.
   */
  onAskAgent: (message: string) => void;
}

/** The message the agent panel opens with when the build did not come out clean. */
export const buildFailureMessage = (
  result: BuildFromPlanResult
): string | null => {
  if (result.validationError !== undefined) {
    return [
      `Validation could not run: ${result.validationError}`,
      "",
      "Repair: check that the editor reached the workflow, then run the graph check again. Propose any graph change and wait for me before applying it."
    ].join("\n");
  }
  if (result.validationErrors.length > 0) {
    return [
      "The graph I just built does not validate:",
      ...result.validationErrors.map((error) => `- ${error}`),
      "",
      "Repair: inspect each named node, set the missing property, or reconnect the invalid handle. Propose the change and wait for me before applying it."
    ].join("\n");
  }
  if (result.issues.length > 0) {
    return [
      "The graph I just built validates, but part of the plan was never wired:",
      ...result.issues.map((issue) => `- ${issue}`),
      "",
      "Repair: connect each unwired output to the named upstream step, or remove the output that the plan does not produce. Propose the change and wait for me."
    ].join("\n");
  }
  if (result.testRun.error !== null) {
    return [
      result.testRun.started
        ? `The test run failed: ${result.testRun.error}`
        : `The test run did not start: ${result.testRun.error}`,
      "",
      "Repair: check the named provider, worker, or runtime, then retry the sample run. Propose any graph change and wait for me before applying it."
    ].join("\n");
  }
  if (result.status === "failed") {
    return [
      result.explanation,
      "",
      "Repair: inspect the graph's last failed step and propose one targeted change. Wait for me before applying it."
    ].join("\n");
  }
  return null;
};

const outputDetail = (output: unknown): string => {
  if (output === null || output === undefined) {
    return i18n.t("storyboard:attrs.outputIsReady", { defaultValue: "Output is ready" });
  }
  if (typeof output === "string") {
    return output.length > 0
      ? i18n.t("setup:workflow.outputValue", { defaultValue: "Output: {{value}}", value: output })
      : i18n.t("storyboard:attrs.outputIsReady", { defaultValue: "Output is ready" });
  }
  if (Array.isArray(output)) {
    return i18n.t("setup:workflow.outputIsReadyValues", {
      defaultValue: "Output is ready ({{count}} values)",
      count: output.length
    });
  }
  if (typeof output === "object") {
    const keys = Object.keys(output);
    return keys.length > 0
      ? i18n.t("setup:workflow.outputIsReadyKeys", {
          defaultValue: "Output is ready ({{keys}})",
          keys: keys.join(", ")
        })
      : i18n.t("storyboard:attrs.outputIsReady", { defaultValue: "Output is ready" });
  }
  return i18n.t("setup:workflow.outputValue", { defaultValue: "Output: {{value}}", value: String(output) });
};

type LineTone = "done" | "rendering" | "failed" | "neutral";

interface LineState {
  tone: LineTone;
  /** The pill's word. */
  pill: string;
  detail: string;
}

/** The `Validated` line, read from where the build got to. */
const validationLine = (result: BuildFromPlanResult): LineState => {
  if (result.status === "built") {
    return {
      tone: "rendering",
      pill: "checking",
      detail: i18n.t("setup:workflow.checking", { defaultValue: "Checking…" })
    };
  }
  if (result.validationError !== undefined) {
    return {
      tone: "failed",
      pill: "failed",
      detail: i18n.t("setup:workflow.validationCouldNotRun", {
        defaultValue: "Validation could not run"
      })
    };
  }
  if (result.validationPending) {
    return {
      tone: "neutral",
      pill: "unknown",
      detail:
        result.status === "unrecorded"
          ? i18n.t("setup:workflow.theChecksResultWasNotRecorded", {
              defaultValue: "The check's result was not recorded"
            })
          : i18n.t("setup:workflow.notChecked", { defaultValue: "Not checked" })
    };
  }
  if (result.validationErrors.length > 0) {
    const count = result.validationErrors.length;
    return {
      tone: "failed",
      pill: "failed",
      detail: i18n.t("setup:workflow.errorCount", {
        defaultValue: "{{count}} errors",
        count
      })
    };
  }
  if (result.issues.length > 0) {
    return {
      tone: "failed",
      pill: "failed",
      detail: i18n.t("storyboard:attrs.validatesButPartOfThePlanIsUnwired", {
        defaultValue: "Validates, but part of the plan is unwired"
      })
    };
  }
  return {
    tone: "done",
    pill: "validated",
    detail: i18n.t("storyboard:attrs.noProblemsFound", {
      defaultValue: "No problems found"
    })
  };
};

/** The `Test run` line. Why a run did not start matters as much as that it did not. */
const testRunLine = (result: BuildFromPlanResult): LineState => {
  switch (result.status) {
    case "completed-with-output":
      return {
        tone: "done",
        pill: "completed",
        detail: outputDetail(result.output ?? result.testRun.output)
      };
    case "running":
      return {
        tone: "rendering",
        pill: "running",
        detail: i18n.t("storyboard:attrs.runningWithYourSampleInputs", {
          defaultValue: "Running with your sample inputs"
        })
      };
    case "built":
    case "validated":
      return {
        tone: "neutral",
        pill: "waiting",
        detail: i18n.t("setup:workflow.notRunYet", { defaultValue: "Not run yet" })
      };
    case "canceled":
      return {
        tone: "neutral",
        pill: "canceled",
        detail: i18n.t("setup:workflow.testRunCanceled", {
          defaultValue: "Test run canceled"
        })
      };
    case "unrecorded":
      return {
        tone: "neutral",
        pill: "unknown",
        detail: i18n.t("setup:workflow.theTestRunsResultWasNotRecorded", {
          defaultValue: "The test run's result was not recorded"
        })
      };
    case "failed":
      break;
  }
  if (result.testRun.started) {
    return {
      tone: "failed",
      pill: "failed",
      detail: result.testRun.error
        ? i18n.t("setup:workflow.runFailedError", {
            defaultValue: "Run failed: {{error}}",
            error: result.testRun.error
          })
        : i18n.t("setup:workflow.runFailed", { defaultValue: "Run failed" })
    };
  }
  if (result.validationError !== undefined) {
    return {
      tone: "neutral",
      pill: "skipped",
      detail: i18n.t("setup:workflow.notRunYet", { defaultValue: "Not run yet" })
    };
  }
  if (result.testRun.error !== null) {
    return {
      tone: "failed",
      pill: "failed",
      detail: i18n.t("setup:workflow.didNotStartError", {
        defaultValue: "Did not start: {{error}}",
        error: result.testRun.error
      })
    };
  }
  return {
    tone: "neutral",
    pill: "skipped",
    detail:
      result.validationErrors.length > 0
        ? i18n.t("setup:workflow.notStartedGraphDidNotValidate", {
            defaultValue: "Not started, the graph did not validate"
          })
        : result.issues.length > 0
          ? i18n.t("setup:workflow.notStartedPlanUnwired", {
              defaultValue: "Not started, part of the plan is unwired"
            })
          : i18n.t("setup:workflow.notStartedBuildStopped", {
              defaultValue: "Not started, the build stopped first"
            })
  };
};

const ChecklistInternal: React.FC<WorkflowLandingChecklistProps> = ({
  result,
  runMode,
  onNextStep,
  nextStepPending = false,
  onAskAgent
}) => {
  const { t } = useTranslation();
  const failure = buildFailureMessage(result);
  const next = NEXT_STEP[runMode];

  return (
    <FlexColumn gap={GAP.normal}>
      <Line
        tone="done"
        pill="built"
        label={t("storyboard:attrs.graphBuilt", { defaultValue: "Graph built" })}
        detail={t("setup:workflow.nodesPlaced", {
          defaultValue: "{{count}} nodes placed",
          count: result.nodeCount
        })}
      />
      <Line
        label={t("storyboard:attrs.validated", { defaultValue: "Validated" })}
        {...validationLine(result)}
      />
      {/* The creator was told on the setup step that building would run it
          once, so a missing run is a promise this screen has to account for
          (F1, F8). */}
      <Line
        label={t("storyboard:attrs.testRun", { defaultValue: "Test run" })}
        {...testRunLine(result)}
      />

      {failure === null ? (
        <FlexRow gap={GAP.normal} align="center">
          <EditorButton
            variant="contained"
            onClick={() => void onNextStep()}
            disabled={nextStepPending}
          >
            {t(next.labelKey, { defaultValue: next.label })}
          </EditorButton>
          <Caption color="secondary">{t(next.detailKey, { defaultValue: next.detail })}</Caption>
        </FlexRow>
      ) : (
        <AlertBanner
          severity="error"
          title={t("storyboard:attrs.thisNeedsAFixBeforeItWorks", { defaultValue: "This needs a fix before it works" })}
          action={
            <EditorButton variant="text" onClick={() => onAskAgent(failure)}>
              {t("editor:ui.askTheAgent", { defaultValue: "Ask the agent" })}
            </EditorButton>
          }
        >
          {/* The summary paragraph only: the repair instructions after the
              blank line are addressed to the agent, not the creator. */}
          <Caption component="span" sx={{ whiteSpace: "pre-line" }}>
            {failure.split("\n\n")[0]}
          </Caption>
        </AlertBanner>
      )}
    </FlexColumn>
  );
};

interface LineProps extends LineState {
  label: string;
}

/** zh for each status pill, keyed by the pill id. */
const PILL_KEYS: Readonly<Record<string, string>> = {
  built: "setup:workflow.pill_built",
  checking: "setup:workflow.pill_checking",
  failed: "setup:workflow.pill_failed",
  unknown: "setup:workflow.pill_unknown",
  validated: "setup:workflow.pill_validated",
  completed: "setup:workflow.pill_completed",
  running: "setup:workflow.pill_running",
  waiting: "setup:workflow.pill_waiting",
  canceled: "setup:workflow.pill_canceled",
  skipped: "setup:workflow.pill_skipped"
};

const Line: React.FC<LineProps> = ({ tone, pill, label, detail }) => {
  const { t } = useTranslation();
  return (
    <FlexRow gap={GAP.normal} align="center">
      <StatusPill tone={tone}>
        {t(PILL_KEYS[pill] ?? "", { defaultValue: pill })}
      </StatusPill>
      <Text size="small" component="span">
        {label}
      </Text>
      <Caption color="secondary">{detail}</Caption>
    </FlexRow>
  );
};

export const WorkflowLandingChecklist = memo(ChecklistInternal);
WorkflowLandingChecklist.displayName = "WorkflowLandingChecklist";

export default WorkflowLandingChecklist;
