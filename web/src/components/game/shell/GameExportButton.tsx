import { useState, type ReactNode } from "react";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";

import { ContextMenu, MenuItemPrimitive, ToolbarIconButton } from "../../ui_primitives";
import type { GameExportTarget } from "../../../utils/gameExportZip";
import { i18n } from "../../../i18n";

interface GameExportButtonProps {
  readonly exporting: boolean;
  readonly onExport: (target: GameExportTarget) => void;
  /** Compiles a desktop executable on this computer. The entry is hidden without it. */
  readonly onBuildExecutable?: () => void;
}

/** Toolbar menu that downloads the published revision as a web player or a desktop app project, or compiles it. */
export default function GameExportButton({ exporting, onExport, onBuildExecutable }: GameExportButtonProps): ReactNode {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const choose = (target: GameExportTarget): void => { setAnchor(null); onExport(target); };
  return <>
    <ToolbarIconButton icon={<ArchiveOutlinedIcon fontSize="small" />} tooltip={exporting ? i18n.t("game:export.exportingBuild", { defaultValue: "Exporting build" }) : i18n.t("game:export.exportBuild", { defaultValue: "Export build" })}
      aria-haspopup="menu" aria-expanded={anchor !== null} disabled={exporting} onClick={(event) => setAnchor(event.currentTarget)} />
    <ContextMenu open={anchor !== null} anchorEl={anchor} onClose={() => setAnchor(null)}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
      <MenuItemPrimitive label={i18n.t("game:export.webPlayer", { defaultValue: "Web player" })} secondary={i18n.t("game:export.webPlayerSecondary", { defaultValue: "Static site, published revision (.zip)" })} onClick={() => choose("web")} />
      <MenuItemPrimitive label={i18n.t("game:export.desktopApp", { defaultValue: "Desktop app" })} secondary={i18n.t("game:export.desktopAppSecondary", { defaultValue: "Tauri project for Windows, macOS and Linux (.zip)" })} onClick={() => choose("tauri")} />
      {onBuildExecutable && <MenuItemPrimitive label={i18n.t("game:export.desktopExecutable", { defaultValue: "Desktop executable" })} secondary={i18n.t("game:export.desktopExecutableSecondary", { defaultValue: "Compile on this computer with cargo, output in the Console" })}
        onClick={() => { setAnchor(null); onBuildExecutable(); }} />}
    </ContextMenu>
  </>;
}
