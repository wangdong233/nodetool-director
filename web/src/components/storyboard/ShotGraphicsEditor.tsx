import React from "react";
import { useTranslation } from "react-i18next";
import {
  resolveEffectiveProductionRequirement,
  type Shot
} from "@nodetool-ai/protocol";
import {
  Caption,
  EditorButton,
  FlexColumn,
  FlexRow,
  Label,
  SelectField,
  SPACING,
  TextInput
} from "../ui_primitives";
import type { ShotDraft } from "./shotDraft";

interface ShotGraphicsEditorProps {
  shot: Shot;
  draft: ShotDraft;
  onChange: (draft: ShotDraft) => void;
  readOnly?: boolean;
}

export default function ShotGraphicsEditor({
  shot,
  draft,
  onChange,
  readOnly
}: ShotGraphicsEditorProps): React.ReactElement {
  const { t } = useTranslation();
  const production = resolveEffectiveProductionRequirement(
    undefined,
    shot.production
  );
  const graphics = draft.graphics;
  const patchElement = (
    id: string,
    patch: Partial<
      NonNullable<NonNullable<Shot["graphics"]>["elements"]>[number]
    >
  ): void => {
    if (readOnly || !graphics) { return; }
    onChange({
      ...draft,
      graphics: {
        ...graphics,
        elements: graphics.elements?.map((element) =>
          element.id === id ? { ...element, ...patch } : element
        )
      }
    });
  };
  return (
    <FlexColumn gap={SPACING.sm}>
      <Label>{t("storyboard:attrs.graphics", { defaultValue: "Graphics" })}</Label>
      {!graphics ? (
        <EditorButton
          disabled={readOnly}
          onClick={() =>
            onChange({ ...draft, graphics: { mode: "overlay", elements: [] } })
          }
        >
          {t("storyboard:attrs.addGraphicsIntent", { defaultValue: "Add graphics intent" })}
        </EditorButton>
      ) : (
        <>
          <SelectField
            label={t("storyboard:attrs.compositionMode", { defaultValue: "Composition mode" })}
            value={graphics.mode ?? "overlay"}
            disabled={readOnly}
            options={[
              { value: "none", label: t("storyboard:attrs.none", { defaultValue: "None" }) },
              { value: "overlay", label: t("storyboard:attrs.graphicsModeOverlay", { defaultValue: "Overlay" }) },
              { value: "graphics_first", label: t("storyboard:attrs.graphicsModeGraphicsFirst", { defaultValue: "Graphics first" }) },
              { value: "hybrid", label: t("storyboard:attrs.graphicsModeHybrid", { defaultValue: "Hybrid" }) }
            ]}
            onChange={(value) => {
              if (
                value === "none" ||
                value === "overlay" ||
                value === "graphics_first" ||
                value === "hybrid"
              ) {
                onChange({ ...draft, graphics: { ...graphics, mode: value } });
              }
            }}
          />
          <TextInput
            label={t("storyboard:attrs.graphicDirection", { defaultValue: "Graphic direction" })}
            multiline
            value={graphics.direction ?? ""}
            disabled={readOnly}
            onChange={(event) =>
              onChange({
                ...draft,
                graphics: { ...graphics, direction: event.target.value }
              })
            }
          />
          {(graphics.elements ?? []).map((element) => {
            const protection = production?.protected_inputs?.find(
              (input) => input.id === element.protected_input_id
            );
            return (
              <FlexColumn key={element.id} gap={SPACING.xs}>
                <Caption>
                  {element.role ?? element.kind}: {element.id}
                </Caption>
                {element.kind === "text" && (
                  <TextInput
                    label={t("storyboard:attrs.exactTextId", { defaultValue: "Exact text: {{id}}", id: element.id })}
                    value={
                      protection?.kind === "exact_text"
                        ? (protection.value ?? "")
                        : (element.text ?? "")
                    }
                    disabled={readOnly || !!protection}
                    helperText={
                      protection
                        ? t("storyboard:attrs.protectedCopyComesFromTheProductionInputs", {
                            defaultValue:
                              "Protected copy comes from the production inputs. Edit it there."
                          })
                        : undefined
                    }
                    onChange={(event) =>
                      patchElement(element.id, { text: event.target.value })
                    }
                  />
                )}
                {element.kind === "asset" && (
                  <TextInput
                    label={t("storyboard:attrs.assetReferenceId", { defaultValue: "Asset reference: {{id}}", id: element.id })}
                    value={protection?.asset_id ?? element.asset_id ?? ""}
                    disabled={readOnly || !!protection}
                    onChange={(event) =>
                      patchElement(element.id, { asset_id: event.target.value })
                    }
                  />
                )}
                {(element.entity_id ?? protection?.entity_id) && (
                  <Caption>
                    {t("storyboard:attrs.entityId", { defaultValue: "Entity: {{id}}", id: element.entity_id ?? protection?.entity_id })}
                  </Caption>
                )}
                <TextInput
                  label={t("storyboard:attrs.graphicNotesId", { defaultValue: "Graphic notes: {{id}}", id: element.id })}
                  value={element.direction ?? ""}
                  disabled={readOnly}
                  onChange={(event) =>
                    patchElement(element.id, { direction: event.target.value })
                  }
                />
              </FlexColumn>
            );
          })}
          <FlexRow gap={SPACING.sm} wrap>
            <EditorButton
              disabled={readOnly}
              onClick={() => {
                const ids = new Set(
                  graphics.elements?.map((element) => element.id)
                );
                let suffix = 1;
                while (ids.has(`text-${suffix}`)) { suffix++; }
                onChange({
                  ...draft,
                  graphics: {
                    ...graphics,
                    elements: [
                      ...(graphics.elements ?? []),
                      { id: `text-${suffix}`, kind: "text", text: "Your text" }
                    ]
                  }
                });
              }}
            >
              {t("storyboard:attrs.addText", { defaultValue: "Add text" })}
            </EditorButton>
            <EditorButton
              disabled={readOnly}
              onClick={() => onChange({ ...draft, graphics: undefined })}
            >
              {t("storyboard:attrs.removeGraphicsIntent", { defaultValue: "Remove graphics intent" })}
            </EditorButton>
          </FlexRow>
        </>
      )}
    </FlexColumn>
  );
}
