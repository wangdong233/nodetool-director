import { useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import TimelineSurface from "../workspace/TimelineSurface";
import {
  EditorButton,
  EmptyState,
  FlexColumn,
  FlexRow,
  SPACING
} from "../ui_primitives";

export default function TimelineRoute() {
  const { t } = useTranslation();
  const { sequenceId } = useParams<{ sequenceId: string }>();
  const [params, setParams] = useSearchParams();
  if (!sequenceId) {
    return <EmptyState variant="error" title={t("timeline:list.timelineNotFound", { defaultValue: "Timeline not found" })} />;
  }
  const mode = params.get("mode") === "edit" ? "edit" : "view";
  const changeMode = (next: "view" | "edit") => {
    const updated = new URLSearchParams(params);
    updated.set("mode", next);
    setParams(updated);
  };
  return (
    <FlexColumn gap={0} fullHeight>
      <FlexRow gap={SPACING.sm} padding={SPACING.md}>
        <EditorButton
          onClick={() => changeMode("view")}
          aria-pressed={mode === "view"}
        >
          {t("timeline:shortcuts.view", { defaultValue: "View" })}
        </EditorButton>
        <EditorButton
          onClick={() => changeMode("edit")}
          aria-pressed={mode === "edit"}
        >
          {t("editor:ui.edit", { defaultValue: "Edit" })}
        </EditorButton>
      </FlexRow>
      <FlexColumn gap={0} sx={{ flex: 1, minHeight: 0 }}>
        <TimelineSurface refId={sequenceId} mode={mode} active />
      </FlexColumn>
    </FlexColumn>
  );
}
