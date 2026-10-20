import type { MouseEvent } from "react";

import {
  Divider,
  ContextMenu,
  ListSubheader,
  MenuItemPrimitive
} from "../ui_primitives";
import ContextMenuItem from "./ContextMenuItem";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import SortByAlphaIcon from "@mui/icons-material/SortByAlpha";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import StorageIcon from "@mui/icons-material/Storage";
import useContextMenuStore from "../../stores/ContextMenuStore";
import { useAssetGridStore } from "../../stores/AssetGridStore";
import { useSettingsStore } from "../../stores/SettingsStore";
import { useTranslation } from "react-i18next";

const AssetGridContextMenu = () => {
  const { t } = useTranslation();
  const currentFolder = useAssetGridStore((state) => state.currentFolder);
  const menuPosition = useContextMenuStore((state) => state.menuPosition);
  const closeContextMenu = useContextMenuStore(
    (state) => state.closeContextMenu
  );
  const setCreateFolderDialogOpen = useAssetGridStore(
    (state) => state.setCreateFolderDialogOpen
  );
  const assetsOrder = useSettingsStore((state) => state.settings.assetsOrder);
  const setAssetsOrder = useSettingsStore((state) => state.setAssetsOrder);

  const withMenuClose =
    (action: () => void) =>
    (event?: MouseEvent) => {
      event?.stopPropagation();
      action();
      closeContextMenu();
    };

  const handleCreateFolder = withMenuClose(() => setCreateFolderDialogOpen(true));
  const handleSortByName = withMenuClose(() => setAssetsOrder("name"));
  const handleSortByDate = withMenuClose(() => setAssetsOrder("date"));
  const handleSortBySize = withMenuClose(() => setAssetsOrder("size"));

  if (!menuPosition) {return null;}

  return (
    <ContextMenu
      className="context-menu asset-grid-context-menu"
      open={menuPosition !== null}
      onContextMenu={(event) => event.preventDefault()}
      onClose={closeContextMenu}
      position={menuPosition}
    >
      <ListSubheader className="title">
        Folder: {currentFolder?.name || "ASSETS"}
      </ListSubheader>
      <ContextMenuItem
        onClick={handleCreateFolder}
        label={t("editor:asset.createNewFolder", { defaultValue: "Create new folder" })}
        IconComponent={<CreateNewFolderIcon />}
        tooltip={`Create a new folder in '${currentFolder?.name || "ASSETS"}' `}
      />
      <Divider />
      <MenuItemPrimitive
        onClick={handleSortByName}
        label={t("editor:asset.sortName", { defaultValue: "Sort by name" })}
        selected={assetsOrder === "name"}
        icon={<SortByAlphaIcon />}
        tooltip={t("editor:asset.sortByName", { defaultValue: "Sort assets by name" })}
      />
      <MenuItemPrimitive
        onClick={handleSortByDate}
        label={t("editor:asset.sortDate", { defaultValue: "Sort by date" })}
        selected={assetsOrder === "date"}
        icon={<AccessTimeIcon />}
        tooltip={t("editor:asset.sortByDate", { defaultValue: "Sort assets by creation date" })}
      />
      <MenuItemPrimitive
        onClick={handleSortBySize}
        label={t("editor:asset.sortSize", { defaultValue: "Sort by size" })}
        selected={assetsOrder === "size"}
        icon={<StorageIcon />}
        tooltip={t("editor:asset.sortBySize", { defaultValue: "Sort assets by file size" })}
      />
    </ContextMenu>
  );
};

export default AssetGridContextMenu;
