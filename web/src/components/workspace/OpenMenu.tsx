import { useCallback, useMemo, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";

import {
  Popover,
  MenuItemPrimitive,
  FlexColumn,
  FlexRow,
  Caption,
  Divider,
  LoadingSpinner
} from "../ui_primitives";
import { useExampleStoryboards } from "../../hooks/storyboard/useStoryboards";
import {
  TEXT_FILE_TEMPLATES,
  useNewDocumentCatalog,
  type NewDocumentSubmenu
} from "./newDocumentCatalog";
import { useGuidedFlowStarters } from "./useGuidedFlowStarters";
import { useTranslation } from "react-i18next";

interface OpenMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
}

type MenuView = "root" | NewDocumentSubmenu;

/** A section header inside the menu: quiet, uppercase-adjacent, padded. */
const MenuSectionLabel = ({ children }: { children: string }) => (
  <Caption color="muted" sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
    {children}
  </Caption>
);

/**
 * The `[+]` menu for the workspace tab bar. Two sections: the guided
 * creation flows (one click creates in the selected project and opens its
 * flow tab) and blank documents.
 * Starting a project lives on the project selector to the left of New.
 */
const OpenMenu = ({ anchorEl, open, onClose }: OpenMenuProps) => {
  const { t } = useTranslation();
  const [view, setView] = useState<MenuView>("root");

  const close = useCallback(() => {
    setView("root");
    onClose();
  }, [onClose]);

  const {
    entries,
    createTextFile,
    createBlankStoryboard,
    installStoryboardExample,
    creating
  } = useNewDocumentCatalog({}, close);
  const { starters, starting } = useGuidedFlowStarters(close);

  const busy = creating !== null || starting !== null;

  const { data: exampleData, isLoading: examplesLoading } =
    useExampleStoryboards(open && view === "storyboards");
  const exampleStoryboards = useMemo(() => exampleData ?? [], [exampleData]);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={close}
      placement="bottom-left"
      maxWidth={340}
      maxHeight="70vh"
    >
      <FlexColumn
        sx={{
          width: 320,
          py: 0.5,
          // One icon size for every row: 16px beats the default MUI small
          // (20px), which crowded the label at this menu's density.
          "& .MuiSvgIcon-root": { fontSize: 16 }
        }}
      >
        {view === "root" && (
          <>
            <MenuSectionLabel>{t("ui2:attrs.guidedFlows", { defaultValue: "Guided flows" })}</MenuSectionLabel>
            {starters.map((starter) => (
              <MenuItemPrimitive
                key={starter.id}
                label={t(`editor:ui.menuFlowTitle.${starter.id}`, { defaultValue: starter.title })}
                icon={starter.icon}
                secondary={t(`editor:ui.${starter.descriptionKey ?? ""}`, { defaultValue: starter.description })}
                onClick={() => void starter.start()}
                disabled={busy}
              />
            ))}

            <Divider sx={{ my: 1 }} />
            <MenuSectionLabel>{t("ui2:attrs.blankDocuments", { defaultValue: "Blank documents" })}</MenuSectionLabel>
            {entries.map((entry) => (
              <MenuItemPrimitive
                key={entry.key}
                label={t(`editor:ui.menuLabel.${entry.key}`, { defaultValue: entry.menuLabel })}
                icon={entry.icon}
                hasSubmenu={entry.submenu !== undefined}
                onClick={() =>
                  entry.submenu
                    ? setView(entry.submenu)
                    : void entry.create?.()
                }
                disabled={busy}
              />
            ))}
          </>
        )}

        {view === "texts" && (
          <>
            <MenuItemPrimitive
              label={t("timeline:addClip.back", { defaultValue: "Back" })}
              icon={<ArrowBackRoundedIcon fontSize="small" />}
              onClick={() => setView("root")}
              dividerAfter
            />
            {TEXT_FILE_TEMPLATES.map((template) => (
              <MenuItemPrimitive
                key={template.filename}
                label={t(`editor:ui.${"labelKey" in template ? template.labelKey : ""}`, { defaultValue: template.label })}
                onClick={() => void createTextFile(template)}
                disabled={busy}
              />
            ))}
          </>
        )}

        {view === "storyboards" && (
          <>
            <MenuItemPrimitive
              label={t("timeline:addClip.back", { defaultValue: "Back" })}
              icon={<ArrowBackRoundedIcon fontSize="small" />}
              onClick={() => setView("root")}
              dividerAfter
            />
            <MenuItemPrimitive
              label={t("ui2:attrs.blankStoryboard", { defaultValue: "Blank storyboard" })}
              icon={<AddRoundedIcon fontSize="small" />}
              onClick={() => void createBlankStoryboard()}
              disabled={busy}
              dividerAfter
            />
            {examplesLoading && (
              <FlexRow justify="center" sx={{ py: 2 }}>
                <LoadingSpinner />
              </FlexRow>
            )}
            {!examplesLoading && exampleStoryboards.length === 0 && (
              <Caption color="secondary" sx={{ px: 2, py: 1.5 }}>
                {t("editor:ui.noExampleStoryboardsAreInstalled")}
              </Caption>
            )}
            {exampleStoryboards.map((example) => (
              <MenuItemPrimitive
                key={example.slug}
                label={example.name}
                secondary={`${example.shotCount} shot${
                  example.shotCount === 1 ? "" : "s"
                }, stills included`}
                onClick={() =>
                  void installStoryboardExample(example.slug, example.name)
                }
                disabled={busy}
              />
            ))}
          </>
        )}
      </FlexColumn>
    </Popover>
  );
};

export default OpenMenu;
