/** @jsxImportSource @emotion/react */
import React, { memo, useMemo } from "react";
import { css } from "@emotion/react";
import { useTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import AudiotrackIcon from "@mui/icons-material/Audiotrack";
import ImageIcon from "@mui/icons-material/Image";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import MovieIcon from "@mui/icons-material/Movie";
import MovieFilterIcon from "@mui/icons-material/MovieFilter";
import BurstModeIcon from "@mui/icons-material/BurstMode";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import ReplayIcon from "@mui/icons-material/Replay";
import TimelineIcon from "@mui/icons-material/Timeline";
import TuneIcon from "@mui/icons-material/Tune";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CheckIcon from "@mui/icons-material/Check";
import {
  Caption,
  FlexRow,
  Popover,
  Text,
  MOTION,
  SHADOW,
  reducedMotion,
  BORDER_RADIUS,
  SPACING,
  getSpacingPx
} from "../../ui_primitives";
import type { MediaMode } from "../../../stores/MediaGenerationStore";
import { i18n } from "../../../i18n";

interface MediaModeMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  value: MediaMode;
  onChange: (mode: MediaMode) => void;
  modes?: readonly MediaMode[];
}

interface ModeItem {
  id: MediaMode;
  label: string;
  labelKey?: string;
  description?: string;
  descriptionKey?: string;
  icon: React.ReactNode;
  enabled: boolean;
}

const MODES: ModeItem[] = [
  {
    id: "chat",
    label: "Chat", labelKey: "chat",
    icon: <ChatBubbleOutlineIcon fontSize="small" />,
    enabled: true
  },
  {
    id: "image",
    label: "Generate Images", labelKey: "generateImages",
    icon: <ImageIcon fontSize="small" />,
    enabled: true
  },
  {
    id: "image_edit",
    label: "Edit Images", labelKey: "editImages",
    icon: <AutoFixHighIcon fontSize="small" />,
    enabled: true
  },
  {
    id: "video",
    label: "Generate Videos", labelKey: "generateVideos",
    icon: <MovieIcon fontSize="small" />,
    enabled: true
  },
  {
    id: "image_to_video",
    label: "Animate Image", labelKey: "animateImage",
    icon: <MovieFilterIcon fontSize="small" />,
    enabled: true
  },
  {
    id: "reference_to_video",
    label: "Reference to Video", labelKey: "referenceToVideo",
    description: "several references, one shot",
    descriptionKey: "editor:ui.severalReferencesOneShot",
    icon: <BurstModeIcon fontSize="small" />,
    enabled: true
  },
  {
    id: "audio",
    label: "Generate Speech", labelKey: "generateSpeech",
    icon: <RecordVoiceOverIcon fontSize="small" />,
    enabled: true
  },
  {
    id: "music",
    label: "Generate Music", labelKey: "generateMusic",
    icon: <AudiotrackIcon fontSize="small" />,
    enabled: true
  },
  {
    id: "audio_to_video",
    label: "Audio to Video", labelKey: "audioToVideo",
    icon: <GraphicEqIcon fontSize="small" />,
    enabled: false
  },
  {
    id: "retake",
    label: "Retake", labelKey: "retake",
    icon: <ReplayIcon fontSize="small" />,
    enabled: false
  },
  {
    id: "extend",
    label: "Extend",
    icon: <TimelineIcon fontSize="small" />,
    enabled: false
  },
  {
    id: "motion_control",
    label: "Motion Control", labelKey: "motionControl",
    icon: <TuneIcon fontSize="small" />,
    enabled: false
  }
];

const styles = (theme: Theme) =>
  css({
    padding: `${getSpacingPx(SPACING.md)} 0`,
    minWidth: 240,
    ".mode-menu-header": {
      padding: `${getSpacingPx(SPACING.md)} ${getSpacingPx(SPACING.xl)} ${getSpacingPx(SPACING.xs)}`,
      color: theme.vars.palette.grey[400],
      textTransform: "uppercase",
      letterSpacing: 1
    },
    ".mode-menu-item": {
      display: "flex",
      alignItems: "center",
      gap: getSpacingPx(SPACING.md),
      padding: theme.spacing(SPACING.lg, SPACING.xl),
      cursor: "pointer",
      color: theme.vars.palette.grey[100],
      transition: MOTION.background,
      ...reducedMotion({ transition: MOTION.none }),
      "&:hover": {
        backgroundColor: theme.vars.palette.c_overlay
      },
      "&.selected": {
        backgroundColor: theme.vars.palette.c_overlay
      },
      "&.disabled": {
        opacity: 0.45,
        cursor: "not-allowed"
      }
    },
    ".mode-menu-icon": {
      color: theme.vars.palette.grey[300],
      display: "inline-flex"
    },
    ".mode-menu-check": {
      marginLeft: "auto",
      color: theme.vars.palette.primary.main,
      display: "inline-flex"
    }
  });

/**
 * Popover menu shown when the user clicks the "Mode" chip in the media
 * composer. Lists the media-generation modes (chat, image, video, …).
 * Agent mode is no longer a media-menu option — the chat agent always runs
 * the unified LLM-with-tools loop and decomposes via `run_subtask` on its own.
 */
const MediaModeMenu: React.FC<MediaModeMenuProps> = ({
  anchorEl,
  open,
  onClose,
  value,
  onChange,
  modes
}) => {
  const theme = useTheme();
  const cssStyles = useMemo(() => styles(theme), [theme]);
  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      placement="top-left"
      paperSx={{
        backgroundColor: theme.vars.palette.grey[900],
        border: `1px solid ${theme.vars.palette.grey[800]}`,
        borderRadius: BORDER_RADIUS.sm,
        boxShadow: SHADOW(theme).lg
      }}
    >
      <div css={cssStyles} role="menu" aria-label={i18n.t("editor:ui.generationMode", { defaultValue: "Generation mode" })}>
        <Caption className="mode-menu-header" size="small">
          Mode
        </Caption>
        {MODES.filter((m) => !modes || modes.includes(m.id)).map((m) => {
          const selected = m.id === value;
          return (
            <div
              key={m.id}
              role="menuitemradio"
              aria-checked={selected}
              aria-disabled={!m.enabled || undefined}
              tabIndex={0}
              className={`mode-menu-item${selected ? " selected" : ""}${m.enabled ? "" : " disabled"}`}
              onClick={() => {
                if (!m.enabled) {
                  return;
                }
                onChange(m.id);
                onClose();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (!m.enabled) {
                    return;
                  }
                  onChange(m.id);
                  onClose();
                }
              }}
            >
              <span className="mode-menu-icon">{m.icon}</span>
              <FlexRow
                gap={SPACING.micro}
                align="center"
                sx={{ flex: 1, minWidth: 0 }}
              >
                <Text size="small" weight={500} sx={{ color: "inherit" }}>
                  {i18n.t(`editor:ui.${"labelKey" in m ? m.labelKey : ""}`, { defaultValue: m.label })}
                </Text>
                {m.description && (
                  <Caption size="smaller" color="secondary">
                    {m.descriptionKey && m.description
                      ? i18n.t(m.descriptionKey, { defaultValue: m.description })
                      : m.description}
                  </Caption>
                )}
                {!m.enabled && (
                  <Caption size="smaller" color="secondary">
                    soon
                  </Caption>
                )}
              </FlexRow>
              {selected && (
                <span className="mode-menu-check">
                  <CheckIcon fontSize="small" />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Popover>
  );
};

export default memo(MediaModeMenu);
