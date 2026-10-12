/**
 * The examples browser, inline in step 1 (PRD § 11.1: "the examples browser
 * inline. Picking one copies it, stage `done`, opens the canvas").
 *
 * It used to open the full Examples page in a tab of its own, and the flow
 * finished the moment the tab opened — so the creator came back to an empty
 * canvas and the example was never copied. The browser lives here now: the
 * pick and the copy are one action, and cancelling leaves the creator on the
 * idea step with their brief intact.
 *
 * The list is the same `["templates"]` query the dashboard's example browser
 * uses, so opening this costs nothing once either has loaded.
 */

import React, { memo, useMemo, useState } from "react";
import { useAppLanguage } from "../../../i18n";
import {
  workflowTemplateCopy,
  workflowTemplateSearchAlias
} from "../../../i18n/workflowTemplateCopy";
import { useQuery } from "@tanstack/react-query";

import {
  AlertBanner,
  Caption,
  EditorButton,
  EmptyState,
  FlexColumn,
  FlexRow,
  GAP,
  LoadingSpinner,
  SearchInput,
  Text
} from "../../ui_primitives";
import { useWorkflowManager } from "../../../contexts/WorkflowManagerContext";
import type { Workflow, WorkflowList } from "../../../stores/ApiTypes";
import ReportBugButton from "../../support/ReportBugButton";
import { OptionCardGrid } from "../OptionCardGrid";
import type { OptionCardItem } from "../OptionCardGrid";
import { useTranslation } from "react-i18next";

export interface WorkflowExamplePickerProps {
  /** Copies the picked example. The host owns where the copy lands. */
  onPick: (example: Workflow) => void;
  /** The example being copied, so the grid cannot be pressed twice. */
  pickingId?: string | null;
  /** Why the last copy was refused. */
  error?: string | null;
  /** Back to the idea step, with the brief still there. */
  onCancel: () => void;
}

const PickerInternal: React.FC<WorkflowExamplePickerProps> = ({
  onPick,
  pickingId = null,
  error = null,
  onCancel
}) => {
  const { t } = useTranslation();
  // Re-render anchor + memo dep for the zh overlay below (F-26).
  const { version: languageVersion } = useAppLanguage();
  const loadTemplates = useWorkflowManager((state) => state.loadTemplates);
  const [query, setQuery] = useState("");
  const {
    data,
    isLoading,
    isError,
    error: listError,
    refetch
  } = useQuery<WorkflowList>({
    queryKey: ["templates"],
    queryFn: loadTemplates
  });

  const examples = useMemo(() => data?.workflows ?? [], [data]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === "") {
      return examples;
    }
    return examples.filter((example) => {
      // Bilingual search: English fields stay intact, zh copy joins as an
      // alias field (F-32 rule ③).
      const haystack = [
        example.name,
        example.description,
        ...(example.tags ?? [])
      ]
        .filter((part): part is string => typeof part === "string")
        .join(" ")
        .toLowerCase();
      const alias = workflowTemplateSearchAlias(example.id).toLowerCase();
      return `${haystack} ${alias}`.includes(needle);
    });
  }, [examples, query, languageVersion]);

  const options = useMemo<OptionCardItem[]>(
    () =>
      matches.map((example) => {
        // Render-time zh overlay (r28): English and zh-missing ids render the
        // backend values unchanged.
        const copy = workflowTemplateCopy(example);
        return {
          id: example.id,
          title: copy.name,
          description: copy.description || undefined,
          // One copy at a time: a second press while the first is in flight
          // makes a second workflow nobody asked for.
          disabled: pickingId !== null,
          disabledReason:
            pickingId === example.id ? t("storyboard:attrs.copyingThisOne", { defaultValue: "Copying this one" }) : t("storyboard:attrs.copyingAnExample", { defaultValue: "Copying an example" })
        };
      }),
    [matches, pickingId, languageVersion, t]
  );

  return (
    <FlexColumn gap={GAP.comfortable}>
      <FlexColumn gap={GAP.tight}>
        <Text size="big" component="h2">{t("storyboard:attrs.startFromAnExample", { defaultValue: "Start from an example" })}</Text>
        <Text size="normal" color="secondary">
          {t("editor:ui.pickOneAndWeCopyItOntoYourCanvasNothingRuns")}
        </Text>
      </FlexColumn>

      {error ? (
        <AlertBanner
          severity="error"
          action={
            <ReportBugButton
              context={{
                source: "operation-failure",
                summary: "Copying a workflow example failed",
                errorText: error
              }}
            />
          }
        >
          {error}
        </AlertBanner>
      ) : null}

      <FlexRow gap={GAP.normal} align="center" wrap>
        {/* The card that opened this browser is gone, so the keyboard lands
            here rather than on the page. */}
        <SearchInput
          autoFocus
          value={query}
          onChange={setQuery}
          placeholder={t("storyboard:attrs.searchExamples", { defaultValue: "Search examples" })}
          showClear
        />
        {/* A copy cannot be stopped once asked for, and it opens what it
            copied when it lands. Leaving meanwhile would be undone by that. */}
        <EditorButton
          variant="text"
          onClick={onCancel}
          disabled={pickingId !== null}
        >
          {t("setup:workflow.backToYourIdea", { defaultValue: "Back to your idea" })}
        </EditorButton>
      </FlexRow>

      {isLoading ? (
        <FlexRow gap={GAP.normal} align="center">
          <LoadingSpinner size="small" />
          <Caption color="secondary" component="span">{t("storyboard:attrs.readingTheExamplesThisInstallShips", { defaultValue: "Reading the examples this install ships…" })}</Caption>
        </FlexRow>
      ) : isError ? (
        <AlertBanner
          severity="error"
          action={
            <FlexRow gap={GAP.tight} align="center">
              <EditorButton
                variant="text"
                onClick={() => {
                  void refetch();
                }}
              >
                {t("storyboard:attrs.tryAgain", { defaultValue: "Try again" })}
              </EditorButton>
              <ReportBugButton
                context={{
                  source: "operation-failure",
                  summary: "Reading the workflow examples failed",
                  errorText:
                    listError?.message ?? "Could not read the examples."
                }}
              />
            </FlexRow>
          }
        >
          <Caption component="span">{t("storyboard:attrs.couldNotReadTheExamples", { defaultValue: "Could not read the examples." })}</Caption>
        </AlertBanner>
      ) : matches.length === 0 ? (
        <EmptyState
          title={
            examples.length === 0
              ? t("storyboard:attrs.thisInstallShipsNoExamples", { defaultValue: "This install ships no examples" })
              : t("storyboard:attrs.noExampleMatchesThat", { defaultValue: "No example matches that" })
          }
          description={
            examples.length === 0
              ? t("storyboard:attrs.describeTheTaskInsteadOrStartWithABlankCanvas", { defaultValue: "Describe the task instead, or start with a blank canvas." })
              : t("storyboard:attrs.tryAnotherWordOrDescribeTheTaskInstead", { defaultValue: "Try another word, or describe the task instead." })
          }
        />
      ) : (
        <OptionCardGrid
          label={t("storyboard:attrs.exampleWorkflows", { defaultValue: "Example workflows" })}
          options={options}
          onSelect={(id) => {
            const example = matches.find((entry) => entry.id === id);
            if (example) {
              onPick(example);
            }
          }}
          minColumnWidth={260}
        />
      )}

      {pickingId !== null ? (
        <FlexRow gap={GAP.normal} align="center">
          <LoadingSpinner size="small" />
          <Caption color="secondary" component="span">{t("storyboard:attrs.copyingTheExample", { defaultValue: "Copying the example…" })}</Caption>
        </FlexRow>
      ) : null}
    </FlexColumn>
  );
};

export const WorkflowExamplePicker = memo(PickerInternal);
WorkflowExamplePicker.displayName = "WorkflowExamplePicker";

export default WorkflowExamplePicker;
