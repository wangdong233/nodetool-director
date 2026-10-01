/**
 * ModeSelectChip — the chip that picks the composer's media mode, plus the
 * menu it opens. Mode-independent, so it sits beside `ModeChips` rather than
 * inside it.
 */
import React, { useCallback, useState } from "react";
import AudiotrackIcon from "@mui/icons-material/Audiotrack";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ImageIcon from "@mui/icons-material/Image";
import BurstModeIcon from "@mui/icons-material/BurstMode";
import MovieFilterIcon from "@mui/icons-material/MovieFilter";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import VideocamIcon from "@mui/icons-material/Videocam";

import MediaControlChip from "./MediaControlChip";
import MediaModeMenu from "./MediaModeMenu";
import type { MediaMode } from "../../../stores/MediaGenerationStore";
import { i18n } from "../../../i18n";

export function modeIconFor(mode: MediaMode): React.ReactNode {
  if (mode === "music") return <AudiotrackIcon fontSize="small" />;
  if (mode === "image") {
    return <ImageIcon fontSize="small" />;
  }
  if (mode === "image_edit") {
    return <AutoFixHighIcon fontSize="small" />;
  }
  if (mode === "video") {
    return <VideocamIcon fontSize="small" />;
  }
  if (mode === "image_to_video") {
    return <MovieFilterIcon fontSize="small" />;
  }
  if (mode === "reference_to_video") {
    return <BurstModeIcon fontSize="small" />;
  }
  if (mode === "audio") {
    return <RecordVoiceOverIcon fontSize="small" />;
  }
  if (mode === "chat") {
    return <ChatBubbleOutlineIcon fontSize="small" />;
  }
  return <AutoAwesomeIcon fontSize="small" />;
}

/**
 * The chip's label for a media mode, resolved at render time through the
 * catalog (unknown modes fall back to the shipped English word). The menu
 * items read their own keys — the chip's shorter labels ("Refs→Video") are
 * deliberately distinct strings.
 */
export function modeLabelFor(mode: MediaMode): string {
  switch (mode) {
    case "music":
      return i18n.t("editor:ui.music", { defaultValue: "Music" });
    case "image":
      return i18n.t("editor:ui.image", { defaultValue: "Image" });
    case "image_edit":
      return i18n.t("editor:ui.imageEdit", { defaultValue: "Image Edit" });
    case "video":
      return i18n.t("editor:ui.video", { defaultValue: "Video" });
    case "image_to_video":
      return i18n.t("editor:ui.imageToVideoShort", { defaultValue: "Image→Video" });
    case "reference_to_video":
      return i18n.t("editor:ui.refsToVideo", { defaultValue: "Refs→Video" });
    case "audio":
      return i18n.t("editor:ui.speech", { defaultValue: "Speech" });
    case "chat":
      return i18n.t("editor:ui.chat", { defaultValue: "Chat" });
    case "audio_to_video":
      return i18n.t("editor:ui.audioToVideoShort", { defaultValue: "Audio→Video" });
    case "retake":
      return i18n.t("editor:ui.retake", { defaultValue: "Retake" });
    case "extend":
      return i18n.t("editor:ui.extend", { defaultValue: "Extend" });
    default:
      return i18n.t("editor:ui.motion", { defaultValue: "Motion" });
  }
}

interface ModeSelectChipProps {
  mode: MediaMode;
  onChange: (mode: MediaMode) => void;
  modes?: readonly MediaMode[];
  /** Icon plus chevron only: the mode reads from its icon, and the label
   *  costs room the model and workspace chips need on one line. */
  compact?: boolean;
}

export function ModeSelectChip({
  mode,
  onChange,
  modes,
  compact = false
}: ModeSelectChipProps) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const close = useCallback(() => setAnchor(null), []);
  const label = modeLabelFor(mode);

  return (
    <>
      <MediaControlChip
        icon={modeIconFor(mode)}
        label={compact ? undefined : label}
        title={label}
        active={anchor !== null}
        onClick={(e) => setAnchor(e.currentTarget)}
        showChevron
      />
      <MediaModeMenu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={close}
        value={mode}
        onChange={onChange}
        modes={modes}
      />
    </>
  );
}

export default ModeSelectChip;
