import { useCallback, memo } from "react";
import { i18n } from "../../i18n";

interface SidebarItem {
  id: string;
  label: string;
  labelKey?: string;
}

export interface SidebarSection {
  category: string;
  items: SidebarItem[];
  categoryKey?: string;
}

interface SettingsSidebarProps {
  activeSection: string;
  sections: SidebarSection[];
  onSectionClick: (sectionId: string) => void;
  footer?: React.ReactNode;
}

const SettingsSidebar = ({
  activeSection,
  sections,
  onSectionClick,
  footer
}: SettingsSidebarProps) => {
  const handleItemClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const sectionId = event.currentTarget.dataset.sectionId;
      if (sectionId) {
        onSectionClick(sectionId);
      }
    },
    [onSectionClick]
  );

  return (
    <nav className="settings-sidebar" aria-label={i18n.t("editor:ui.settingsSections", { defaultValue: "Settings sections" })}>
      {sections.map((section) => (
        <div key={section.category || section.items[0]?.id} className="settings-sidebar-folder">
          {section.category ? (
            <p className="settings-sidebar-category">
              <span className="settings-sidebar-category-label">
                {i18n.t(`settings:sidebar.${section.categoryKey ?? ""}`, { defaultValue: section.category })}
              </span>
            </p>
          ) : null}
          <div className="settings-sidebar-folder-items">
            {section.items.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-section-id={item.id}
                  className={`settings-sidebar-item${isActive ? " active" : ""}`}
                  aria-current={isActive ? "true" : undefined}
                  onClick={handleItemClick}
                >
                  {i18n.t(`settings:sidebar.${item.labelKey ?? ""}`, { defaultValue: item.label })}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {footer && <div className="settings-sidebar-footer">{footer}</div>}
    </nav>
  );
};

export default memo(SettingsSidebar);
