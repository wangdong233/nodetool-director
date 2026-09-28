import React, { memo } from "react";
import LibraryBooksOutlinedIcon from "@mui/icons-material/LibraryBooksOutlined";
import ManagerPageLayout from "../panels/ManagerPageLayout";
import CollectionList from "./CollectionList";
import { i18n } from "../../i18n";

/**
 * Full-screen Collections page. Reachable from the logo menu; wraps the
 * collection list in the shared manager chrome (header + back button).
 */
const CollectionsExplorer: React.FC = () => (
  <ManagerPageLayout
    icon={<LibraryBooksOutlinedIcon sx={{ fontSize: 22 }} />}
    title={i18n.t("nav:rail.collections", { defaultValue: "Collections" })}
    subtitle={i18n.t("editor:ui.searchableDocumentCollections", { defaultValue: "Searchable document collections for RAG workflows — drop in PDFs, Markdown, HTML, or transcripts." })}
    docsTopic="collections"
  >
    <CollectionList />
  </ManagerPageLayout>
);

CollectionsExplorer.displayName = "CollectionsExplorer";

export default memo(CollectionsExplorer);
