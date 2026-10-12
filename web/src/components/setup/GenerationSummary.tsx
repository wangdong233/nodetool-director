import { formatUsd } from "@nodetool-ai/model-pricing";
import { isModelSelected } from "@nodetool-ai/protocol";
import { useTranslation } from "react-i18next";
import {
  Caption,
  FlexColumn,
  FlexRow,
  GAP,
  Label,
  Text,
  Tooltip
} from "../ui_primitives";
import { generationEstimate, type GenerationModel } from "./generationEstimate";
import { i18n } from "../../i18n";

export interface GenerationSummaryProps {
  result: string;
  next: string;
  model: GenerationModel | null;
  brief: string;
  maxOutputTokens: number;
  /** Input the brief does not show, such as attached images. */
  extraInputTokens?: number;
  /** Imported attributed text or a preset plan needs no model call. */
  noModelCall?: boolean;
  /** Keep a secondary action's estimate compact beside its own controls. */
  compact?: boolean;
  /** Use shorter copy for the video flow's inline generation summary. */
  concise?: boolean;
  /** Hide the token assumptions when the estimate adds clutter. */
  hideTokenEstimate?: boolean;
}

export interface GenerationEstimateLineProps extends GenerationSummaryProps {
  /** The model's name is already on a picker beside the line. */
  hideModel?: boolean;
}

/**
 * The run's estimate as one line for the setup footer: model, cost, wait.
 * What the run produces and the token assumptions sit in a tooltip, so the
 * footer holds the numbers and nothing else. The line takes focus and opens on
 * a tap, so the details reach keyboard and touch as well as a mouse.
 */
export function GenerationEstimateLine({
  result,
  model: rawModel,
  brief,
  maxOutputTokens,
  extraInputTokens,
  noModelCall,
  hideModel = false
}: GenerationEstimateLineProps) {
  const { t } = useTranslation();
  // The "empty" sentinel is no choice, whatever default id it carries.
  const model = isModelSelected(rawModel) ? rawModel : null;
  const estimate = noModelCall
    ? null
    : generationEstimate(model, brief, maxOutputTokens, extraInputTokens);
  const parts = [
    hideModel || noModelCall
      ? null
      : (model?.name ?? model?.id ?? t("setup:estimate.noModelSelected", { defaultValue: "No model selected" })),
    noModelCall
      ? t("setup:estimate.noModelCall", { defaultValue: "No model call" })
      : estimate
        ? estimate.high === 0
          ? t("setup:estimate.zeroLocal", { defaultValue: "$0 (local)" })
          : `~${formatUsd(estimate.low)}–${formatUsd(estimate.high)}`
        : t("setup:estimate.costUnknown", { defaultValue: "Cost unknown" }),
    noModelCall ? null : t("setup:estimate.tilde3060s", { defaultValue: "~30–60s" })
  ].filter((part): part is string => part !== null);
  const assumptions =
    estimate && estimate.high > 0
      ? t("setup:estimate.aboutInputAndOutputTokens", {
          defaultValue:
            " About {{input}} input and 1,000–{{output}} output tokens. Actual usage may cost more.",
          input: estimate.inputTokens.toLocaleString(),
          output: maxOutputTokens.toLocaleString()
        })
      : "";
  return (
    <Tooltip
      title={`${result}.${assumptions}`}
      describeChild
      enterTouchDelay={0}
      leaveTouchDelay={6000}
    >
      <Text
        size="small"
        color="secondary"
        component="span"
        role="group"
        aria-label={t("storyboard:attrs.beforeYouGenerate", { defaultValue: "Before you generate" })}
        tabIndex={0}
        sx={{ whiteSpace: "nowrap", cursor: "help" }}
      >
        {parts.join(" · ")}
      </Text>
    </Tooltip>
  );
}

export default function GenerationSummary({
  result,
  next,
  model: rawModel,
  brief,
  maxOutputTokens,
  extraInputTokens,
  noModelCall,
  compact = false,
  concise = false,
  hideTokenEstimate = false
}: GenerationSummaryProps) {
  const { t } = useTranslation();
  // The "empty" sentinel is no choice, whatever default id it carries.
  const model = isModelSelected(rawModel) ? rawModel : null;
  const estimate = noModelCall
    ? null
    : generationEstimate(model, brief, maxOutputTokens, extraInputTokens);
  const cost = noModelCall
    ? i18n.t("storyboard:attrs.zeroNoModelCall", { defaultValue: "$0, no model call" })
    : estimate
      ? estimate.high === 0
        ? i18n.t("storyboard:attrs.zeroProviderCostLocalModel", { defaultValue: "$0 provider cost (local model)" })
        : t("setup:estimate.roughCost", {
            defaultValue: "Rough cost: {{low}}–{{high}}",
            low: formatUsd(estimate.low),
            high: formatUsd(estimate.high)
          })
      : i18n.t("storyboard:attrs.costEstimateUnavailableForThisModel", { defaultValue: "Cost estimate unavailable for this model" });
  return (
    <FlexColumn
      gap={GAP.tight}
      role="region"
      aria-label={compact ? result : i18n.t("storyboard:attrs.beforeYouGenerate", { defaultValue: "Before you generate" })}
    >
      {!compact ? <Label>{result}</Label> : null}
      <Text size="small" color="secondary">
        {next}
      </Text>
      <FlexRow gap={GAP.spacious} wrap>
        <Text size="small">
          {noModelCall
            ? i18n.t("storyboard:attrs.usesTheExistingTextOrPreset", { defaultValue: "Uses the existing text or preset" })
            : i18n.t("storyboard:attrs.modelNameProvider", { defaultValue: "Model: {{name}}{{provider}}", name: model?.name ?? model?.id ?? i18n.t("storyboard:attrs.notSelected", { defaultValue: "Not selected" }), provider: model ? ` (${model.provider})` : "" })}
        </Text>
        <Text size="small">{cost}</Text>
        <Text size="small">
          {noModelCall
            ? i18n.t("storyboard:attrs.readyImmediately", { defaultValue: "Ready immediately" })
            : concise || compact
              ? i18n.t("storyboard:attrs.roughWait3060sOrLonger", { defaultValue: "Rough wait: 30–60s or longer" })
              : i18n.t("storyboard:attrs.roughWait3060SecondsLongerForLargeRequestsOrSlowerModels", { defaultValue: "Rough wait: 30–60 seconds; longer for large requests or slower models" })}
        </Text>
      </FlexRow>
      {estimate && estimate.high > 0 && !hideTokenEstimate ? (
        <Caption color="secondary">
          {concise
            ? i18n.t("storyboard:attrs.estimateInputOutputTokensConcise", { defaultValue: "Estimate: ~{{input}} input tokens and 1,000–{{output}} output tokens. Actual usage may cost more.", input: estimate.inputTokens.toLocaleString(), output: maxOutputTokens.toLocaleString() })
            : i18n.t("storyboard:attrs.assumesAboutInputOutputTokens", { defaultValue: "Assumes about {{input}} input tokens and 1,000–{{output}} output tokens. Actual usage, including reasoning, may cost more.", input: estimate.inputTokens.toLocaleString(), output: maxOutputTokens.toLocaleString() })}
        </Caption>
      ) : null}
    </FlexColumn>
  );
}
