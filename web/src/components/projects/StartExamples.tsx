import { lazy, Suspense, useState } from "react";
import { LoadingSpinner, TabGroup } from "../ui_primitives";
import DashboardExampleApps from "../portal/DashboardExampleApps";
import { useTranslation } from "react-i18next";
import { i18n } from "../../../i18n";

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
  /** Opens the Game guided flow from the Games tab. */
  onMakeGame?: () => void;
}

const EXAMPLE_TABS = [
  { value: "apps", label: "Apps" },
  { value: "workflows", label: "Workflows", labelKey: "ui2:attrs.workflows" },
  { value: "storyboards", label: "Storyboards" },
  { value: "timelines", label: "Timelines" },
  { value: "sketches", label: "Sketches" },
  { value: "models", label: "3D models", labelKey: "timeline:attrs.kind3dModels" },
  { value: "games", label: "Games" }
];

const StartExamples = ({ onBrowseAll, onMakeGame }: StartExamplesProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("apps");

  return (
    <section aria-label={t("editor:ui.examples", { defaultValue: "Examples" })}>
      <TabGroup
        tabs={EXAMPLE_TABS}
        value={activeTab}
        onChange={setActiveTab}
        aria-label={t("editor:ui.exampleTypes", { defaultValue: "Example types" })}
        size="small"
      />
      <Suspense fallback={<LoadingSpinner size="medium" text={i18n.t("editor:ui.loadingExamples", { defaultValue: "Loading examples" })} />}>
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
          <DashboardExampleGames onMakeGame={onMakeGame} />
        )}
      </Suspense>
    </section>
  );
};

export default StartExamples;
