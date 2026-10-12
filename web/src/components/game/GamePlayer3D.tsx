import type { GameDocument3D } from "@nodetool-ai/protocol";
import { useTranslation } from "react-i18next";
import { Caption, EditorButton, FlexColumn, FlexRow, SPACING, Text } from "../ui_primitives";
import ReportBugButton from "../support/ReportBugButton";
import GameViewport3D from "./viewport3d/GameViewport3D";
import { useGamePlaySession3D } from "./useGamePlaySession3D";

interface GamePlayer3DProps { readonly gameId: string; readonly name: string; readonly document: GameDocument3D; readonly active?: boolean; }

export default function GamePlayer3D({ gameId, name, document, active = true }: GamePlayer3DProps) {
  const { t } = useTranslation();
  const host = useGamePlaySession3D({ refId: gameId, document, active });
  return <FlexColumn gap={SPACING.sm} sx={{ height: "100%", minHeight: 0, p: SPACING.md }}>
    <FlexRow gap={SPACING.sm} align="center" wrap>
      <Text size="big">{name}</Text>
      <EditorButton onClick={host.beginPlay} disabled={host.backend === "Initializing"}>{host.playing ? t("ui:attrs.pause", { defaultValue: "Pause" }) : host.playDocument ? t("game:player.resume", { defaultValue: "Resume" }) : t("game:toolbar.play", { defaultValue: "Play" })}</EditorButton>
      <EditorButton onClick={host.stop} disabled={!host.playDocument}>{t("ui2:attrs.stop", { defaultValue: "Stop" })}</EditorButton>
      <Caption>{t("game:status.scoreLine", { score: host.inspection?.score ?? 0,
        state: host.inspection?.won ? t("game:status.won", { defaultValue: "Won" })
          : host.playing ? t("game:status.playingState", { defaultValue: "Playing" })
          : t("editor:ui.ready", { defaultValue: "Ready" }),
        backend: host.backend, defaultValue: "Score {{score}} · {{state}} · {{backend}}" })}</Caption>
    </FlexRow>
    {host.error && <FlexRow gap={SPACING.xs}><Caption color="error" role="alert">{host.error}</Caption>
      <ReportBugButton context={{ source: "panel-crash", summary: "3D game player failed", errorText: host.error,
        nodeDetail: `Game: ${gameId}\nScene: ${host.inspection?.sceneId ?? document.entrySceneId}\nTick: ${host.inspection?.tick ?? 0}` }} /></FlexRow>}
    <GameViewport3D document={document} host={host} sceneId={document.entrySceneId} playerOnly />
  </FlexColumn>;
}
