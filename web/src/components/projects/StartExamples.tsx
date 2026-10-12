import { lazy, Suspense, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LoadingSpinner, TabGroup } from "../ui_primitives";
import { useAppLanguage } from "../../i18n";
import DashboardExampleApps from "../portal/DashboardExampleApps";

const DashboardTemplates = lazy(() => import("../portal/DashboardTemplates"));
const DashboardExampleStoryboards = lazy(
  () => import("../portal/DashboardExampleStoryboards")
);
const DashboardExampleTimelines = lazy(
  () => import("../portal/DashboardExampleTimelines")
);
const DashboardExampleSketches = lazy(
  () => import("../portal/DashboardExampleSketches")
);
const DashboardExampleModels = lazy(
  () => import("../portal/DashboardExampleModels")
);
const DashboardExampleGames = lazy(
  () => import("../portal/DashboardExampleGames")
);

interface StartExamplesProps {
  onBrowseAll: () => void;
}

const EXAMPLE_TAB_VALUES = [
  "apps",
  "workflows",
  "storyboards",
  "timelines",
  "sketches",
  "models",
  "games"
] as const;

/** Tab label i18n keys — pure data, resolved at render time. */
const TAB_LABELS: Record<
  (typeof EXAMPLE_TAB_VALUES)[number],
  { key: string; defaultValue: string }
> = {
  apps: { key: "nav:qa.apps.label", defaultValue: "Apps" },
  workflows: { key: "editor:ui.workflows", defaultValue: "Workflows" },
  storyboards: { key: "editor:ui.storyboards", defaultValue: "Storyboards" },
  timelines: { key: "editor:ui.timelines", defaultValue: "Timelines" },
  sketches: { key: "editor:ui.sketches", defaultValue: "Sketches" },
  models: { key: "editor:ui.models3d", defaultValue: "3D models" },
  games: { key: "editor:ui.games", defaultValue: "Games" }
};

const StartExamples = ({ onBrowseAll }: StartExamplesProps) => {
  const { t } = useTranslation();
  // Subscribe so tab labels re-render on language change.
  const language = useAppLanguage();
  const [activeTab, setActiveTab] = useState("apps");

  const exampleTabs = useMemo(
    () =>
      EXAMPLE_TAB_VALUES.map((value) => {
        const { key, defaultValue } = TAB_LABELS[value];
        return { value, label: t(key, { defaultValue }) };
      }),
    [t, language.version]
  );

  return (
    <section aria-label={t("editor:ui.examples", { defaultValue: "Examples" })}>
      <TabGroup
        tabs={exampleTabs}
        value={activeTab}
        onChange={setActiveTab}
        aria-label={t("editor:ui.exampleTypes", { defaultValue: "Example types" })}
        size="small"
      />
      <Suspense fallback={<LoadingSpinner size="medium" text={t("editor:ui.loadingExamples", { defaultValue: "Loading examples" })} />}>
        {activeTab === "apps" ? (
          <DashboardExampleApps compact onBrowseAll={onBrowseAll} />
        ) : activeTab === "workflows" ? (
          <DashboardTemplates />
        ) : activeTab === "storyboards" ? (
          <DashboardExampleStoryboards />
        ) : activeTab === "timelines" ? (
          <DashboardExampleTimelines />
        ) : activeTab === "sketches" ? (
          <DashboardExampleSketches />
        ) : activeTab === "models" ? (
          <DashboardExampleModels />
        ) : (
          <DashboardExampleGames />
        )}
      </Suspense>
    </section>
  );
};

export default StartExamples;
