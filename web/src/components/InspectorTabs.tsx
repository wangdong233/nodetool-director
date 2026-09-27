import React from "react";
import { i18n } from "../i18n";

/** The tabs shown at the top of the Inspector panel. */
export type InspectorTab = "params" | "io" | "help";

// Labels resolve per call (tabLabel) — module-level i18n.t would freeze
// before the async zh bundle lands at boot.
const TAB_DEFS: { value: InspectorTab; labelKey: string; labelDefault: string; hasCount: boolean }[] = [
  { value: "params", labelKey: "editor:inspector.tabParams", labelDefault: "Params", hasCount: true },
  { value: "io", labelKey: "editor:inspector.tabIO", labelDefault: "I/O", hasCount: true },
  { value: "help", labelKey: "editor:inspector.tabHelp", labelDefault: "Help", hasCount: false }
];

interface InspectorTabsProps {
  active: InspectorTab;
  onChange: (next: InspectorTab) => void;
  counts: Partial<Record<InspectorTab, number>>;
}

/** Presentational tab strip for the Inspector. */
export const InspectorTabs: React.FC<InspectorTabsProps> = ({
  active,
  onChange,
  counts
}) => (
  <div className="inspector-tabs" role="tablist">
    {TAB_DEFS.map((tab) => {
      const count = counts[tab.value];
      const isActive = active === tab.value;
      return (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={isActive}
          className={`inspector-tab${isActive ? " is-active" : ""}`}
          onClick={() => onChange(tab.value)}
        >
          {i18n.t(tab.labelKey, { defaultValue: tab.labelDefault })}
          {tab.hasCount && count != null ? (
            <span className="tab-count">{count}</span>
          ) : null}
        </button>
      );
    })}
  </div>
);
