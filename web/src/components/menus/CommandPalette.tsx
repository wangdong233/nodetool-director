/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import React, { useEffect, useRef } from "react";
import { Command, CommandInput } from "cmdk";
import { useTranslation } from "react-i18next";

import { useCommandMenuStore } from "../../stores/CommandMenuStore";
import { useAutoFocusEnabled } from "../../hooks/useAutoFocusEnabled";
import { Dialog } from "../ui_primitives";
import ContextCommandGroups from "./ContextCommandGroups";
import GlobalCommandGroups, { SwitchTabCommands } from "./GlobalCommandGroups";

const styles = css({
  ".MuiDialog-paper": {
    maxWidth: "800px",
    width: "40vw",
    minWidth: "min(560px, 92vw)",
    background: "transparent",
    boxShadow: "none"
  }
});

interface CommandPaletteProps {
  /** Commands of the view that renders the palette, after registered ones. */
  children?: React.ReactNode;
}

/**
 * The Cmd+K dialog. Open tabs come first, then the active view's commands,
 * then the commands that work everywhere.
 */
const CommandPalette: React.FC<CommandPaletteProps> = ({ children }) => {
  const { t } = useTranslation();
  const open = useCommandMenuStore((state) => state.open);
  const setOpen = useCommandMenuStore((state) => state.setOpen);
  const input = useRef<HTMLInputElement>(null);
  const autoFocusEnabled = useAutoFocusEnabled();

  // Skipped on touch, where the virtual keyboard would cover the command list.
  useEffect(() => {
    if (!open || !autoFocusEnabled) {
      return;
    }
    const timeout = setTimeout(() => input.current?.focus(), 0);
    return () => clearTimeout(timeout);
  }, [open, autoFocusEnabled]);

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      className="command-menu-dialog"
      css={styles}
      aria-label={t("editor:ui.commandMenu", { defaultValue: "Command menu" })}
    >
      <Command
        label={t("editor:ui.commandMenuTitle", { defaultValue: "Command Menu" })}
        className="command-menu"
      >
        <CommandInput
          ref={input}
          placeholder={t("editor:ui.typeACommandOrSearch", { defaultValue: "Type a command or search…" })}
          aria-label={t("editor:ui.commandMenuSearch", { defaultValue: "Command menu search" })}
        />
        <Command.List>
          <Command.Empty>
            {t("ui2:attrs.noResultsFound", { defaultValue: "No results found." })}
          </Command.Empty>
          <SwitchTabCommands />
          <ContextCommandGroups />
          {children}
          <GlobalCommandGroups />
        </Command.List>
      </Command>
    </Dialog>
  );
};

export default CommandPalette;
