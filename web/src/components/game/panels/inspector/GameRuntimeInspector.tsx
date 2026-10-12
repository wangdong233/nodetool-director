import type { GameSnapshot } from "@nodetool-ai/protocol/game.js";
import { useTranslation } from "react-i18next";

import { Caption, FlexColumn, SPACING, Text } from "../../../ui_primitives";

interface GameRuntimeInspectorProps {
  tick: number;
  entity: GameSnapshot["entities"][number] | null;
}

export default function GameRuntimeInspector({ tick, entity }: GameRuntimeInspectorProps) {
  const { t } = useTranslation();
  return <FlexColumn gap={SPACING.xs} role="status" aria-label={t("game:runtime.entityStateAria", { defaultValue: "Runtime entity state" })}>
    <Text>{t("game:runtime.stateLine", { tick, defaultValue: `Runtime state · tick ${tick}` })}</Text>
    {entity ? <>
      <Caption>{entity.id} · {entity.active ? t("editor:ui.active", { defaultValue: "Active" }) : t("game:runtime.inactive", { defaultValue: "Inactive" })}</Caption>
      <Caption>{t("game:runtime.positionVelocity", { x: entity.x.toFixed(2), y: entity.y.toFixed(2), vx: entity.velocityX.toFixed(2), vy: entity.velocityY.toFixed(2), defaultValue: `Position ${entity.x.toFixed(2)}, ${entity.y.toFixed(2)} · Velocity ${entity.velocityX.toFixed(2)}, ${entity.velocityY.toFixed(2)}` })}</Caption>
      {entity.health !== undefined && <Caption>{t("game:runtime.health", { health: entity.health, defaultValue: `Health ${entity.health}` })}</Caption>}
    </> : <Caption>{t("game:runtime.selectEntity", { defaultValue: "Select a runtime entity in the viewport" })}</Caption>}
  </FlexColumn>;
}
