/**
 * The landing checklist, at the top of the agent panel (PRD § 11.4).
 *
 * Four lines: `Graph built`, `Validated`, `Test run` with its outcome, and the
 * next step the chosen run mode implies. A validation error or a failed run
 * shows the error here and offers the fix as a message to the agent —
 * **nothing is applied without the creator's click**, which is the rule the PRD
 * states outright and this component enforces by having no apply path at all.
 */

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
import type {
  BuildFromPlanResult,
  WorkflowBuildStatus
} from "../../../hooks/workflow/useBuildFromPlan";

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
      `The test run did not start: ${result.testRun.error}`,
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
    return output.length > 0 ? `Output: ${output}` : i18n.t("storyboard:attrs.outputIsReady", { defaultValue: "Output is ready" });
  }
  if (Array.isArray(output)) {
    return `Output is ready (${output.length} value${
      output.length === 1 ? "" : "s"
    })`;
  }
  if (typeof output === "object") {
    const keys = Object.keys(output);
    return keys.length > 0
      ? `Output is ready (${keys.join(", ")})`
      : i18n.t("storyboard:attrs.outputIsReady", { defaultValue: "Output is ready" });
  }
  return `Output: ${String(output)}`;
};

const statusTone = (
  status: WorkflowBuildStatus
): "done" | "rendering" | "failed" | "neutral" => {
  switch (status) {
    case "running":
      return "rendering";
    case "failed":
      return "failed";
    case "built":
    case "validated":
    case "completed-with-output":
      return "done";
  }
};

const ChecklistInternal: React.FC<WorkflowLandingChecklistProps> = ({
  result,
  runMode,
  onNextStep,
  nextStepPending = false,
  onAskAgent
}) => {
  const validated = result.validationErrors.length === 0;
  const wired = result.issues.length === 0;
  const failure = buildFailureMessage(result);
  const next = NEXT_STEP[runMode];

  return (
    <FlexColumn gap={GAP.normal}>
      <Line
        status="built"
        label={i18n.t("storyboard:attrs.graphBuilt", { defaultValue: "Graph built" })}
        detail={`${result.nodeCount} node${result.nodeCount === 1 ? "" : "s"} placed`}
      />
      <Line
        status={validated && wired ? "validated" : "failed"}
        label={i18n.t("storyboard:attrs.validated", { defaultValue: "Validated" })}
        detail={
          validated
            ? wired
              ? i18n.t("storyboard:attrs.noProblemsFound", { defaultValue: "No problems found" })
              : i18n.t("storyboard:attrs.validatesButPartOfThePlanIsUnwired", { defaultValue: "Validates, but part of the plan is unwired" })
            : `${result.validationErrors.length} error${
                result.validationErrors.length === 1 ? "" : "s"
              }`
        }
      />
      {/* Why a run did not start matters more than that it did not: the
          creator was told on the setup step that building would run it once,
          so a missing run is a promise this screen has to account for (F1, F8). */}
      <Line
        status={
          result.testRun.error !== null
            ? "failed"
            : result.status === "completed-with-output"
              ? "completed-with-output"
              : result.status === "running"
                ? "running"
                : result.status
        }
        label={i18n.t("storyboard:attrs.testRun", { defaultValue: "Test run" })}
        detail={
          result.status === "completed-with-output"
            ? outputDetail(result.output ?? result.testRun.output)
            : result.status === "running"
              ? i18n.t("storyboard:attrs.runningWithYourSampleInputs", { defaultValue: "Running with your sample inputs" })
              : (result.testRun.error ??
                (validated
                  ? i18n.t("storyboard:attrs.notStartedPartOfThePlanIsUnwired", { defaultValue: "Not started — part of the plan is unwired" })
                  : i18n.t("storyboard:attrs.notStartedTheGraphDidNotValidate", { defaultValue: "Not started — the graph did not validate" })))
        }
      />

      {failure === null ? (
        <FlexRow gap={GAP.normal} align="center">
          <EditorButton
            variant="contained"
            onClick={() => void onNextStep()}
            disabled={nextStepPending}
          >
            {i18n.t(next.labelKey, { defaultValue: next.label })}
          </EditorButton>
          <Caption color="secondary">{i18n.t(next.detailKey, { defaultValue: next.detail })}</Caption>
        </FlexRow>
      ) : (
        <AlertBanner
          severity="error"
          title={i18n.t("storyboard:attrs.thisNeedsAFixBeforeItWorks", { defaultValue: "This needs a fix before it works" })}
          action={
            <EditorButton variant="text" onClick={() => onAskAgent(failure)}>
              Ask the agent
            </EditorButton>
          }
        >
          <Caption component="span">{failure.split("\n")[0]}</Caption>
        </AlertBanner>
      )}
    </FlexColumn>
  );
};

interface LineProps {
  status: WorkflowBuildStatus;
  label: string;
  detail: string;
}

const Line: React.FC<LineProps> = ({ status, label, detail }) => (
  <FlexRow gap={GAP.normal} align="center">
    <StatusPill tone={statusTone(status)}>{status}</StatusPill>
    <Text size="small" component="span">
      {label}
    </Text>
    <Caption color="secondary">{detail}</Caption>
  </FlexRow>
);

export const WorkflowLandingChecklist = memo(ChecklistInternal);
WorkflowLandingChecklist.displayName = "WorkflowLandingChecklist";

export default WorkflowLandingChecklist;
