import { useCallback, useState } from "react";

import {
  Box,
  Caption,
  EditorButton,
  FlexColumn,
  FlexRow,
  LoadingSpinner,
  SPACING
} from "../ui_primitives";
import {
  LOOSE_PROJECT_ID,
  useWorkspaceTabsStore
} from "../../stores/WorkspaceTabsStore";
import { trpc } from "../../trpc/client";
import ProjectDocumentCard from "./ProjectDocumentCard";
import ProjectSelector from "./ProjectSelector";
import type { ProjectDocument } from "./projectStatus";
import { useAppLanguage } from "../../i18n";
import { useTranslation } from "react-i18next";

const DOCUMENTS_PER_PAGE = 4;

const CurrentProjectDocuments = () => {
  const { t } = useTranslation();
  // Subscribe so catalog reads re-render on language change.
  useAppLanguage();
  const activeProjectId = useWorkspaceTabsStore(
    (state) => state.activeProjectId
  );
  const personalProjectId = useWorkspaceTabsStore(
    (state) => state.personalProjectId
  );
  const openTab = useWorkspaceTabsStore((state) => state.openTab);
  const projectId =
    activeProjectId && activeProjectId !== LOOSE_PROJECT_ID
      ? activeProjectId
      : personalProjectId;
  const [pageState, setPageState] = useState({ projectId, page: 0 });
  const { data, isPending, error } = trpc.projects.get.useQuery(
    { id: projectId ?? "" },
    { enabled: Boolean(projectId), staleTime: 15_000 }
  );
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

  if (!projectId) return null;

  const documents = data?.project.id === projectId ? data.documents : [];
  const pageCount = Math.ceil(documents.length / DOCUMENTS_PER_PAGE);
  const page =
    pageState.projectId === projectId
      ? Math.min(pageState.page, Math.max(pageCount - 1, 0))
      : 0;
  const firstDocument = page * DOCUMENTS_PER_PAGE;
  const visibleDocuments = documents.slice(
    firstDocument,
    firstDocument + DOCUMENTS_PER_PAGE
  );
  return (
    <FlexColumn gap={SPACING.md} aria-label={t("home:docs.sectionAria", { defaultValue: "Current project documents" })}>
      <FlexRow align="center" gap={SPACING.md} wrap>
        <ProjectSelector inline />
        <Caption color="muted">
          {documents.length > 0
            ? t("home:docs.title", { defaultValue: "Documents · {{count}}", count: String(documents.length) })
            : t("home:docs.titleEmpty", { defaultValue: "Documents" })}
        </Caption>
      </FlexRow>
      {isPending ? (
        <LoadingSpinner />
      ) : error ? (
        <Caption color="error">{error.message}</Caption>
      ) : documents.length === 0 ? (
        <Caption color="muted">{t("home:docs.empty", { defaultValue: "No documents in this project yet." })}</Caption>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: SPACING.md,
            gridTemplateColumns:
              "repeat(auto-fill, minmax(min(100%, 190px), 1fr))"
          }}
        >
          {visibleDocuments.map((document) => (
            <ProjectDocumentCard
              key={`${document.type}:${document.ref}`}
              document={document}
              sourceProjectId={projectId}
              onOpen={openDocument}
              compact
            />
          ))}
        </Box>
      )}
      {pageCount > 1 && (
        <FlexRow align="center" gap={SPACING.sm}>
          <EditorButton
            variant="outlined"
            density="compact"
            disabled={page === 0}
            onClick={() => setPageState({ projectId, page: page - 1 })}
          >
            {t("home:docs.previous", { defaultValue: "Previous" })}
          </EditorButton>
          <Caption color="secondary">
            {t("home:docs.range", {
              defaultValue: "{{first}}–{{last}} of {{total}}",
              first: String(firstDocument + 1),
              last: String(Math.min(firstDocument + DOCUMENTS_PER_PAGE, documents.length)),
              total: String(documents.length)
            })}
          </Caption>
          <EditorButton
            variant="outlined"
            density="compact"
            disabled={page >= pageCount - 1}
            onClick={() => setPageState({ projectId, page: page + 1 })}
          >
            {t("home:docs.next", { defaultValue: "Next" })}
          </EditorButton>
        </FlexRow>
      )}
    </FlexColumn>
  );
};

export default CurrentProjectDocuments;
