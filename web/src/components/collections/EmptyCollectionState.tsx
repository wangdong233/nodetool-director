import {
  Text,
  FlexColumn,
  Divider,
  Box,
  SPACING,
  getSpacingPx
} from "../ui_primitives";
import { i18n } from "../../i18n";

const EmptyCollectionState = () => {
  return (
    <Box sx={{ marginTop: 2, maxWidth: 600 }}>
      <Text size="big" sx={{ margin: `${getSpacingPx(SPACING.xl)} 0 ${getSpacingPx(SPACING.md)} 0` }}>
        {i18n.t("editor:ui.vectorCollections")}
      </Text>
      <Text sx={{ marginBottom: 1 }}>
        Collections organize vector representations of your text and images in a
        local SQLite database.
      </Text>
      <Text sx={{ marginBottom: 2 }}>
        Creating a collection enables semantic search in your workflows,
        allowing nodes to find and process data based on conceptual meaning
        rather than exact keyword matches.
      </Text>

      <Divider sx={{ my: 3 }} />

      <FlexColumn gap={2}>
        <Text size="big">
          {i18n.t("editor:ui.noCollectionsFoundCreateOneToGetStarted")}
        </Text>

        <Text>{i18n.t("editor:ui.withACollectionYouCan", { defaultValue: "With a collection, you can:" })}</Text>
        <ul
          style={{
            paddingLeft: getSpacingPx(SPACING.xl),
            marginBottom: getSpacingPx(SPACING.xs),
            listStyle: "disc"
          }}
        >
          <li>{i18n.t("editor:ui.indexTextAndImagesAsVectorEmbeddings", { defaultValue: "Index text and images as vector embeddings" })}</li>
          <li>{i18n.t("ui2:attrs.performSemanticSimilaritySearches", { defaultValue: "Perform semantic similarity searches" })}</li>
          <li>{i18n.t("ui2:attrs.filterSearchResultsUsingMetadata", { defaultValue: "Filter search results using metadata" })}</li>
          <li>{i18n.t("ui2:attrs.batchProcessLargeSetsOfDocuments", { defaultValue: "Batch process large sets of documents" })}</li>
        </ul>
        <Text>
          Key nodes include <strong>{i18n.t("ui2:attrs.indexImage", { defaultValue: "Index Image" })}</strong> and{" "}
          <strong>{i18n.t("ui2:attrs.indexTextChunk", { defaultValue: "Index Text Chunk" })}</strong> for populating data, and{" "}
          <strong>{i18n.t("ui2:attrs.queryImage", { defaultValue: "Query Image" })}</strong>, <strong>{i18n.t("ui2:attrs.queryText", { defaultValue: "Query Text" })}</strong>, or{" "}
          <strong>{i18n.t("ui2:attrs.hybridSearch", { defaultValue: "Hybrid Search" })}</strong> for retrieval.
        </Text>
      </FlexColumn>
    </Box>
  );
};

export default EmptyCollectionState;
