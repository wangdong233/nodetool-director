/**
 * The Game flow's landing checklist, at the top of the agent panel
 * (game-prd § 4.4).
 *
 * Four lines and the failures: the graph that was built, the assets checked so
 * far, where the project was written, and whether Godot verified it. The rows
 * read the run's own results (`useGameRunSummary`), so they fill in while the
 * canvas runs rather than reporting a snapshot taken at build time.
 *
 * `Verified with Godot 4.3` shows only when the export node said
 * `verified: true` (criterion 7, D28). A server without a Godot binary says so
 * and hands over the folder and the zip; it never reports green from a
 * verification that was skipped.
 *
 * Nothing here fixes anything. The next steps open the folder, download the
 * zip, hand the project to the agent for a play-test, or run the graph again —
 * each one on the creator's click.
 */

import React, { memo } from "react";

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
import type { BuildGameResult } from "../../../hooks/game/useBuildGame";
import type {
  GameRunSummary,
  GameVerificationState,
  GameVerificationStatus
} from "./gameRunSummary";
import { i18n } from "../../../i18n";
import { useTranslation } from "react-i18next";

/** One i18n key per verification status, so the pill reads in the UI language. */
const VERIFICATION_STATE_KEYS: Record<GameVerificationStatus, string> = {
  queued: "storyboard:attrs.verificationState.queued",
  running: "storyboard:attrs.verificationState.running",
  passed: "storyboard:attrs.verificationState.passed",
  failed: "storyboard:attrs.verificationState.failed",
  unavailable: "storyboard:attrs.verificationState.unavailable",
  interrupted: "storyboard:attrs.verificationState.interrupted"
};

export interface GameLandingChecklistProps {
  result: BuildGameResult;
  run: GameRunSummary;
  /** The Godot minor the chosen template targets, e.g. "4.3". */
  godot: string;
  /** Opens a `workspace-file` tab on `<directory>/project.godot`. */
  onOpenFolder: () => void;
  /** Downloads the `games/<slug>.zip` the export node wrote. */
  onDownload: () => void;
  /** Stages the first turn and opens a project chat tab. */
  onPlayTest: () => void;
  /** Runs the graph again. */
  onRegenerate: () => void;
}

/** The message the agent panel opens with when the build did not come out clean. */
export const gameFailureMessage = (
  result: BuildGameResult,
  run: GameRunSummary
): string | null => {
  if (result.validationErrors.length > 0) {
    return [
      "The graph I just built does not validate:",
      ...result.validationErrors.map((error) => `- ${error}`),
      "",
      "Propose a fix and wait for me before changing the graph."
    ].join("\n");
  }
  if (result.issues.length > 0) {
    return [
      "The graph I just built validates, but part of it was never placed:",
      ...result.issues.map((issue) => `- ${issue}`),
      "",
      "That means slots go unfilled or no project is written. Propose a fix and wait for me."
    ].join("\n");
  }
  if (result.run.error !== null) {
    return [
      `The run did not start: ${result.run.error}`,
      "",
      "Propose a fix and wait for me before changing the graph."
    ].join("\n");
  }
  if (run.failures.length > 0) {
    return [
      "Some of the game's assets failed:",
      ...run.failures.map(
        (failure) => `- ${failure.slotId ?? failure.nodeId}: ${failure.error}`
      ),
      "",
      "Propose a fix and wait for me before regenerating."
    ].join("\n");
  }
  return null;
};

const ChecklistInternal: React.FC<GameLandingChecklistProps> = ({
  result,
  run,
  godot,
  onOpenFolder,
  onDownload,
  onPlayTest,
  onRegenerate
}) => {
  const { t } = useTranslation();
  const exported = run.directory !== null;
  const failure = gameFailureMessage(result, run);
  const verification = verificationLine(run.verification, godot);
  return (
    <FlexColumn gap={GAP.normal}>
      <Line
        done
        label={t("storyboard:attrs.graphBuilt", { defaultValue: "Graph built" })}
        detail={t("storyboard:attrs.nodesPlaced", {
          count: result.nodeCount,
          defaultValue: "{{count}} nodes placed"
        })}
      />
      <Line
        done={run.total > 0 && run.checked === run.total}
        label={t("editor:ui.assetsChecked", { defaultValue: "Assets checked" })}
        detail={
          run.total === 0
            ? t("storyboard:attrs.thisProjectKeepsTheTemplatesOwnArt", { defaultValue: "This project keeps the template's own art" })
            : t("storyboard:attrs.checkedOfTotal", {
                checked: run.checked,
                total: run.total,
                defaultValue: "{{checked}} of {{total}}"
              })
        }
      />
      <Line
        done={exported}
        label={t("storyboard:attrs.exported", { defaultValue: "Exported" })}
        detail={run.directory ?? t("storyboard:attrs.waitingForTheExportNode", { defaultValue: "Waiting for the export node" })}
      />
      <VerificationLine
        state={run.verification.status}
        label={verification.label}
        detail={verification.detail}
      />

      {run.failures.map((entry) => (
        <Line
          key={entry.nodeId}
          done={false}
          label={entry.slotId ?? entry.nodeId}
          detail={entry.error}
        />
      ))}

      {failure === null ? (
        <FlexRow gap={GAP.normal} align="center" wrap>
          <EditorButton
            variant="contained"
            onClick={onOpenFolder}
            disabled={!exported}
          >{t("storyboard:attrs.openProjectFolder", { defaultValue: "Open project folder" })}</EditorButton>
          <EditorButton
            variant="outlined"
            onClick={onDownload}
            disabled={run.archive === null}
          >{t("storyboard:attrs.downloadProject", { defaultValue: "Download project" })}</EditorButton>
          <EditorButton
            variant="outlined"
            onClick={onPlayTest}
            disabled={!exported}
          >
            {t("editor:ui.playTestWithTheAgent")}
          </EditorButton>
          <EditorButton variant="text" onClick={onRegenerate}>{t("storyboard:attrs.regenerate", { defaultValue: "Regenerate" })}</EditorButton>
        </FlexRow>
      ) : (
        <AlertBanner
          severity="error"
          title={t("storyboard:attrs.thisNeedsAFixBeforeItPlays", { defaultValue: "This needs a fix before it plays" })}
          action={
            <EditorButton variant="text" onClick={onRegenerate}>{t("storyboard:attrs.regenerate", { defaultValue: "Regenerate" })}</EditorButton>
          }
        >
          <Caption component="span">{failure.split("\n")[0]}</Caption>
        </AlertBanner>
      )}
    </FlexColumn>
  );
};

interface LineProps {
  done: boolean;
  label: string;
  detail: string;
}

const Line: React.FC<LineProps> = ({ done, label, detail }) => {
  const { t } = useTranslation();
  return (
    <FlexRow gap={GAP.normal} align="center">
      <StatusPill tone={done ? "done" : "failed"}>
        {done
          ? t("storyboard:attrs.statusDone", { defaultValue: "done" })
          : t("storyboard:attrs.statusTodo", { defaultValue: "todo" })}
      </StatusPill>
      <Text size="small" component="span">
        {label}
      </Text>
      <Caption color="secondary">{detail}</Caption>
    </FlexRow>
  );
};

const missingGodot = (reason: string | undefined): boolean => {
  const normalized = reason?.toLowerCase() ?? "";
  return (
    normalized.includes("godot") &&
    (normalized.includes("binary") ||
      normalized.includes("executable") ||
      normalized.includes("path"))
  );
};

const verificationLine = (
  verification: GameVerificationState,
  godot: string
): { label: string; detail: string } => {
  switch (verification.status) {
    case "passed":
      return {
        label: i18n.t("storyboard:attrs.verifiedWithGodot", { defaultValue: "Verified with Godot {{version}}", version: godot }),
        detail: i18n.t("storyboard:attrs.theProjectOpenedAndRanHeadlessly", { defaultValue: "The project opened and ran headlessly" })
      };
    case "running":
      return {
        label: i18n.t("editor:ui.verificationRunning", { defaultValue: "Verification running" }),
        detail: i18n.t("storyboard:attrs.godotChecksAreInProgress", { defaultValue: "Godot checks are in progress" })
      };
    case "failed":
      return {
        label: i18n.t("editor:ui.verificationFailed", { defaultValue: "Verification failed" }),
        detail: verification.reason ?? i18n.t("storyboard:attrs.godotRejectedTheExportedProject", { defaultValue: "Godot rejected the exported project" })
      };
    case "unavailable":
      return missingGodot(verification.reason)
        ? {
            label: i18n.t("storyboard:attrs.godotNotFoundOnThisServerOpenTheFolderInGodotToVerify", { defaultValue: "Godot not found on this server — open the folder in Godot {{version}} to verify", version: godot }),
            detail: verification.reason ?? i18n.t("storyboard:attrs.godotVerificationIsUnavailable", { defaultValue: "Godot verification is unavailable" })
          }
        : {
            label: i18n.t("editor:ui.verificationUnavailable", { defaultValue: "Verification unavailable" }),
            detail: verification.reason ?? i18n.t("storyboard:attrs.godotVerificationCouldNotRun", { defaultValue: "Godot verification could not run" })
          };
    case "interrupted":
      return {
        label: i18n.t("editor:ui.verificationInterrupted", { defaultValue: "Verification interrupted" }),
        detail: verification.reason ?? i18n.t("storyboard:attrs.theRunWasCancelled", { defaultValue: "The run was cancelled" })
      };
    default:
      return {
        label: i18n.t("editor:ui.verificationQueued", { defaultValue: "Verification queued" }),
        detail: i18n.t("storyboard:attrs.waitingForTheExportNode", { defaultValue: "Waiting for the export node" })
      };
  }
};

interface VerificationLineProps {
  state: GameVerificationState["status"];
  label: string;
  detail: string;
}

const VerificationLine: React.FC<VerificationLineProps> = ({
  state,
  label,
  detail
}) => {
  const { t } = useTranslation();
  const tone =
    state === "passed"
      ? "done"
      : state === "running"
        ? "rendering"
        : state === "queued"
          ? "neutral"
          : state === "failed"
            ? "failed"
            : "warning";
  return (
    <FlexRow gap={GAP.normal} align="center">
      <StatusPill tone={tone}>
        {t(VERIFICATION_STATE_KEYS[state], { defaultValue: state })}
      </StatusPill>
      <Text size="small" component="span">
        {label}
      </Text>
      <Caption color="secondary">{detail}</Caption>
    </FlexRow>
  );
};

export const GameLandingChecklist = memo(ChecklistInternal);
GameLandingChecklist.displayName = "GameLandingChecklist";

export default GameLandingChecklist;
