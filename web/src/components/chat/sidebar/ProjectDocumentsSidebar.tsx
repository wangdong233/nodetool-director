import { useCallback } from "react";

import {
  Box,
  Caption,
  Card,
  FlexColumn,
  FlexRow,
  Label,
  LoadingSpinner,
  ScrollArea,
  SPACING,
  Text
} from "../../ui_primitives";
import { trpc } from "../../../trpc/client";
import { useWorkspaceTabsStore } from "../../../stores/WorkspaceTabsStore";
import {
  TYPE_COLOR,
  TYPE_GLYPH,
  seededDocDisplayName
} from "../../workspace/tabTypeIdentity";
import { personalDisplayName } from "../../projects/projectIdentity";
import { documentStatusLine, type ProjectDocument } from "../../projects/projectStatus";
import { useTranslation } from "react-i18next";

interface ProjectDocumentsSidebarProps {
  projectId: string | null;
  active: boolean;
}

/**
 * A document row's name. Stored titles that equal a creation-time seeded
 * default (New script, New storyboard, …) resolve through the catalog at
 * render time — the same map the tab bar reads. User renames render
 * verbatim. (Entity docs cannot appear in this list: the router's document
 * type carries no `entity` variant, unlike the documents tree.)
 */
const sidebarDocName = (
  document: Pick<ProjectDocument, "type" | "name">
): string => seededDocDisplayName(document.type, document.name);

const ProjectDocumentsSidebar = ({ projectId, active }: ProjectDocumentsSidebarProps) => {
  const { t } = useTranslation();
  const openTab = useWorkspaceTabsStore((state) => state.openTab);
  const { data, isPending, error } = trpc.projects.get.useQuery(
    { id: projectId ?? "" },
    { enabled: active && Boolean(projectId), staleTime: 15_000 }
  );
  const documents = data?.project.id === projectId ? data.documents : [];
  const openDocument = useCallback(
    (document: ProjectDocument) => {
      if (!projectId) return;
      openTab({
        type: document.type,
        ref: document.ref,
        title: document.name,
        projectId
      });
    },
    [openTab, projectId]
  );

  return (
    <FlexColumn
      component="aside"
      aria-label={t("editor:ui.projectDocuments", { defaultValue: "Project documents" })}
      fullHeight
      sx={{
        width: { xs: "100%", md: "280px" },
        flexShrink: 0,
        minHeight: 0,
        borderLeft: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper"
      }}
    >
      <FlexColumn gap={SPACING.xs} sx={{ p: SPACING.lg, borderBottom: "1px solid", borderColor: "divider" }}>
        <Text size="small">
          {data?.project.id === projectId
            ? personalDisplayName(data.project, t)
            : t("editor:ui.currentProject", { defaultValue: "Current project" })}
        </Text>
        <Caption color="muted">
          {documents.length > 0
            ? t("home:docs.title", { defaultValue: "Documents · {{count}}", count: String(documents.length) })
            : t("home:docs.titleEmpty", { defaultValue: "Documents" })}
        </Caption>
      </FlexColumn>
      <ScrollArea sx={{ flex: 1, minHeight: 0, p: SPACING.sm }}>
        {!projectId ? (
          <Caption color="muted">{t("ui2:attrs.noProjectSelected", { defaultValue: "No project selected." })}</Caption>
        ) : isPending ? (
          <LoadingSpinner />
        ) : error ? (
          <Caption color="error">{error.message}</Caption>
        ) : documents.length === 0 ? (
          <Caption color="muted">{t("ui2:attrs.noDocumentsInThisProjectYet", { defaultValue: "No documents in this project yet." })}</Caption>
        ) : (
          <FlexColumn gap={SPACING.xs}>
            {documents.map((document) => (
              <Card
                key={`${document.type}:${document.ref}`}
                variant="outlined"
                padding="compact"
                clickable
                aria-label={sidebarDocName(document)}
                onClick={() => openDocument(document)}
                sx={{ minWidth: 0 }}
              >
                <FlexRow align="center" gap={SPACING.sm} sx={{ minWidth: 0 }}>
                  <Box component="span" aria-hidden sx={{ color: TYPE_COLOR[document.type] }}>
                    {TYPE_GLYPH[document.type]}
                  </Box>
                  <FlexColumn sx={{ minWidth: 0, flex: 1 }}>
                    <Label
                      title={sidebarDocName(document)}
                      sx={{ mb: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {sidebarDocName(document)}
                    </Label>
                    <Caption
                      color="secondary"
                      sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {documentStatusLine(document)}
                    </Caption>
                  </FlexColumn>
                </FlexRow>
              </Card>
            ))}
          </FlexColumn>
        )}
      </ScrollArea>
    </FlexColumn>
  );
};

export default ProjectDocumentsSidebar;
