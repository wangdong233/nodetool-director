import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  creationProjectId,
  useWorkspaceTabsStore
} from "../../stores/WorkspaceTabsStore";
import { trpc, trpcClient } from "../../trpc/client";
import {
  Box,
  Card,
  Caption,
  EditorButton,
  FlexColumn,
  ResponsiveImage,
  SPACING,
  TabGroup,
  Text
} from "../ui_primitives";
import { newDocumentId } from "../../lib/newDocumentId";
import {
  buildExampleSketch,
  EXAMPLE_SKETCHES,
  EXAMPLE_SKETCH_HEIGHT,
  EXAMPLE_SKETCH_WIDTH,
  exampleSketchUrl,
  type ExampleSketch
} from "../../utils/exampleSketches";
import { notifyMutationError } from "../../utils/notifyMutationError";

/**
 * Category values double as filter identifiers (compared against
 * `example.category`), so they stay English; only the display label
 * localizes. NodeTool is a brand and stays Latin in both.
 */
const SKETCH_CATEGORY_LABELS: Record<string, { key: string; en: string } | null> = {
  All: { key: "editor:ui.sketchCategoryAll", en: "All" },
  Ads: { key: "editor:ui.sketchCategoryAds", en: "Ads" },
  Movies: { key: "editor:ui.sketchCategoryMovies", en: "Movies" },
  "Art studies": { key: "editor:ui.sketchCategoryArtStudies", en: "Art studies" },
  NodeTool: null
};

type Translate = ReturnType<typeof useTranslation>["t"];

const sketchCategoryLabel = (t: Translate, category: string): string => {
  const entry = SKETCH_CATEGORY_LABELS[category];
  return entry ? t(entry.key, { defaultValue: entry.en }) : category;
};

const DashboardExampleSketches = () => {
  const { t } = useTranslation();
  const [category, setCategory] = useState("All");
  const examples = EXAMPLE_SKETCHES.filter(
    (example) => category === "All" || example.category === category
  );
  const navigate = useNavigate();
  const openTab = useWorkspaceTabsStore((state) => state.openTab);
  const utils = trpc.useUtils();
  const install = useMutation({
    retry: false,
    mutationFn: async (example: ExampleSketch) => {
      const projectId = creationProjectId();
      const document = await buildExampleSketch(example);
      const created = await trpcClient.sketch.create.mutate({
        id: newDocumentId(),
        name: example.name,
        projectId,
        backgroundColor: document.sketch.canvas.backgroundColor,
        width: EXAMPLE_SKETCH_WIDTH,
        height: EXAMPLE_SKETCH_HEIGHT
      });
      try {
        return await trpcClient.sketch.update.mutate({
          id: created.id,
          document
        });
      } catch (error) {
        await trpcClient.sketch.delete.mutate({ id: created.id });
        throw error;
      }
    },
    onSuccess: (created) => {
      utils.sketch.get.setData({ id: created.id }, created);
      void utils.sketch.list.invalidate();
      openTab({
        type: "sketch",
        ref: created.id,
        mode: "edit",
        title: created.name,
        projectId: created.projectId
      });
      navigate("/workspace");
    },
    onError: (error) => notifyMutationError("add the example sketch", error)
  });

  return (
    <FlexColumn
      component="section"
      aria-label={t("editor:ui.exampleSketches", { defaultValue: "Example sketches" })}
      gap={SPACING.xl}
      sx={{ p: SPACING.xxl }}
    >
      <FlexColumn gap={SPACING.xs}>
        <Text size="big">{t("editor:ui.makeASketchYourOwn", { defaultValue: "Make a sketch your own" })}</Text>
        <Text color="secondary">
          {t("editor:ui.exampleSketchesLede", {
            defaultValue:
              "Sketch a campaign, plan a film, or explore a painted study. Each opens as your own editable copy with separate layers."
          })}
        </Text>
        <Caption>
          {t("editor:ui.exampleSketchesMeta", {
            defaultValue:
              "1200 × 900 · Five vector layers each · No model or API key needed"
          })}
        </Caption>
      </FlexColumn>
      <TabGroup
        aria-label={t("editor:ui.sketchCategories", { defaultValue: "Sketch categories" })}
        tabs={["All", "NodeTool", "Ads", "Movies", "Art studies"].map(
          (value) => ({ value, label: sketchCategoryLabel(t, value) })
        )}
        value={category}
        onChange={setCategory}
        size="small"
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
          gap: SPACING.xl
        }}
      >
        {examples.map((example) => (
          <Card
            key={example.slug}
            padding="none"
            variant="outlined"
            sx={{ overflow: "hidden" }}
          >
            <ResponsiveImage
              locator={exampleSketchUrl(example.slug, "preview")}
              alt={example.description}
              aspectRatio="4 / 3"
              loading="lazy"
            />
            <FlexColumn gap={SPACING.md} sx={{ p: SPACING.xl }}>
              <Caption>{sketchCategoryLabel(t, example.category)}</Caption>
              <Text size="big">{example.name}</Text>
              <Text color="secondary">{example.description}</Text>
              <EditorButton
                disabled={install.isPending}
                aria-label={t("editor:ui.openNamedItem", { defaultValue: "Open {{name}}", name: example.name })}
                aria-busy={
                  install.isPending && install.variables?.slug === example.slug
                }
                onClick={() => install.mutate(example)}
              >
                {install.isPending && install.variables?.slug === example.slug
                  ? t("editor:ui.openingSketch", { defaultValue: "Opening sketch…" })
                  : t("editor:ui.openSketch", { defaultValue: "Open sketch" })}
              </EditorButton>
            </FlexColumn>
          </Card>
        ))}
      </Box>
    </FlexColumn>
  );
};

export default DashboardExampleSketches;
