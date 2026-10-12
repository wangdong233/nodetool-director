import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import KeyboardCommandKeyIcon from "@mui/icons-material/KeyboardCommandKey";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RedoIcon from "@mui/icons-material/Redo";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import StopIcon from "@mui/icons-material/Stop";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import UndoIcon from "@mui/icons-material/Undo";
import VideogameAssetOutlinedIcon from "@mui/icons-material/VideogameAssetOutlined";

import { BORDER_RADIUS, Box, Caption, CONTROL, EditorButton, FlexRow, SPACING, Text, ToolbarIconButton } from "../../ui_primitives";
import { useGameCommandShortcut } from "./useGameCommands";
import { useTranslation } from "react-i18next";

interface GameToolbarProps {
  name: string;
  playing: boolean;
  playSession: boolean;
  loading: boolean;
  saving: boolean;
  saveStatus: string;
  assistantOpen: boolean;
  sceneTreeOpen: boolean;
  inspectorOpen: boolean;
  playHref: string;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onPlay: () => void;
  onStop: () => void;
  onStep: () => void;
  onSave: () => void;
  onLoad: () => void;
  onPublish: () => void;
  onAssistant: () => void;
  onSceneTree: () => void;
  onInspector: () => void;
  onCommandPalette?: () => void;
}

const DIVIDER_SX = { width: "1px", alignSelf: "stretch", my: SPACING.sm, bgcolor: "divider", flexShrink: 0 } as const;

function SaveState({ saveStatus }: { saveStatus: string }) {
  const { t } = useTranslation();
  const color = saveStatus === "saved" ? "success.main" : saveStatus === "saving" ? "info.main" : saveStatus === "error" ? "error.main" : "warning.main";
  return <FlexRow gap={SPACING.xs} align="center" sx={{ minWidth: 0 }}>
    <Box sx={{ width: SPACING.md, height: SPACING.md, borderRadius: BORDER_RADIUS.circle, bgcolor: color, flexShrink: 0 }} />
    <Caption sx={{ whiteSpace: "nowrap" }}>
      {saveStatus === "saved" ? t("game:toolbar.draftSaved", { defaultValue: "Draft saved" })
        : saveStatus === "saving" ? t("game:toolbar.savingDraft", { defaultValue: "Saving draft" })
        : saveStatus === "error" ? t("game:toolbar.draftNotSaved", { defaultValue: "Draft not saved" })
        : t("ui2:attrs.unsavedChanges", { defaultValue: "Unsaved changes" })}
    </Caption>
  </FlexRow>;
}

/** Editor title bar: document identity, history, transport controls and panel toggles. */
export default function GameToolbar({ name, playing, playSession, loading, saving, saveStatus,
  assistantOpen, sceneTreeOpen, inspectorOpen, playHref, canUndo = false, canRedo = false, onUndo, onRedo,
  onPlay, onStop, onStep, onSave, onLoad, onPublish, onAssistant, onSceneTree, onInspector, onCommandPalette }: GameToolbarProps) {
  const { t } = useTranslation();
  const undoShortcut = useGameCommandShortcut("edit.undo");
  const redoShortcut = useGameCommandShortcut("edit.redo");
  const paletteShortcut = useGameCommandShortcut("editor.commandPalette");
  return <Box component="header" sx={{
    display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)", alignItems: "center",
    columnGap: SPACING.lg, minHeight: CONTROL.height.xl, px: SPACING.md,
    bgcolor: "background.paper", borderBottom: 1, borderColor: "divider"
  }}>
    <FlexRow gap={SPACING.sm} align="center" sx={{ minWidth: 0 }}>
      <VideogameAssetOutlinedIcon fontSize="small" sx={{ color: "text.secondary", flexShrink: 0 }} />
      <Text weight={500} truncate title={name}>{name}</Text>
      <SaveState saveStatus={saveStatus} />
      {(onUndo || onRedo) && <>
        <Box sx={DIVIDER_SX} />
        <ToolbarIconButton icon={<UndoIcon fontSize="small" />} tooltip={t("timeline:shortcuts.undo", { defaultValue: "Undo" })} shortcut={undoShortcut} disabled={!canUndo} onClick={onUndo} />
        <ToolbarIconButton icon={<RedoIcon fontSize="small" />} tooltip={t("timeline:shortcuts.redo", { defaultValue: "Redo" })} shortcut={redoShortcut} disabled={!canRedo} onClick={onRedo} />
      </>}
    </FlexRow>

    <FlexRow gap={SPACING.micro} align="center" role="group" aria-label={t("game:toolbar.playControls", { defaultValue: "Play controls" })} sx={{
      p: SPACING.micro, borderRadius: CONTROL.radius, bgcolor: "action.hover", border: 1, borderColor: "divider"
    }}>
      <ToolbarIconButton icon={playing ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
        tooltip={playing ? t("ui:attrs.pause", { defaultValue: "Pause" }) : t("game:toolbar.play", { defaultValue: "Play" })} onClick={onPlay} disabled={loading} active={playSession}
        sx={playSession ? { bgcolor: "primary.main", color: "primary.contrastText", "&:hover": { bgcolor: "primary.dark", color: "primary.contrastText" } } : undefined} />
      <ToolbarIconButton icon={<SkipNextIcon fontSize="small" />} tooltip={t("game:toolbar.step", { defaultValue: "Step" })} onClick={onStep} disabled={playing || loading || !playSession} />
      <ToolbarIconButton icon={<StopIcon fontSize="small" />} tooltip={t("ui2:attrs.stop", { defaultValue: "Stop" })} onClick={onStop} disabled={loading || !playSession} />
    </FlexRow>

    <FlexRow gap={SPACING.xs} align="center" justify="flex-end" sx={{ minWidth: 0 }}>
      <ToolbarIconButton icon={<FileDownloadOutlinedIcon fontSize="small" />} tooltip={t("game:toolbar.savePlayState", { defaultValue: "Save play state" })} onClick={onSave} disabled={loading || !playSession} />
      <ToolbarIconButton icon={<FileUploadOutlinedIcon fontSize="small" />} tooltip={t("game:toolbar.loadPlayState", { defaultValue: "Load play state" })} onClick={onLoad} disabled={loading || !playSession} />
      <ToolbarIconButton icon={<OpenInNewIcon fontSize="small" />} tooltip={t("game:toolbar.playInNewTab", { defaultValue: "Play in new tab" })} component="a"
        href={playHref} target="_blank" rel="noopener noreferrer" disabled={saveStatus !== "saved" || saving} />
      <Box sx={DIVIDER_SX} />
      <ToolbarIconButton icon={<AccountTreeOutlinedIcon fontSize="small" />} tooltip={t("game:toolbar.toggleSceneTree", { defaultValue: "Toggle scene tree" })}
        aria-pressed={sceneTreeOpen} active={sceneTreeOpen} onClick={onSceneTree} />
      <ToolbarIconButton icon={<TuneOutlinedIcon fontSize="small" />} tooltip={t("game:toolbar.toggleInspector", { defaultValue: "Toggle inspector" })}
        aria-pressed={inspectorOpen} active={inspectorOpen} onClick={onInspector} />
      <ToolbarIconButton icon={<AutoAwesomeOutlinedIcon fontSize="small" />} tooltip={assistantOpen ? t("game:toolbar.hideAssistant", { defaultValue: "Hide assistant" }) : t("ui2:attrs.showAssistant", { defaultValue: "Show assistant" })}
        aria-pressed={assistantOpen} active={assistantOpen} onClick={onAssistant} />
      {onCommandPalette && <ToolbarIconButton icon={<KeyboardCommandKeyIcon fontSize="small" />} tooltip={t("game:toolbar.commands", { defaultValue: "Commands" })}
        shortcut={paletteShortcut} onClick={onCommandPalette} />}
      <Box sx={DIVIDER_SX} />
      <EditorButton variant="contained" disableElevation density="normal" onClick={onPublish} disabled={saving || saveStatus === "saving"}>{t("editor:ui.publish", { defaultValue: "Publish" })}</EditorButton>
    </FlexRow>
  </Box>;
}
