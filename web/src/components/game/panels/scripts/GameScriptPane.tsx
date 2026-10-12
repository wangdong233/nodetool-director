import { useEffect, useMemo, useRef, useState } from "react";
import type { GameBehavior } from "@nodetool-ai/protocol/game.js";
import { GAME_SCRIPT_LIFECYCLE_TYPES, GAME_SCRIPT_LIFECYCLE_TYPES_3D, GAME_SCRIPT_TYPES, GAME_SCRIPT_TYPES_3D, GAME_SCRIPT_WORLD_TYPES, GAME_SCRIPT_WORLD_TYPES_3D } from "@nodetool-ai/game-runtime";
import { useTranslation } from "react-i18next";

import { useMonacoEditor } from "../../../../hooks/editor/useMonacoEditor";
import { Box, Caption, EditorButton, FlexColumn, FlexRow, LoadingSpinner, SPACING, Text } from "../../../ui_primitives";

interface GameScriptPaneProps {
  dimension?: "2d" | "3d";
  entityId: string;
  entityName: string;
  behaviorIndex: number;
  behavior: Extract<GameBehavior, { kind: "script" }>;
  error?: { message: string; tick: number } | null;
  onReplay?: () => void;
  onAskAssistant?: () => void;
  onRunTenSeconds?: () => void;
  runningTenSeconds?: boolean;
  runSummary?: string | null;
  runEntityStats?: readonly { entityId: string; durationMs: number; calls: number }[];
  onChange: (source: string) => void;
  onClose: () => void;
}

export default function GameScriptPane({ dimension = "2d", entityId, entityName, behaviorIndex, behavior, error, onReplay, onAskAssistant, onRunTenSeconds,
  runningTenSeconds, runSummary, runEntityStats = [], onChange, onClose }: GameScriptPaneProps) {
  const { t } = useTranslation();
  const { MonacoEditor, monacoLoadError, isMonacoLoading, loadMonacoIfNeeded } = useMonacoEditor();
  const [source, setSource] = useState(behavior.source);
  const [conflict, setConflict] = useState(false);
  const sourceRef = useRef(source);
  const baselineRef = useRef(behavior.source);
  const key = `${entityId}:${behaviorIndex}`;

  useEffect(() => { void loadMonacoIfNeeded(); }, [loadMonacoIfNeeded]);
  useEffect(() => {
    if (sourceRef.current === baselineRef.current) {
      sourceRef.current = behavior.source;
      setSource(behavior.source);
      setConflict(false);
    } else if (sourceRef.current === behavior.source) {
      setConflict(false);
    } else {
      setConflict(true);
    }
    baselineRef.current = behavior.source;
  }, [behavior.source]);

  const options = useMemo(() => ({ minimap: { enabled: false }, automaticLayout: true,
    scrollBeyondLastLine: false, tabSize: 2 }), []);

  return (
    <FlexColumn gap={SPACING.sm} sx={{ minHeight: 0, height: "100%" }}>
      <FlexRow gap={SPACING.sm} align="center">
        <Text>{t("game:script.title", { name: entityName || entityId, index: behaviorIndex, defaultValue: `Script: ${entityName || entityId} · ${behaviorIndex}` })}</Text>
        <EditorButton onClick={onClose}>{t("common:action.close", { defaultValue: "Close" })}</EditorButton>
      </FlexRow>
      {conflict && <FlexRow gap={SPACING.sm} align="center"><Caption color="error" role="alert">{t("game:script.conflict", { defaultValue: "The draft script changed. Your edits are not being saved until you choose a version." })}</Caption>
        <EditorButton onClick={() => { sourceRef.current = behavior.source; setSource(behavior.source); setConflict(false); }}>{t("game:script.useDraftVersion", { defaultValue: "Use draft version" })}</EditorButton>
        <EditorButton onClick={() => { setConflict(false); onChange(sourceRef.current); }}>{t("game:script.keepMyVersion", { defaultValue: "Keep my version" })}</EditorButton></FlexRow>}
      {error && <FlexRow gap={SPACING.sm} align="center"><Caption color="error" role="alert">{t("game:script.tickError", { tick: error.tick, message: error.message, defaultValue: `Tick ${error.tick}: ${error.message}` })}</Caption>
        {onReplay && error.tick > 0 && <EditorButton onClick={onReplay}>{t("game:script.replayToTick", { tick: error.tick - 1, defaultValue: `Replay to tick ${error.tick - 1}` })}</EditorButton>}
        {onAskAssistant && <EditorButton onClick={onAskAssistant}>{t("game:console.askTheAssistant", { defaultValue: "Ask the assistant" })}</EditorButton>}</FlexRow>}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        {MonacoEditor ? <MonacoEditor key={key} value={source} onChange={(value) => {
          const next = value ?? "";
          sourceRef.current = next;
          setSource(next);
          if (!conflict) { onChange(next); }
        }}
          onMount={() => {
            void import("monaco-editor/esm/vs/language/typescript/monaco.contribution.js").then((module) => {
              const { javascriptDefaults, ScriptTarget } = module as unknown as {
                javascriptDefaults: {
                  addExtraLib: (source: string, path: string) => void;
                  setCompilerOptions: (options: { allowJs: boolean; checkJs: boolean; noEmit: boolean; target: number }) => void;
                };
                ScriptTarget: { ES2020: number };
              };
              javascriptDefaults.addExtraLib(dimension === "3d"
                ? GAME_SCRIPT_TYPES_3D + GAME_SCRIPT_WORLD_TYPES_3D + GAME_SCRIPT_LIFECYCLE_TYPES_3D
                : GAME_SCRIPT_TYPES + GAME_SCRIPT_WORLD_TYPES + GAME_SCRIPT_LIFECYCLE_TYPES, "file:///native-game.d.ts");
              javascriptDefaults.setCompilerOptions({ allowJs: true, checkJs: true, noEmit: true, target: ScriptTarget.ES2020 });
            });
          }}
          language="javascript" theme="vs-dark" width="100%" height="100%" options={options} />
          : monacoLoadError ? <Text color="error">{monacoLoadError}</Text> : isMonacoLoading ? <LoadingSpinner /> : null}
      </Box>
      <Caption>{t("game:script.characterLine", { current: source.length, commands: behavior.maxCommands, ms: behavior.maxTickMs, defaultValue: `${source.length} / 16384 characters · ${behavior.maxCommands} commands · ${behavior.maxTickMs} ms per tick` })}</Caption>
      <FlexRow gap={SPACING.sm} align="center">
        {onRunTenSeconds && <EditorButton disabled={runningTenSeconds} onClick={onRunTenSeconds}>{runningTenSeconds ? t("editor:ui.running", { defaultValue: "Running" }) : t("game:script.runTenSeconds", { defaultValue: "Run 10 s" })}</EditorButton>}
        {runSummary && <Caption role="status">{runSummary}</Caption>}
      </FlexRow>
      {runEntityStats.map((entry) => <Caption key={entry.entityId}>{t("game:script.entityStat", { entityId: entry.entityId, ms: entry.durationMs.toFixed(1), calls: entry.calls, defaultValue: `${entry.entityId}: ${entry.durationMs.toFixed(1)} ms across ${entry.calls} calls` })}</Caption>)}
    </FlexColumn>
  );
}
