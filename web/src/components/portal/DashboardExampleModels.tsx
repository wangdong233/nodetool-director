import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAssetStore } from "../../stores/AssetStore";
import {
  creationProjectId,
  useWorkspaceTabsStore
} from "../../stores/WorkspaceTabsStore";
import {
  Box,
  Card,
  Caption,
  EditorButton,
  EmptyState,
  FlexColumn,
  LoadingSpinner,
  PADDING,
  ResponsiveImage,
  SPACING,
  TabGroup,
  Text
} from "../ui_primitives";
import {
  EXAMPLE_MODEL_PACKS,
  exampleModelOverviewUri,
  fetchExampleModelCatalog,
  fetchExampleModelFile,
  type ExampleModel
} from "../../utils/exampleModels";
import { notifyMutationError } from "../../utils/notifyMutationError";

const exampleModelQueryKeys = {
  all: ["example-models"] as const,
  catalog: (pack: string) =>
    [...exampleModelQueryKeys.all, "catalog", pack] as const
};

const DashboardExampleModels = () => {
  const { t } = useTranslation();
  const [pack, setPack] = useState(EXAMPLE_MODEL_PACKS[0].slug);
  const navigate = useNavigate();
  const openTab = useWorkspaceTabsStore((state) => state.openTab);
  const createAsset = useAssetStore((state) => state.createAsset);
  const catalog = useQuery({
    queryKey: exampleModelQueryKeys.catalog(pack),
    queryFn: () => fetchExampleModelCatalog(pack),
    staleTime: Infinity
  });
  const install = useMutation({
    retry: false,
    mutationFn: async (model: ExampleModel) => {
      const projectId = creationProjectId();
      const file = await fetchExampleModelFile(model);
      const asset = await createAsset(
        file,
        undefined,
        undefined,
        undefined,
        undefined,
        projectId
      );
      return { asset, projectId };
    },
    onSuccess: ({ asset, projectId }, model) => {
      openTab({
        type: "model3d",
        ref: asset.id,
        mode: "edit",
        title: asset.name || model.name,
        projectId
      });
      navigate("/workspace");
    },
    onError: (error) => notifyMutationError("add the example model", error)
  });
  const packLabel =
    EXAMPLE_MODEL_PACKS.find((entry) => entry.slug === pack)?.label ?? pack;

  return (
    <FlexColumn
      component="section"
      aria-label={t("editor:ui.example3DModels", { defaultValue: "Example 3D models" })}
      gap={SPACING.xl}
      sx={{ p: SPACING.xxl }}
    >
      <FlexColumn gap={SPACING.xs}>
        <Text size="big">{t("editor:ui.startFromA3DModel", { defaultValue: "Start from a 3D model" })}</Text>
        <Text color="secondary">
          {t("editor:ui.exampleModelsLede", {
            defaultValue:
              "Open a low-poly game model in the 3D editor. Each opens as your own editable copy in the current project."
          })}
        </Text>
        <Caption>
          {t("editor:ui.exampleModelsMeta", {
            defaultValue: "glTF 2.0 · Meters, +Y up · No model or API key needed"
          })}
        </Caption>
      </FlexColumn>
      <TabGroup
        aria-label={t("editor:ui.modelPacks", { defaultValue: "Model packs" })}
        tabs={EXAMPLE_MODEL_PACKS.map(({ slug, label }) => ({
          value: slug,
          label
        }))}
        value={pack}
        onChange={setPack}
        size="small"
      />
      <Card padding="none" variant="outlined" sx={{ overflow: "hidden" }}>
        <ResponsiveImage
          locator={exampleModelOverviewUri(pack)}
          alt={t("editor:ui.everyModelInThePackAria", {
            defaultValue: "Every model in the {{pack}} pack",
            pack: packLabel
          })}
          aspectRatio="16 / 9"
          fit="contain"
          loading="lazy"
        />
      </Card>
      {catalog.isPending ? (
        <FlexColumn align="center" padding={PADDING.spacious}>
          <LoadingSpinner size="medium" text={t("editor:ui.loadingExampleModels", { defaultValue: "Loading models" })} />
        </FlexColumn>
      ) : catalog.isError ? (
        <EmptyState
          variant="error"
          title={t("editor:ui.couldntLoadModels", { defaultValue: "Couldn't load models" })}
          description={t("editor:ui.tryAgainInAMoment", { defaultValue: "Try again in a moment." })}
          actionText={t("editor:explorer.retry", { defaultValue: "Retry" })}
          onAction={() => void catalog.refetch()}
        />
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              md: "repeat(3, minmax(0, 1fr))"
            },
            gap: SPACING.xl
          }}
        >
          {catalog.data.models.map((model) => {
            const opening =
              install.isPending && install.variables?.uri === model.uri;
            return (
              <Card key={model.uri} variant="outlined">
                <FlexColumn gap={SPACING.sm} sx={{ height: "100%" }}>
                  <Text size="normal">{model.name}</Text>
                  <Text color="secondary">{model.use}</Text>
                  <Caption>
                    {t("editor:ui.trianglesCount", {
                      defaultValue: "{{count}} triangles",
                      count: model.triangles.toLocaleString()
                    })}
                    {model.clips.length > 0
                      ? ` · ${model.clips.join(", ")}`
                      : ""}
                  </Caption>
                  <EditorButton
                    disabled={install.isPending}
                    aria-label={t("editor:ui.openNamedItem", { defaultValue: "Open {{name}}", name: model.name })}
                    aria-busy={opening}
                    onClick={() => install.mutate(model)}
                    sx={{ alignSelf: "flex-start", mt: "auto" }}
                  >
                    {opening
                      ? t("editor:ui.openingModel", { defaultValue: "Opening model…" })
                      : t("editor:ui.openModel", { defaultValue: "Open model" })}
                  </EditorButton>
                </FlexColumn>
              </Card>
            );
          })}
        </Box>
      )}
    </FlexColumn>
  );
};

export default DashboardExampleModels;
