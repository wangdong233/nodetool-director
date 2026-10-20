import React, { memo, useState } from "react";
import { PageLayout, TabGroup } from "../ui_primitives";
import DashboardExampleApps from "./DashboardExampleApps";
import DashboardExampleGames from "./DashboardExampleGames";
import DashboardExampleModels from "./DashboardExampleModels";
import DashboardExampleSketches from "./DashboardExampleSketches";
import DashboardExampleStoryboards from "./DashboardExampleStoryboards";
import DashboardExampleTimelines from "./DashboardExampleTimelines";
import DashboardTemplates from "./DashboardTemplates";

/**
 * Full-screen Examples page. Reachable from the logo menu; wraps the shipped
 * examples for each editor in separate tabs.
 */
const ExamplesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("apps");

  return (
    <PageLayout padded={false} scrollable showHeader={false}>
      <TabGroup
        tabs={[
          { value: "apps", label: "Apps", labelKey: "editor:ui.appsTab" },
          { value: "workflows", label: "Workflows", labelKey: "ui2:attrs.workflows" },
          { value: "storyboards", label: "Storyboards", labelKey: "editor:ui.storyboards" },
          { value: "timelines", label: "Timelines", labelKey: "editor:ui.timelines" },
          { value: "sketches", label: "Sketches", labelKey: "editor:ui.sketches" },
          { value: "models", label: "3D models", labelKey: "timeline:attrs.kind3dModels" },
          { value: "games", label: "Games", labelKey: "editor:ui.gamesTab" }
        ]}
        value={activeTab}
        onChange={setActiveTab}
        sx={{ flexShrink: 0, borderBottom: 1, borderColor: "divider" }}
      />
      {activeTab === "apps" ? (
        <DashboardExampleApps />
      ) : activeTab === "workflows" ? (
        <DashboardTemplates fullPage />
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
    </PageLayout>
  );
};

ExamplesPage.displayName = "ExamplesPage";

export default memo(ExamplesPage);
