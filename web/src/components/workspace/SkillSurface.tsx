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
import { useSkillDocOverlay } from "../../i18n/skillDocs";
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
  // Hooks must run before the early returns below, so the overlay resolves
  // with `skill` still pending: null slug until the row lands renders the raw
  // body, then the effect re-resolves once the slug is known.
  const localizedBody = useSkillDocOverlay(
    isSystemSkill && skill ? skill.name : null,
    skill?.content ?? ""
  );

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
    // Display-layer localization (r31a header + r31b body): a shipped skill's
    // name and description resolve through the zh catalog overlay, and the
    // markdown body through the per-skill zh doc overlay (i18n/skillDocs —
    // lazily loaded, one chunk per translated skill). Stored data is never
    // rewritten and a language switch re-renders immediately. A skill without
    // a translation (and English, always) renders its original body — the
    // rollout is progressive and en is byte-identical. A user skill renders
    // its stored values verbatim.
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
          <MarkdownRenderer content={localizedBody} fillContainer />
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
