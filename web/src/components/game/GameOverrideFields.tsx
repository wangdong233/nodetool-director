import type { AnyGameDocument } from "@nodetool-ai/protocol";
import type { AnyGameDocumentOp } from "@nodetool-ai/game-runtime";
import { useTranslation } from "react-i18next";

import { Caption, CollapsibleSection, EditorButton, FlexColumn, FlexRow, SPACING } from "../ui_primitives";

interface GameOverrideFieldsProps {
  document: AnyGameDocument;
  sceneId: string;
  entityId: string;
  onOps: (ops: Extract<AnyGameDocumentOp, { op: "reset_override" | "detach_entity" }>[]) => void;
}

export default function GameOverrideFields({ document, sceneId, entityId, onOps }: GameOverrideFieldsProps) {
  const { t } = useTranslation();
  const authoring = document.authoring;
  if (!authoring) { return null; }
  const detached = authoring.detached.some((target) => target.sceneId === sceneId && target.entityId === entityId);
  const overrides = authoring.overrides.filter((target) => target.sceneId === sceneId && target.entityId === entityId);
  const baseline = authoring.baseline.scenes;
  const generatedScene = Array.isArray(baseline) ? baseline.find((scene) => scene && typeof scene === "object" && !Array.isArray(scene) && scene.id === sceneId) : null;
  const generatedEntity = generatedScene && typeof generatedScene === "object" && !Array.isArray(generatedScene) && Array.isArray(generatedScene.entities)
    ? generatedScene.entities.find((entity) => entity && typeof entity === "object" && !Array.isArray(entity) && entity.id === entityId) : null;
  const generated = Boolean(generatedEntity);
  const instance = authoring.instances.find((target) => target.sceneId === sceneId && target.entityId === entityId);
  const prefab = instance ? authoring.prefabs[instance.prefabId] : null;
  if (!generated && !detached) { return <Caption>{t("game:overrides.handAuthoredEntity", { defaultValue: "Hand authored entity" })}</Caption>; }
  return <CollapsibleSection title={t("game:overrides.constructionValues", { defaultValue: "Construction values" })} compact>
    <FlexColumn gap={SPACING.xs}>
      <Caption>{detached ? t("game:overrides.detachedFromConstruction", { defaultValue: "Detached from construction" })
        : t("game:overrides.generatedEntity", { defaultValue: "Generated entity. Fields without overrides follow construction." })}</Caption>
      {instance && <Caption>{t("game:overrides.prefabLabel", { prefabId: instance.prefabId, defaultValue: "Prefab: {{prefabId}}" })}</Caption>}
      {generatedEntity && typeof generatedEntity === "object" && !Array.isArray(generatedEntity) &&
        Object.entries(generatedEntity).filter(([key]) => key !== "id").map(([key, value]) => {
          const overridden = overrides.some((override) => override.path[0] === key);
          const inherited = prefab && typeof prefab === "object" && !Array.isArray(prefab) && key in prefab && JSON.stringify(prefab[key]) === JSON.stringify(value);
          return <Caption key={key}>{key}: {overridden ? t("game:overrides.overridden", { defaultValue: "Overridden" })
            : inherited ? t("game:overrides.inherited", { defaultValue: "Inherited" })
            : t("game:overrides.generated", { defaultValue: "Generated" })}</Caption>;
        })}
      {overrides.map((override) => <FlexRow key={JSON.stringify(override.path)} gap={SPACING.sm} align="center">
        <Caption>{t("game:overrides.overrideLine", { path: override.path.join("."),
          value: override.remove ? t("game:overrides.removedValue", { defaultValue: "(removed)" }) : JSON.stringify(override.value),
          defaultValue: "{{path}}: Overridden {{value}}" })}</Caption>
        <EditorButton onClick={() => onOps([{ op: "reset_override", scene_id: sceneId, entity_id: entityId, path: override.path }])}>
          {t("game:overrides.resetField", { path: override.path.join("."), defaultValue: "Reset {{path}}" })}
        </EditorButton>
      </FlexRow>)}
      {!detached && <FlexRow gap={SPACING.sm}>
        <EditorButton disabled={overrides.length === 0} onClick={() => onOps([{ op: "reset_override", scene_id: sceneId, entity_id: entityId }])}>{t("game:overrides.resetAllOverrides", { defaultValue: "Reset all overrides" })}</EditorButton>
        <EditorButton onClick={() => onOps([{ op: "detach_entity", scene_id: sceneId, entity_id: entityId }])}>{t("game:overrides.detachEntity", { defaultValue: "Detach entity" })}</EditorButton>
      </FlexRow>}
    </FlexColumn>
  </CollapsibleSection>;
}
