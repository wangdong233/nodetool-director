import React, { memo } from "react";
import LibraryBooksOutlinedIcon from "@mui/icons-material/LibraryBooksOutlined";
import ManagerPageLayout from "../panels/ManagerPageLayout";
import CollectionList from "./CollectionList";
import { useTranslation } from "react-i18next";

/**
 * Full-screen Collections page. Reachable from the logo menu; wraps the
 * collection list in the shared manager chrome (header + back button).
 */
const CollectionsExplorer: React.FC = () => {
  const { t } = useTranslation();
  return (
  <ManagerPageLayout
    icon={<LibraryBooksOutlinedIcon sx={{ fontSize: 22 }} />}
    title={t("nav:rail.collections", { defaultValue: "Collections" })}
    subtitle={t("editor:ui.searchableDocumentCollections", { defaultValue: "Searchable document collections for RAG workflows — drop in PDFs, Markdown, HTML, or transcripts." })}
    docsTopic="collections"
  >
    <CollectionList />
  </ManagerPageLayout>
);
};

CollectionsExplorer.displayName = "CollectionsExplorer";

export default memo(CollectionsExplorer);
