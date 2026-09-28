import React, { memo, useMemo, useState } from "react";
import MoreTimeOutlinedIcon from "@mui/icons-material/MoreTimeOutlined";
import { captureExtensionSource } from "@nodetool-ai/timeline";
import type { ExtensionRequest, ExtensionTiming } from "@nodetool-ai/timeline";
import { useTimelineStore } from "../../../stores/timeline/TimelineStore";
import { useVideoModelsByProvider } from "../../../hooks/useModelsByProvider";
import {
  useExtensionJobsStore,
  useTimelineExtension
} from "../../../hooks/timeline/useTimelineExtension";
import { isElectron, isLocalhost } from "../../../lib/env";
import {
  Caption,
  CollapsibleSection,
  EditorButton,
  EmptyState,
  FlexColumn,
  LoadingSpinner,
  SelectField,
  SPACING,
  TextInput,
  VideoPlayer
} from "../../ui_primitives";
import { InspectorSectionTitle } from "./InspectorPrimitives";
import { i18n } from "../../../i18n";

const TIMING_OPTIONS: ReadonlyArray<{ value: ExtensionTiming; label: string; labelKey: string }> =
  [
    { value: "keep-cut", label: "Keep cut and retain handles", labelKey: "timeline:attrs.keepCutAndRetainHandles" },
    { value: "available-space", label: "Extend into available space", labelKey: "timeline:attrs.extendIntoAvailableSpace" },
    { value: "ripple", label: "Extend and ripple later clips", labelKey: "timeline:attrs.extendAndRippleLaterClips" }
  ];

const ExtendClipPanel: React.FC<{ clipId: string }> = ({ clipId }) => {
  const clip = useTimelineStore((state) =>
    state.clips.find((item) => item.id === clipId)
  );
  const sequenceId = useTimelineStore((state) => state.sequenceId);
  const {
    models,
    isLoading,
    error: modelError
  } = useVideoModelsByProvider({ task: "extend_video" });
  const modelsForTask = useMemo(
    () =>
      models.filter(
        (model) =>
          model.supported_tasks?.includes("extend_video") &&
          (isLocalhost || isElectron || model.provider === "nodetool")
      ),
    [models]
  );
  const [modelKey, setModelKey] = useState("");
  const [direction, setDirection] = useState<"start" | "end">("end");
  const [duration, setDuration] = useState("3");
  const [intent, setIntent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const allJobs = useExtensionJobsStore((state) => state.jobs);
  const jobs = useMemo(
    () =>
      Object.values(allJobs).filter(
        (job) =>
          job.request.sequenceId === sequenceId &&
          job.request.source.clipId === clipId
      ),
    [allJobs, clipId, sequenceId]
  );
  const { start, recover, apply } = useTimelineExtension(sequenceId);
  const model =
    modelsForTask.find((item) => `${item.provider}:${item.id}` === modelKey) ??
    modelsForTask[0];
  const hasDirectionTasks = model?.supported_tasks?.some(
    (task) => task === "extend_video_start" || task === "extend_video_end"
  );
  const directionOptions = [
    ...(!hasDirectionTasks ||
    model?.supported_tasks?.includes("extend_video_start")
      ? [{ value: "start" as const, label: "Start" }]
      : []),
    ...(!hasDirectionTasks || model?.supported_tasks?.includes("extend_video_end")
      ? [{ value: "end" as const, label: "End" }]
      : [])
  ];
  const selectedDirection = directionOptions.some(
    (option) => option.value === direction
  )
    ? direction
    : directionOptions[0]?.value ?? "end";
  const pending = jobs.some((job) => job.status === "running");
  const eligibility = clip ? captureExtensionSource(clip) : null;

  if (!clip || clip.mediaType !== "video") {
    return null;
  }
  const submit = async (): Promise<void> => {
    if (!model) {
      return;
    }
    setError(null);
    try {
      await start({
        clipId,
        direction: selectedDirection,
        addedSourceDurationMs: Number(duration) * 1000,
        prompt: intent,
        model: {
          id: model.id,
          provider: model.provider,
          supportedTasks: model.supported_tasks,
          durations: model.durations ?? undefined
        }
      });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  };
  const handleApplyCandidate = (
    request: ExtensionRequest,
    timing: ExtensionTiming
  ): void => {
    setError(null);
    try {
      apply(request, timing);
      setPreview(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  };

  return (
    <CollapsibleSection
      title={
        <InspectorSectionTitle title={i18n.t("timeline:attrs.extend", { defaultValue: "Extend" })} icon={<MoreTimeOutlinedIcon />} />
      }
      defaultOpen
    >
      <FlexColumn gap={SPACING.md} sx={{ p: SPACING.md }}>
        {!eligibility?.ok ? (
          <Caption color="secondary">{eligibility?.error}</Caption>
        ) : (
          <>
            {isLoading ? (
              <LoadingSpinner size="small" />
            ) : !model ? (
              <EmptyState
                variant="empty"
                size="small"
                title={i18n.t("timeline:attrs.noExtensionModelAvailable", { defaultValue: "No extension model available" })}
                description={
                  modelError
                    ? i18n.t("timeline:attrs.couldNotLoadExtensionModelsTryAgainWhenConnected", { defaultValue: "Could not load extension models. Try again when connected." })
                    : i18n.t("timeline:attrs.connectAProviderWithAVideoExtensionModelToUseExtend", { defaultValue: "Connect a provider with a video extension model to use Extend." })
                }
              />
            ) : (
              <>
                <SelectField
                  label={i18n.t("timeline:attrs.extensionModel", { defaultValue: "Extension model" })}
                  value={`${model.provider}:${model.id}`}
                  options={modelsForTask.map((item) => ({
                    value: `${item.provider}:${item.id}`,
                    label: item.name
                  }))}
                  onChange={setModelKey}
                  disabled={pending}
                />
                <SelectField
                  label={i18n.t("timeline:attrs.extendFrom", { defaultValue: "Extend from" })}
                  value={selectedDirection}
                  options={directionOptions}
                  onChange={(value) =>
                    setDirection(value === "start" ? "start" : "end")
                  }
                  disabled={pending}
                />
                <TextInput
                  label={i18n.t("timeline:attrs.addedSourceSeconds", { defaultValue: "Added source seconds" })}
                  type="number"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  disabled={pending}
                  inputProps={{ min: 0, step: 1 }}
                  compact
                  fullWidth
                />
                <TextInput
                  label={i18n.t("timeline:attrs.extensionIntent", { defaultValue: "Extension intent" })}
                  value={intent}
                  onChange={(event) => setIntent(event.target.value)}
                  disabled={pending}
                  multiline
                  minRows={2}
                  compact
                  fullWidth
                />
                <EditorButton
                  onClick={submit}
                  disabled={
                    pending ||
                    !intent.trim() ||
                    !sequenceId ||
                    !(Number(duration) > 0)
                  }
                >
                  {pending ? "Extending…" : "Generate extension"}
                </EditorButton>
              </>
            )}
          </>
        )}
        {jobs.map((job) => {
          const take = clip.versions?.find(
            (item) => item.id === job.request.requestId
          );
          const accepted = take?.id === clip.activeTakeId;
          return (
            <FlexColumn key={job.request.requestId} gap={SPACING.sm}>
              {take ? (
                <>
                  <Caption>
                    {job.request.direction === "start" ? i18n.t("timeline:attrs.start", { defaultValue: "Start" }) : i18n.t("ui2:attrs.end", { defaultValue: "End" })}{" "}
                    {i18n.t("timeline:attrs.extensionSeconds", { defaultValue: "extension, {{n}}s", n: job.request.addedSourceDurationMs / 1000 })}
                    {accepted ? i18n.t("timeline:attrs.inUseSuffix", { defaultValue: " · In use" }) : i18n.t("timeline:attrs.candidateSuffix", { defaultValue: " · Candidate" })}
                  </Caption>
                  <EditorButton
                    onClick={() =>
                      setPreview(preview === take.assetId ? null : take.assetId)
                    }
                  >
                    {preview === take.assetId
                      ? i18n.t("timeline:attrs.closePreview", { defaultValue: "Close preview" })
                      : i18n.t("timeline:attrs.previewExtension", { defaultValue: "Preview extension" })}
                  </EditorButton>
                  {preview === take.assetId && (
                    <VideoPlayer
                      locator={`asset://${take.assetId}`}
                      label={i18n.t("timeline:attrs.extensionCandidate", { defaultValue: "Extension candidate" })}
                    />
                  )}
                  {TIMING_OPTIONS.map((option) => (
                    <EditorButton
                      key={option.value}
                      disabled={accepted}
                      onClick={() =>
                        handleApplyCandidate(job.request, option.value)
                      }
                    >
                      {i18n.t(option.labelKey, { defaultValue: option.label })}
                    </EditorButton>
                  ))}
                </>
              ) : job.status !== "running" ? (
                <>
                  {job.error && <Caption color="error">{job.error}</Caption>}
                  <EditorButton onClick={() => recover(job.request)}>{i18n.t("timeline:attrs.recoverExtension", { defaultValue: "Recover extension" })}</EditorButton>
                </>
              ) : (
                <Caption color="secondary">{i18n.t("timeline:attrs.extensionGenerationIsRunning", { defaultValue: "Extension generation is running." })}</Caption>
              )}
            </FlexColumn>
          );
        })}
        {error && <Caption color="error">{error}</Caption>}
      </FlexColumn>
    </CollapsibleSection>
  );
};

export default memo(ExtendClipPanel);
