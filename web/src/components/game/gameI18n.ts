import type { TFunction } from "i18next";

/**
 * Render-time resolution of the game shell's registry titles (panels, commands,
 * command categories) — the registries are module-level English data, so every
 * display site resolves through here with the registry value as the English
 * fallback. Full-literal keys only (the dead-key guard requires them; dynamic
 * `game:command.${id}` templates would escape it).
 */

/** Localized title of a docked game panel (panelRegistry id → game:panels.*). */
export function gamePanelTitle(t: TFunction, id: string, fallback: string): string {
  switch (id) {
    case "hierarchy": return t("game:panels.hierarchy", { defaultValue: fallback });
    case "revisions": return t("game:panels.revisions", { defaultValue: fallback });
    case "viewport": return t("game:panels.viewport", { defaultValue: fallback });
    case "scripts": return t("game:panels.scripts", { defaultValue: fallback });
    case "assets": return t("game:panels.assets", { defaultValue: fallback });
    case "console": return t("game:panels.console", { defaultValue: fallback });
    case "inspector": return t("game:panels.inspector", { defaultValue: fallback });
    case "assistant": return t("game:panels.assistant", { defaultValue: fallback });
    default: return fallback;
  }
}

/** Localized label of a dock region id (left/right/bottom/viewport). */
export function gameRegionLabel(t: TFunction, region: string, fallback: string): string {
  switch (region) {
    case "left": return t("game:regions.left", { defaultValue: fallback });
    case "right": return t("game:regions.right", { defaultValue: fallback });
    case "bottom": return t("game:regions.bottom", { defaultValue: fallback });
    case "viewport": return t("game:regions.viewport", { defaultValue: fallback });
    default: return fallback;
  }
}

/** Localized title of a game command (gameCommands id → game:command.*). */
export function gameCommandTitle(t: TFunction, id: string, fallback: string): string {
  switch (id) {
    case "editor.commandPalette": return t("game:command.editor.commandPalette", { defaultValue: fallback });
    case "editor.keyboardShortcuts": return t("game:command.editor.keyboardShortcuts", { defaultValue: fallback });
    case "editor.publish": return t("game:command.editor.publish", { defaultValue: fallback });
    case "edit.undo": return t("game:command.edit.undo", { defaultValue: fallback });
    case "edit.redo": return t("game:command.edit.redo", { defaultValue: fallback });
    case "edit.copy": return t("game:command.edit.copy", { defaultValue: fallback });
    case "edit.paste": return t("game:command.edit.paste", { defaultValue: fallback });
    case "edit.duplicate": return t("game:command.edit.duplicate", { defaultValue: fallback });
    case "edit.delete": return t("game:command.edit.delete", { defaultValue: fallback });
    case "edit.nudgeLeft": return t("game:command.edit.nudgeLeft", { defaultValue: fallback });
    case "edit.nudgeLeftFar": return t("game:command.edit.nudgeLeftFar", { defaultValue: fallback });
    case "edit.nudgeRight": return t("game:command.edit.nudgeRight", { defaultValue: fallback });
    case "edit.nudgeRightFar": return t("game:command.edit.nudgeRightFar", { defaultValue: fallback });
    case "edit.nudgeUp": return t("game:command.edit.nudgeUp", { defaultValue: fallback });
    case "edit.nudgeUpFar": return t("game:command.edit.nudgeUpFar", { defaultValue: fallback });
    case "edit.nudgeDown": return t("game:command.edit.nudgeDown", { defaultValue: fallback });
    case "edit.nudgeDownFar": return t("game:command.edit.nudgeDownFar", { defaultValue: fallback });
    case "view.frameSelection": return t("game:command.view.frameSelection", { defaultValue: fallback });
    case "view.resetCamera": return t("game:command.view.resetCamera", { defaultValue: fallback });
    case "view.toggleSnap": return t("game:command.view.toggleSnap", { defaultValue: fallback });
    case "tool.move": return t("game:command.tool.move", { defaultValue: fallback });
    case "tool.rotate": return t("game:command.tool.rotate", { defaultValue: fallback });
    case "tool.scale": return t("game:command.tool.scale", { defaultValue: fallback });
    case "play.toggle": return t("game:command.play.toggle", { defaultValue: fallback });
    case "play.step": return t("game:command.play.step", { defaultValue: fallback });
    case "play.stop": return t("game:command.play.stop", { defaultValue: fallback });
    case "panel.sceneTree": return t("game:command.panel.sceneTree", { defaultValue: fallback });
    case "panel.inspector": return t("game:command.panel.inspector", { defaultValue: fallback });
    case "panel.assistant": return t("game:command.panel.assistant", { defaultValue: fallback });
    case "assistant.playtest": return t("game:command.assistant.playtest", { defaultValue: fallback });
    case "assistant.explainSelection": return t("game:command.assistant.explainSelection", { defaultValue: fallback });
    case "assistant.fixScriptError": return t("game:command.assistant.fixScriptError", { defaultValue: fallback });
    default: return fallback;
  }
}

/** Localized label of a command category (gameCommands category → game:categories.*). */
export function gameCommandCategory(t: TFunction, category: string, fallback: string): string {
  switch (category) {
    case "Editor": return t("game:categories.Editor", { defaultValue: fallback });
    case "Edit": return t("game:categories.Edit", { defaultValue: fallback });
    case "View": return t("game:categories.View", { defaultValue: fallback });
    case "Tools": return t("game:categories.Tools", { defaultValue: fallback });
    case "Play": return t("game:categories.Play", { defaultValue: fallback });
    case "Panels": return t("game:categories.Panels", { defaultValue: fallback });
    case "Assistant": return t("game:categories.Assistant", { defaultValue: fallback });
    default: return fallback;
  }
}
