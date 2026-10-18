import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  creationProjectId,
  useWorkspaceTabsStore
} from "../../stores/WorkspaceTabsStore";
import useOnboardingStore from "../../stores/OnboardingStore";
import { trpc } from "../../trpc/client";
import {
  AutoGrid,
  Card,
  Caption,
  EditorButton,
  FlexColumn,
  ResponsiveImage,
  SPACING,
  TabGroup,
  Text,
  TYPOGRAPHY
} from "../ui_primitives";
import {
  EXAMPLE_SKETCHES,
  exampleSketchUrl,
  type ExampleSketch
} from "../../utils/exampleSketches";
import { installExampleSketch } from "../../utils/installExampleSketch";
import { notifyMutationError } from "../../utils/notifyMutationError";
import { NO_EXAMPLE_NEEDS } from "../../utils/exampleNeeds";
import ExampleNeedsPill from "./ExampleNeedsPill";
import { useTranslation } from "react-i18next";
import { i18n } from "../../i18n";

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
    mutationFn: (example: ExampleSketch) =>
      installExampleSketch(example, creationProjectId()),
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
      useOnboardingStore.getState().markStep("keep-creating");
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
          Sketch a campaign, plan a film, or explore a painted study. Each opens
          as your own editable copy with separate layers.
        </Text>
        <Caption>
          1200 × 900 · Five vector layers each · No model or API key needed
        </Caption>
      </FlexColumn>
      <TabGroup
        aria-label={t("editor:ui.sketchCategories", { defaultValue: "Sketch categories" })}
        tabs={["All", "NodeTool", "Ads", "Movies", i18n.t("editor:ui.sketchCategoryArtStudies", { defaultValue: "Art studies" })].map(
          (label) => ({ value: label, label })
        )}
        value={category}
        onChange={setCategory}
        size="small"
      />
      <AutoGrid minItemWidth={360} gap={SPACING.xl}>
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
              preferThumbnail
            />
            <FlexColumn gap={SPACING.md} sx={{ p: SPACING.xl }}>
              <Caption>{example.category}</Caption>
              <Text sx={TYPOGRAPHY.sans.label}>{example.name}</Text>
              <Caption color="secondary">{example.description}</Caption>
              <ExampleNeedsPill needs={NO_EXAMPLE_NEEDS} />
              <EditorButton
                disabled={install.isPending}
                aria-label={`Open ${example.name}`}
                aria-busy={
                  install.isPending && install.variables?.slug === example.slug
                }
                onClick={() => install.mutate(example)}
              >
                {install.isPending && install.variables?.slug === example.slug
                  ? t("editor:ui.openingSketch", { defaultValue: "Opening sketch…" }) : i18n.t("editor:ui.openSketch", { defaultValue: "Open sketch" })}
              </EditorButton>
            </FlexColumn>
          </Card>
        ))}
      </AutoGrid>
    </FlexColumn>
  );
};

export default DashboardExampleSketches;
