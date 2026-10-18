import React, { memo } from "react";
import LibraryBooksOutlinedIcon from "@mui/icons-material/LibraryBooksOutlined";
import { PageLayout, ICON_SIZE } from "../ui_primitives";
import CollectionList from "./CollectionList";
import { i18n } from "../../i18n";

/**
 * Full-screen Collections page. Reachable from the logo menu; wraps the
 * collection list in the shared manager chrome (header + back button).
 */
const CollectionsExplorer: React.FC = () => (
  <PageLayout
    icon={<LibraryBooksOutlinedIcon sx={{ fontSize: ICON_SIZE.lg }} />}
    title="Collections"
    subtitle={i18n.t("editor:ui.searchableDocumentCollections", { defaultValue: "Searchable document collections for RAG workflows — drop in PDFs, Markdown, HTML, or transcripts." })}
    docsTopic="collections"
  >
    <CollectionList />
  </PageLayout>
);

CollectionsExplorer.displayName = "CollectionsExplorer";

export default memo(CollectionsExplorer);
