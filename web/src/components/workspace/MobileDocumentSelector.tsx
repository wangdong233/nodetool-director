/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { memo, useCallback, useMemo, useState } from "react";
import { useTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";

import type {
  WorkspaceTab,
  WorkspaceTabType
} from "../../stores/WorkspaceTabsStore";
import { useIsWorkflowRunning } from "../../hooks/useWorkflowRunnerState";
import { useWorkflowDirty } from "../../hooks/useWorkflowDirty";
import { useSettingsStore } from "../../stores/SettingsStore";
import { i18n, useAppLanguage } from "../../i18n";
import {
  BORDER_RADIUS,
  Caption,
  CloseButton,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  LoadingSpinner,
  MobileBottomSheet,
  MOTION,
  SPACING,
  getSpacingPx
} from "../ui_primitives";
import { tabDisplayTitle, tabTypeName } from "./tabTypeIdentity";

const t18 = (key: string, fallback: string, options?: Record<string, string>) =>
  i18n.t(`nav:tabs.${key}`, { defaultValue: fallback, ...options });

interface MobileDocumentSelectorProps {
  tabs: WorkspaceTab[];
  activeTabId: string | null;
  typeColor: Record<WorkspaceTabType, string>;
  typeGlyph: Record<WorkspaceTabType, string>;
  onActivate: (tabId: string) => void;
  onClose: (tab: WorkspaceTab) => void;
  onCloseAll: () => void;
}

const styles = (theme: Theme) =>
  css({
    WebkitAppRegion: "no-drag",
    flex: 1,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: getSpacingPx(SPACING.sm),
    height: "100%",
    padding: `0 ${getSpacingPx(SPACING.md)}`,
    border: "none",
    background: "transparent",
    color: theme.vars.palette.text.primary,
    fontSize: "var(--fontSizeSmall)",
    cursor: "pointer",
    textAlign: "left",
    transition: `background-color ${MOTION.fast}`,
    "&:active": {
      backgroundColor: theme.vars.palette.action.hover
    },
    "& .glyph": { flexShrink: 0 },
    "& .doc-title": {
      flex: 1,
      minWidth: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    },
    "& .doc-count": {
      flexShrink: 0,
      padding: `0 ${getSpacingPx(SPACING.sm)}`,
      borderRadius: BORDER_RADIUS.pill,
      backgroundColor: theme.vars.palette.action.selected,
      color: theme.vars.palette.text.secondary,
      fontSize: "var(--fontSizeSmaller)",
      lineHeight: "18px"
    },
    "& .caret": {
      flexShrink: 0,
      width: "18px",
      height: "18px",
      color: theme.vars.palette.text.secondary
    }
  });

const sheetStyles = (theme: Theme) =>
  css({
    paddingBottom: getSpacingPx(SPACING.xl),
    "& .doc-row": {
      minHeight: "44px",
      gap: getSpacingPx(SPACING.md),
      paddingLeft: getSpacingPx(SPACING.xl),
      paddingRight: getSpacingPx(SPACING.xl),
      "&.selected": {
        backgroundColor: theme.vars.palette.action.selected
      }
    },
    "& .row-glyph": {
      flexShrink: 0,
      width: "20px",
      textAlign: "center"
    },
    "& .dirty-dot": {
      width: "8px",
      height: "8px",
      borderRadius: BORDER_RADIUS.circle,
      backgroundColor: theme.vars.palette.warning.main,
      flexShrink: 0
    },
    "& .row-close": {
      flexShrink: 0,
      width: "44px",
      height: "44px"
    },
    "& .close-all": {
      minHeight: "44px",
      paddingLeft: getSpacingPx(SPACING.xl),
      color: theme.vars.palette.text.secondary
    }
  });

/** Live per-document status: run spinner and unsaved-changes dot. */
const DocumentStatus = memo(function DocumentStatus({
  tab
}: {
  tab: WorkspaceTab;
}) {
  // Subscribe so the raw-i18n.t aria-label re-renders on language change.
  useAppLanguage();
  const workflowId = tab.type === "workflow" ? tab.ref : undefined;
  const isDirty = useWorkflowDirty(workflowId);
  const isRunning = useIsWorkflowRunning(workflowId);
  // Instant-update re-runs on every keystroke, which would strobe the spinner.
  const instantUpdate = useSettingsStore(
    (state) => state.settings.instantUpdate
  );

  return (
    <>
      {isRunning && !instantUpdate && (
        <LoadingSpinner
          inline
          variant="circular"
          size={12}
          thickness={4}
          color="primary"
        />
      )}
      {isDirty && (
        <span
          className="dirty-dot"
          role="img"
          aria-label={t18("unsaved", "unsaved changes")}
        />
      )}
    </>
  );
});

/**
 * The mobile stand-in for the tab strip: a single button naming the open
 * document, opening a bottom sheet that lists every open document. Tabs are
 * unusable at phone widths — they truncate to a few characters and their close
 * targets fall well under 44px.
 */
const MobileDocumentSelector = ({
  tabs,
  activeTabId,
  typeColor,
  typeGlyph,
  onActivate,
  onClose,
  onCloseAll
}: MobileDocumentSelectorProps) => {
  const theme = useTheme();
  // Subscribe so raw-i18n.t reads below re-render on language change.
  useAppLanguage();
  const buttonStyles = useMemo(() => styles(theme), [theme]);
  const listStyles = useMemo(() => sheetStyles(theme), [theme]);
  const [open, setOpen] = useState(false);

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [tabs, activeTabId]
  );

  const closeSheet = useCallback(() => setOpen(false), []);

  const handleSelect = useCallback(
    (tabId: string) => {
      onActivate(tabId);
      setOpen(false);
    },
    [onActivate]
  );

  const handleCloseAll = useCallback(() => {
    onCloseAll();
    setOpen(false);
  }, [onCloseAll]);

  return (
    <>
      <button
        type="button"
        css={buttonStyles}
        className="document-selector"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          activeTab
            ? t18("openDocument", "Open document: {{title}}", {
                title: tabDisplayTitle(activeTab)
              })
            : t18("openDocuments", "Open documents")
        }
        onClick={() => setOpen(true)}
      >
        {activeTab && (
          <span className="glyph" style={{ color: typeColor[activeTab.type] }}>
            {typeGlyph[activeTab.type]}
          </span>
        )}
        <span className="doc-title">
          {activeTab
            ? tabDisplayTitle(activeTab)
            : t18("noDocumentOpen", "No document open")}
        </span>
        {activeTab && <DocumentStatus tab={activeTab} />}
        {tabs.length > 1 && <span className="doc-count">{tabs.length}</span>}
        <ExpandMoreRoundedIcon className="caret" aria-hidden />
      </button>

      <MobileBottomSheet
        open={open}
        onClose={closeSheet}
        title={t18("openDocuments", "Open documents")}
        ariaLabel={t18("switchDocs", "Switch between open documents")}
      >
        <div css={listStyles}>
          {tabs.length === 0 && (
            <Caption color="secondary" sx={{ px: 2.5, py: 2 }}>
              {t18(
                "emptyDocs",
                "No documents open — use + to open or create one."
              )}
            </Caption>
          )}
          <List dense disablePadding>
            {tabs.map((tab) => (
              <ListItem
                key={tab.id}
                disablePadding
                secondaryAction={
                  <CloseButton
                    className="row-close"
                    tooltip={t18("closeNamed", "Close {{title}}", {
                      title: tabDisplayTitle(tab)
                    })}
                    onClick={() => onClose(tab)}
                  />
                }
              >
                <ListItemButton
                  className={`doc-row${tab.id === activeTabId ? " selected" : ""}`}
                  selected={tab.id === activeTabId}
                  onClick={() => handleSelect(tab.id)}
                >
                  <span
                    className="row-glyph"
                    style={{ color: typeColor[tab.type] }}
                    aria-hidden
                  >
                    {typeGlyph[tab.type]}
                  </span>
                  <ListItemText
                    primary={tabDisplayTitle(tab)}
                    secondary={tabTypeName(tab.type)}
                  />
                  <DocumentStatus tab={tab} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          {tabs.length > 1 && (
            <>
              <Divider />
              <List dense disablePadding>
                <ListItem disablePadding>
                  <ListItemButton
                    className="close-all"
                    onClick={handleCloseAll}
                  >
                    <ListItemText
                      primary={t18("closeAllDocs", "Close all documents")}
                    />
                  </ListItemButton>
                </ListItem>
              </List>
            </>
          )}
        </div>
      </MobileBottomSheet>
    </>
  );
};

export default memo(MobileDocumentSelector);
