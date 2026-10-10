import { useSkill } from "../../hooks/skills/useSkills";
import type { WorkspaceTabMode } from "../../stores/WorkspaceTabsStore";
import SkillEditorPane from "../skills/SkillEditorPane";
import ReportBugButton from "../support/ReportBugButton";
import {
  Caption,
  FlexColumn,
  Label,
  LoadingSpinner,
  ScrollArea,
  SPACING
} from "../ui_primitives";
import MarkdownRenderer from "../../utils/MarkdownRenderer";
import { useTranslation } from "react-i18next";

interface SkillSurfaceProps {
  refId: string;
  mode: WorkspaceTabMode;
  active: boolean;
}

const SkillSurface = ({ refId, mode }: SkillSurfaceProps) => {
  const { t } = useTranslation();
  const { data: skill, isLoading, error } = useSkill(refId);
  const isSystemSkill = refId.startsWith("system:");

  if (isLoading) {
    return (
      <FlexColumn fullWidth fullHeight sx={{ alignItems: "center", justifyContent: "center" }}>
        <LoadingSpinner />
      </FlexColumn>
    );
  }
  if (error || !skill) {
    return (
      <FlexColumn fullWidth fullHeight sx={{ alignItems: "center", justifyContent: "center" }}>
        <Caption sx={{ color: "error.main" }}>{t("ui2:attrs.failedToLoadSkill", { defaultValue: "Failed to load skill" })}</Caption>
        <ReportBugButton
          context={{
            source: "panel-crash",
            summary: "Skill surface failed to load",
            errorText: error?.message,
            stackTrace: error instanceof Error ? error.stack : undefined
          }}
        />
      </FlexColumn>
    );
  }

  if (mode === "view") {
    // Display-layer localization (r31a): a shipped skill's header resolves
    // through the zh catalog overlay at render time — stored data is never
    // rewritten and a language switch re-renders immediately. The markdown
    // body below keeps its original language this round (body translation is
    // a later batch). A user skill renders its stored values verbatim.
    const displayName = isSystemSkill
      ? t(`catalog:skills.${skill.name}.name`, { defaultValue: skill.name })
      : skill.name;
    return (
      <FlexColumn fullWidth fullHeight sx={{ minHeight: 0, p: SPACING.md }}>
        <Label>{displayName}</Label>
        {skill.description && (
          <Caption sx={{ color: "text.secondary", mb: SPACING.xs }}>
            {isSystemSkill
              ? t(`catalog:skills.${skill.name}.description`, {
                  defaultValue: skill.description
                })
              : skill.description}
          </Caption>
        )}
        <ScrollArea fullHeight>
          <MarkdownRenderer content={skill.content} fillContainer />
        </ScrollArea>
      </FlexColumn>
    );
  }

  // A shipped skill has no row to write back to, and the tab bar lets anyone
  // flip a tab to Edit — so the pane is opened read-only rather than left to
  // fail its first autosave against the server's refusal.
  return <SkillEditorPane skillId={refId} readOnly={isSystemSkill} />;
};

export default SkillSurface;
