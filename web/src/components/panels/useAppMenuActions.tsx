import React, { useCallback, useMemo } from "react";
import { useAppLanguage } from "../../i18n";
import { useShallow } from "zustand/react/shallow";
import SettingsIcon from "@mui/icons-material/Settings";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import DownloadIcon from "@mui/icons-material/Download";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import ViewInArOutlinedIcon from "@mui/icons-material/ViewInArOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LibraryBooksOutlinedIcon from "@mui/icons-material/LibraryBooksOutlined";
import FolderSpecialOutlinedIcon from "@mui/icons-material/FolderSpecialOutlined";
import PermMediaOutlinedIcon from "@mui/icons-material/PermMediaOutlined";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";

import { isProduction } from "../../lib/env";
import { useAppHeaderStore } from "../../stores/AppHeaderStore";
import { useModelDownloadStore } from "../../stores/ModelDownloadStore";
import { openPageTab } from "../workspace/openPageTab";
import { type PageTabKey } from "../workspace/pageTabs";
import { useTranslation } from "react-i18next";

export interface AppMenuAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  placement: "logo" | "sidebar";
  /** Trailing text, e.g. live download progress. */
  secondary?: string;
  /** Group separator after this entry. */
  dividerAfter?: boolean;
}

/**
 * The app-level destinations behind the logo: page tabs, Help, and Downloads.
 * Shared by the desktop rail's popover (RailAppMenu) and the mobile browse
 * sheet's More section (AppPagesList) so the two cannot drift.
 *
 * Callers own the Help dialog: render `<Help>` against `useAppHeaderStore`,
 * since the Downloads dialog and page tabs mount themselves but Help does not.
 */
export const useAppMenuActions = (onFinish?: () => void): AppMenuAction[] => {
  const { t } = useTranslation();
  const handleOpenHelp = useAppHeaderStore((state) => state.handleOpenHelp);
  const { downloads, openDownloadsDialog } = useModelDownloadStore(
    useShallow((state) => ({
      downloads: state.downloads,
      openDownloadsDialog: state.openDialog
    }))
  );

  const finish = useCallback(() => onFinish?.(), [onFinish]);

  const openPage = useCallback(
    (key: PageTabKey) => {
      openPageTab(key);
      finish();
    },
    [finish]
  );

  // Aggregate percent across in-flight downloads; null when nothing is running.
  const downloadProgress = useMemo(() => {
    const active = Object.values(downloads).filter(
      (download) => download.status === "progress"
    );
    if (active.length === 0) return null;
    const total = active.reduce((sum, d) => sum + d.totalBytes, 0);
    const done = active.reduce((sum, d) => sum + d.downloadedBytes, 0);
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [downloads]);

  const { language } = useAppLanguage(); // live language for the memo dep (R5-2)

  return useMemo(() => {
    const actions: AppMenuAction[] = [
      {
        key: "tutorials",
        label: t("nav:rail.tutorials"),
        icon: <SchoolOutlinedIcon />,
        placement: "sidebar",
        onClick: () => openPage("tutorials")
      },
      {
        key: "examples",
        label: t("nav:rail.examples"),
        icon: <AutoAwesomeOutlinedIcon />,
        placement: "sidebar",
        onClick: () => openPage("examples")
      },
      {
        key: "costs",
        label: t("nav:rail.costs"),
        icon: <PaidOutlinedIcon />,
        placement: "sidebar",
        onClick: () => openPage("costs"),
        dividerAfter: true
      },
      {
        key: "models",
        label: t("nav:rail.models"),
        icon: <ViewInArOutlinedIcon />,
        placement: "sidebar",
        onClick: () => openPage("models")
      }
    ];

    if (!isProduction) {
      actions.push({
        key: "packages",
        label: t("nav:rail.packages"),
        icon: <Inventory2OutlinedIcon />,
        placement: "sidebar",
        onClick: () => openPage("packages")
      });
    }

    actions.push(
      {
        key: "assets",
        label: t("nav:rail.assets"),
        icon: <PermMediaOutlinedIcon />,
        placement: "sidebar",
        onClick: () => openPage("assets")
      },
      {
        key: "collections",
        label: t("nav:rail.collections"),
        icon: <LibraryBooksOutlinedIcon />,
        placement: "sidebar",
        onClick: () => openPage("collections")
      },
      {
        key: "workspaces",
        label: t("nav:rail.workspaces"),
        icon: <FolderSpecialOutlinedIcon />,
        placement: "sidebar",
        onClick: () => openPage("workspaces")
      },
      {
        key: "memory",
        label: t("nav:rail.memory"),
        icon: <PsychologyOutlinedIcon />,
        placement: "sidebar",
        onClick: () => openPage("memory"),
        dividerAfter: true
      },
      {
        key: "settings",
        label: t("nav:rail.settings"),
        icon: <SettingsIcon />,
        placement: "logo",
        onClick: () => openPage("settings")
      },
      {
        key: "help",
        label: t("nav:rail.help"),
        icon: <HelpOutlineIcon />,
        placement: "logo",
        onClick: () => {
          handleOpenHelp();
          finish();
        }
      },
      {
        key: "downloads",
        label: t("nav:rail.downloads"),
        icon: <DownloadIcon />,
        placement: "logo",
        onClick: () => {
          openDownloadsDialog();
          finish();
        },
        secondary: downloadProgress != null ? `${downloadProgress}%` : undefined
      }
    );

    return actions;
  }, [
    t,
    openPage,
    finish,
    handleOpenHelp,
    openDownloadsDialog,
    downloadProgress,
    language
  ]);
};
