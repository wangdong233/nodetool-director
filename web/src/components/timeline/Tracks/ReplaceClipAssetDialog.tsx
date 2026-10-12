/**
 * Asset picker behind "Replace clip…" in the clip context menu and the
 * inspector's replace-output button. Picking an asset makes it the clip's
 * current output; generation state and param overrides stay as they are.
 *
 * The clip context menu unmounts the moment an item is clicked, so its caller
 * mounts this dialog only once the action has asked for it.
 */

import React, { memo, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ClipMediaType } from "@nodetool-ai/timeline";
import { useTimelineStore } from "../../../stores/timeline/TimelineStore";
import { findClipById } from "../../../stores/timeline/clipLookup";
import { MentionAssetTile } from "../../node_types/editing/promptComposer/MentionAssetTile";
import { useAssetMentionSearch } from "../../node_types/editing/promptComposer/useAssetMentionSearch";
import {
  Caption,
  Dialog,
  EmptyState,
  FlexColumn,
  FlexRow,
  ScrollArea,
  SearchInput,
  SPACING
} from "../../ui_primitives";

/** Fixed so the dialog does not resize while results load. */
const PANEL_HEIGHT = 360;

/**
 * The content-type prefix a replacement must share with the clip, so a video
 * clip is only offered videos. Kinds without a backing media file offer
 * every asset.
 */
export const replacementContentType = (
  mediaType: ClipMediaType | undefined
): string | undefined => {
  switch (mediaType) {
    case "image":
    case "video":
    case "audio":
      return `${mediaType}/`;
    case "model3d":
      return "model/";
    default:
      return undefined;
  }
};

/** Resolve the lowercase kind noun used in the dialog's sentences. */
const kindLabelFor = (
  t: ReturnType<typeof useTranslation>["t"],
  contentType: string | undefined
): string =>
  contentType === "image/"
    ? t("timeline:attrs.kindImages", { defaultValue: "images" })
    : contentType === "video/"
      ? t("timeline:attrs.kindVideos", { defaultValue: "videos" })
      : contentType === "audio/"
        ? t("timeline:attrs.kindAudioFiles", { defaultValue: "audio files" })
        : contentType === "model/"
          ? t("timeline:attrs.kind3dModels", { defaultValue: "3D models" })
          : t("timeline:attrs.kindAssets", { defaultValue: "assets" });

interface ReplaceClipAssetDialogProps {
  clipId: string;
  onClose: () => void;
}

export const ReplaceClipAssetDialog: React.FC<ReplaceClipAssetDialogProps> =
  memo(({ clipId, onClose }) => {
    const { t } = useTranslation();
    const replaceClipOutput = useTimelineStore((s) => s.replaceClipOutput);
    const mediaType = useTimelineStore(
      (s) => findClipById(s.clips, clipId)?.mediaType
    );
    const currentAssetId = useTimelineStore(
      (s) => findClipById(s.clips, clipId)?.currentAssetId
    );
    const contentType = replacementContentType(mediaType);
    const kindLabel = kindLabelFor(t, contentType);

    const [query, setQuery] = useState("");
    const { displayedAssets, hasMoreSaved, loadMoreSaved, handleRename } =
      useAssetMentionSearch(query, "saved", contentType);

    const handleScroll = useCallback(
      (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        if (
          hasMoreSaved &&
          el.scrollHeight - el.scrollTop - el.clientHeight < 120
        ) {
          loadMoreSaved();
        }
      },
      [hasMoreSaved, loadMoreSaved]
    );

    const handlePick = useCallback(
      (assetId: string) => {
        if (assetId !== currentAssetId) {
          replaceClipOutput(clipId, assetId);
        }
        onClose();
      },
      [clipId, currentAssetId, onClose, replaceClipOutput]
    );

    return (
      <Dialog
        open
        onClose={onClose}
        title={t("editor:ui.replaceClip", { defaultValue: "Replace Clip" })}
        maxWidth="sm"
        fullWidth
      >
        <FlexColumn gap={SPACING.md}>
          <Caption color="secondary">
            {t("timeline:attrs.pickOneOfYourKind", {
              defaultValue:
                "Pick one of your {{kind}} to use as the clip's output. The generation state and param overrides will not be changed.",
              kind: kindLabel
            })}
          </Caption>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={t("timeline:attrs.searchKind", { defaultValue: "Search {{kind}}", kind: kindLabel })}
            ariaLabel={t("timeline:attrs.searchKind", { defaultValue: "Search {{kind}}", kind: kindLabel })}
            size="small"
            autoFocus
            fullWidth
          />
          {displayedAssets.length === 0 ? (
            <EmptyState
              variant={query ? "no-results" : "empty"}
              title={query
                ? t("timeline:attrs.noKindMatch", { defaultValue: "No {{kind}} match", kind: kindLabel })
                : t("timeline:attrs.noKindYet", { defaultValue: "No {{kind}} yet", kind: kindLabel })}
              description={
                query
                  ? t("editor:ui.tryAnotherName", { defaultValue: "Try another name." })
                  : t("editor:ui.uploadAFileOrGenerateOneFirst", { defaultValue: "Upload a file or generate one first." })
              }
              size="small"
            />
          ) : (
            <ScrollArea sx={{ height: PANEL_HEIGHT }} onScroll={handleScroll}>
              <FlexRow
                wrap
                gap={SPACING.xs}
                role="listbox"
                aria-label={t("timeline:attrs.replacementKind", { defaultValue: "Replacement {{kind}}", kind: kindLabel })}
              >
                {displayedAssets.map((asset) => (
                  <MentionAssetTile
                    key={asset.id}
                    asset={asset}
                    selected={asset.id === currentAssetId}
                    onSelect={() => handlePick(asset.id)}
                    onRename={handleRename}
                    focusable
                  />
                ))}
              </FlexRow>
            </ScrollArea>
          )}
        </FlexColumn>
      </Dialog>
    );
  });

ReplaceClipAssetDialog.displayName = "ReplaceClipAssetDialog";
