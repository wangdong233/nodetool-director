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
import { i18n, useAppLanguage } from "../../../i18n";

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
 * One row per media mode: the English label plus its catalog key, resolved at
 * render time so the chip follows the language switcher. Standard Latin terms
 * (Image→Video etc.) carry keys whose zh value keeps the Latin form.
 */
const MODE_LABELS: Record<MediaMode, { label: string; labelKey: string }> = {
  music: { label: "Music", labelKey: "editor:ui.music" },
  image: { label: "Image", labelKey: "editor:ui.image" },
  image_edit: { label: "Image edit", labelKey: "editor:ui.imageEditMode" },
  video: { label: "Video", labelKey: "editor:ui.video" },
  image_to_video: {
    label: "Image→Video",
    labelKey: "editor:ui.imageToVideoShort"
  },
  reference_to_video: {
    label: "Refs→Video",
    labelKey: "editor:ui.refsToVideo"
  },
  audio: { label: "Speech", labelKey: "editor:ui.speech" },
  chat: { label: "Chat", labelKey: "editor:ui.chat" },
  audio_to_video: {
    label: "Audio→Video",
    labelKey: "editor:ui.audioToVideoShort"
  },
  retake: { label: "Retake", labelKey: "editor:ui.retake" },
  extend: { label: "Extend", labelKey: "editor:ui.extend" },
  motion_control: { label: "Motion", labelKey: "editor:ui.motion" }
};

export function modeLabelFor(mode: MediaMode): string {
  const entry = MODE_LABELS[mode];
  return i18n.t(entry.labelKey, { defaultValue: entry.label });
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
  // The label resolves through the module-level catalog; this subscription
  // re-renders the chip when the app language changes.
  useAppLanguage();
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
