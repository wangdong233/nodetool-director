import React from "react";

import { i18n } from "../i18n";

/**
 * Defines the structure for a keyboard shortcut.
 */
export interface Shortcut {
  /** Human-readable title, e.g. "Copy" */
  title: string;
  /** i18n key under catalog:shortcuts.* — resolves `title` at render. */
  titleKey?: string;
  /** Stable identifier to reference this shortcut elsewhere */
  slug: string;
  /** Base key combo (Windows / Linux). Example: ["Control", "C"] */
  keyCombo: string[];
  /** Shortcut category */
  category: "editor" | "panel" | "assets" | "workflow" | "image-editor";
  /** macOS-specific combo; if omitted, keys are derived automatically */
  keyComboMac?: string[];
  /** Tooltip/body text */
  description?: string;
  /** i18n key under catalog:shortcuts.* — resolves `description` at render. */
  descriptionKey?: string;
  /** Whether this shortcut is only available in the Electron app */
  electronOnly?: boolean;
  /** Whether to skip keyboard combo registration in Electron (menu handles it via IPC) */
  skipInElectron?: boolean;
  /** Whether this shortcut should be registered inside useNodeEditorShortcuts  */
  registerCombo?: boolean;
  /** Additional alternative key combinations that trigger the same shortcut */
  altKeyCombos?: string[][];
}

/**
 * Maps common modifier keys to their macOS equivalents.
 * e.g. "Control" -> "Meta" (⌘), "Alt" -> "Option" (⌥)
 * @param key The key to map.
 * @returns The mapped key for macOS.
 */
const mapKeyForMac = (key: string): string => {
  switch (key) {
    case "Alt":
      return "Option";
    case "Control":
      return "Meta";
    default:
      return key;
  }
};

/**
 * Expands a list of shortcuts to include OS-specific key combinations.
 * For example, on macOS, "Control" is mapped to "Meta" (⌘).
 * @param shortcuts The array of shortcuts to expand.
 * @param mac Whether to use macOS-specific key combinations.
 * @returns A new array of shortcuts with OS-specific key combos.
 */
export const expandShortcutsForOS = (
  shortcuts: Shortcut[],
  mac: boolean
): Shortcut[] => {
  return shortcuts.map((s) => {
    const combo = mac
      ? s.keyComboMac ?? s.keyCombo.map(mapKeyForMac)
      : s.keyCombo;
    return {
      ...s,
      keyCombo: combo
    };
  });
};

function getShortcutTooltipFromShortcut(
  sc: Shortcut,
  os: "mac" | "win" | "both",
  mode: "full" | "combo",
  showDescription: boolean
): React.ReactElement | string {
  const winCombo = sc.keyCombo.join(" + ");
  const macCombo = (sc.keyComboMac ?? sc.keyCombo.map(mapKeyForMac)).join(
    " + "
  );

  const humanizeKey = (key: string): string => {
    switch (key.toLowerCase()) {
      case "control":
        return "CTRL";
      case "meta":
        return "⌘";
      case "alt":
        return "ALT";
      case "option":
        return "OPT";
      case "shift":
        return "SHIFT";
      case " ":
      case "space":
        return "SPACE";
      case "arrowup":
        return "↑";
      case "arrowdown":
        return "↓";
      case "arrowleft":
        return "←";
      case "arrowright":
        return "→";
      case "escape":
      case "esc":
        return "ESC";
      case "mouseright":
        return "Right-Click";
      case "click":
        return "Click";
      default:
        return key.length === 1 ? key.toUpperCase() : key;
    }
  };

  const renderSeries = (comboStr: string, prefix = ""): React.ReactNode[] => {
    const parts = comboStr.split(" + ");
    return parts.flatMap((part, idx) => {
      const nodes: React.ReactNode[] = [
        React.createElement("kbd", { key: `${prefix}k-${idx}` }, humanizeKey(part))
      ];
      if (idx < parts.length - 1) {nodes.push("+");}
      return nodes;
    });
  };

  const showBoth = os === "both";

  const keyChildren: React.ReactNode[] = showBoth
    ? winCombo === macCombo
      ? renderSeries(winCombo)
      : [...renderSeries(winCombo, "win-"), " / ", ...renderSeries(macCombo, "mac-")]
    : renderSeries(os === "mac" ? macCombo : winCombo);

  if (mode === "combo") {
    return React.createElement(
      "span",
      { className: "shortcut-combo" },
      ...keyChildren
    );
  }

  const children: React.ReactNode[] = [
    React.createElement(
      "div",
      { key: "t", className: "tooltip-title" },
      i18n.t(`catalog:shortcuts.${sc.titleKey ?? ""}`, {
        defaultValue: sc.title
      })
    ),
    React.createElement(
      "div",
      { key: "k", className: "tooltip-key" },
      ...keyChildren
    )
  ];
  if (showDescription && sc.description) {
    children.push(
      React.createElement(
        "div",
        {
          key: "d",
          className: "tooltip-description"
        },
        i18n.t(`catalog:shortcuts.${sc.descriptionKey ?? ""}`, {
          defaultValue: sc.description
        })
      )
    );
  }

  return React.createElement("div", { className: "tooltip-span" }, ...children);
}

/**
 * Returns a JSX tooltip for a given shortcut slug.
 *
 * The tooltip contains the shortcut's title and key combinations for different operating systems.
 *
 * @param slug The slug of the shortcut to get the tooltip for.
 * @param os The operating system to display the shortcut for. Defaults to the current OS.
 * @param mode The display mode for the tooltip. 'full' shows title and combo, 'combo' shows only the key combo.
 * @param showDescription Whether to show the shortcut's description in the tooltip.
 * @param catalog Shortcut list to resolve `slug` against (defaults to node editor shortcuts).
 * @returns A React element for the tooltip, or the original slug if the shortcut is not found.
 * Example structure:
 * <div class="tooltip-span">
 *   <div class="tooltip-title">Run Workflow</div>
 *   <div class="tooltip-key"><kbd>CTRL</kbd>+<kbd>Enter</kbd> / <kbd>⌘</kbd>+<kbd>Enter</kbd></div>
 * </div>
 */
export const getShortcutTooltip = (
  slug: string,
  os: "mac" | "win" | "both" = typeof navigator !== "undefined" &&
  navigator.userAgent.includes("Mac")
    ? "mac"
    : "win",
  mode: "full" | "combo" = "full",
  showDescription = false,
  catalog?: readonly Shortcut[]
): React.ReactElement | string => {
  const resolvedCatalog = catalog ?? NODE_EDITOR_SHORTCUTS;
  const sc = resolvedCatalog.find((s) => s.slug === slug);
  if (!sc) {
    return slug;
  }

  return getShortcutTooltipFromShortcut(sc, os, mode, showDescription);
};

/**
 * The master list of all keyboard shortcuts available in the node editor and surrounding UI.
 */
export const NODE_EDITOR_SHORTCUTS: Shortcut[] = [
  // exit fullscreen with ESC key
  {
    title: "Exit Fullscreen",
    titleKey: "exitFullscreen",
    slug: "exitFullscreen",
    keyCombo: ["Escape"],
    category: "editor",
    description: "Exit fullscreen mode",
    descriptionKey: "exitFullscreenMode",
    registerCombo: false
  },
  // ---------- NODES -------------------------------------------------------
  {
    title: "Copy",
    slug: "copy",
    keyCombo: ["Control", "C"],
    category: "editor",
    description: "Copy selected nodes",
    descriptionKey: "copySelectedNodes",
    registerCombo: true,
    skipInElectron: true
  },
  {
    title: "Cut",
    slug: "cut",
    keyCombo: ["Control", "X"],
    category: "editor",
    description: "Cut selected nodes",
    descriptionKey: "cutSelectedNodes",
    registerCombo: true,
    skipInElectron: true
  },
  {
    title: "Paste",
    slug: "paste",
    keyCombo: ["Control", "V"],
    category: "editor",
    description: "Paste nodes from clipboard",
    descriptionKey: "pasteNodesFromClipboard",
    registerCombo: true,
    skipInElectron: true
  },
  {
    title: "Undo",
    slug: "undo",
    keyCombo: ["Control", "Z"],
    category: "editor",
    description: "Undo last action",
    descriptionKey: "undoLastAction",
    registerCombo: true
  },
  {
    title: "Redo",
    slug: "redo",
    keyCombo: ["Control", "Shift", "Z"],
    category: "editor",
    description: "Redo last undone action",
    descriptionKey: "redoLastUndoneAction",
    registerCombo: true
  },
  {
    title: "Select All",
    titleKey: "selectAll",
    slug: "selectAll",
    keyCombo: ["Control", "A"],
    category: "editor",
    description: "Select all nodes",
    descriptionKey: "selectAllNodes",
    registerCombo: true
  },
  {
    title: "Align",
    slug: "align",
    keyCombo: ["A"],
    category: "editor",
    description: "Align selected nodes",
    descriptionKey: "alignSelectedNodes",
    registerCombo: true
  },
  {
    title: "Align with Spacing",
    titleKey: "alignWithSpacing",
    slug: "alignWithSpacing",
    keyCombo: ["Shift", "A"],
    category: "editor",
    description: "Align selected nodes and distribute spacing",
    descriptionKey: "alignSelectedNodesAndDistributeSpacing",
    registerCombo: true
  },
  {
    title: "Duplicate",
    slug: "duplicate",
    keyCombo: ["Control", "D"],
    category: "editor",
    description: "Duplicate selected nodes",
    descriptionKey: "duplicateSelectedNodes",
    registerCombo: true
  },
  {
    title: "Duplicate Vertical",
    slug: "duplicateVertical",
    keyCombo: ["Control", "Shift", "D"],
    category: "editor",
    description: "Duplicate selected nodes vertically",
    descriptionKey: "duplicateSelectedNodesVertically",
    registerCombo: true
  },
  {
    title: "Fit View",
    titleKey: "fitView",
    slug: "fitView",
    keyCombo: ["F"],
    category: "editor",
    description: "Fit all / selected nodes into view",
    descriptionKey: "fitAllSelectedNodesIntoView",
    registerCombo: true
  },
  {
    title: "Delete Node",
    slug: "deleteNode",
    keyCombo: ["Delete"],
    category: "editor",
    description: "Delete selected nodes (Backspace or Delete)",
    descriptionKey: "deleteSelectedNodesBackspaceOrDelete",
    registerCombo: false
  },
  {
    title: "Delete Node",
    slug: "deleteNodeBackspace",
    keyCombo: ["Backspace"],
    category: "editor",
    description: "Delete selected nodes (Backspace or Delete)",
    descriptionKey: "deleteSelectedNodesBackspaceOrDelete",
    registerCombo: false
  },
  {
    title: "Reset to Default",
    titleKey: "resetToDefault",
    slug: "resetDefault",
    keyCombo: ["Control", "MouseRight"],
    category: "editor",
    description: "Reset property to default value",
    descriptionKey: "resetPropertyToDefaultValue",
    registerCombo: false
  },
  {
    title: "Group Selected",
    slug: "groupSelected",
    keyCombo: ["Control", "G"],
    category: "editor",
    description: "Group selected nodes",
    descriptionKey: "groupSelectedNodes",
    registerCombo: true
  },
  {
    title: "Move Left",
    titleKey: "moveLeft",
    slug: "moveLeft",
    keyCombo: ["ArrowLeft"],
    category: "editor",
    description: "Nudge selected nodes left",
    descriptionKey: "nudgeSelectedNodesLeft",
    registerCombo: true
  },
  {
    title: "Move Right",
    titleKey: "moveRight",
    slug: "moveRight",
    keyCombo: ["ArrowRight"],
    category: "editor",
    description: "Nudge selected nodes right",
    descriptionKey: "nudgeSelectedNodesRight",
    registerCombo: true
  },
  {
    title: "Move Up",
    titleKey: "moveUp",
    slug: "moveUp",
    keyCombo: ["ArrowUp"],
    category: "editor",
    description: "Nudge selected nodes up",
    descriptionKey: "nudgeSelectedNodesUp",
    registerCombo: true
  },
  {
    title: "Move Down",
    titleKey: "moveDown",
    slug: "moveDown",
    keyCombo: ["ArrowDown"],
    category: "editor",
    description: "Nudge selected nodes down",
    descriptionKey: "nudgeSelectedNodesDown",
    registerCombo: true
  },
  {
    title: "Disable Node",
    slug: "bypassNode",
    keyCombo: ["B"],
    category: "editor",
    description: "Toggle whether selected nodes are excluded from runs",
    descriptionKey: "toggleWhetherSelectedNodesAreExcludedFromRuns",
    registerCombo: true
  },
  {
    title: "Collapse / Expand Node",
    titleKey: "collapseExpandNode",
    slug: "toggleNodeCollapsed",
    keyCombo: ["C"],
    category: "editor",
    description:
      "Toggle collapsed (header-only) view on selected nodes. Double-click the header icon or title when no icon is shown.",
    registerCombo: true
  },
  {
    title: "Select Connected (All)",
    titleKey: "selectConnectedAll",
    slug: "selectConnectedAll",
    keyCombo: ["Shift", "C"],
    category: "editor",
    description: "Select all nodes connected to selected nodes (inputs and outputs)",
    descriptionKey: "selectAllNodesConnectedToSelectedNodesInputsAndOutputs",
    registerCombo: true
  },
  {
    title: "Select Connected (Inputs)",
    titleKey: "selectConnectedInputs",
    slug: "selectConnectedInputs",
    keyCombo: ["Shift", "I"],
    category: "editor",
    description: "Select all nodes that connect into selected nodes",
    descriptionKey: "selectAllNodesThatConnectIntoSelectedNodes",
    registerCombo: true
  },
  {
    title: "Select Connected (Outputs)",
    titleKey: "selectConnectedOutputs",
    keyCombo: ["Shift", "O"],
    category: "editor",
    description: "Select all nodes that receive output from selected nodes",
    descriptionKey: "selectAllNodesThatReceiveOutputFromSelectedNodes",
    registerCombo: true,
    slug: "selectConnectedOutputs"
  },
  // ---------- ALIGNMENT & DISTRIBUTION ---------------------------------------
  {
    title: "Align Left",
    slug: "alignLeft",
    keyCombo: ["Shift", "ArrowLeft"],
    category: "editor",
    description: "Align selected nodes to the left edge",
    descriptionKey: "alignSelectedNodesToTheLeftEdge",
    registerCombo: true
  },
  {
    title: "Align Center",
    slug: "alignCenter",
    keyCombo: ["Shift", "H"],
    category: "editor",
    description: "Align selected nodes to their center",
    descriptionKey: "alignSelectedNodesToTheirCenter",
    registerCombo: true
  },
  {
    title: "Align Right",
    slug: "alignRight",
    keyCombo: ["Shift", "ArrowRight"],
    category: "editor",
    description: "Align selected nodes to the right edge",
    descriptionKey: "alignSelectedNodesToTheRightEdge",
    registerCombo: true
  },
  {
    title: "Align Top",
    slug: "alignTop",
    keyCombo: ["Shift", "ArrowUp"],
    category: "editor",
    description: "Align selected nodes to the top edge",
    descriptionKey: "alignSelectedNodesToTheTopEdge",
    registerCombo: true
  },
  {
    title: "Align Middle",
    slug: "alignMiddle",
    keyCombo: ["Shift", "V"],
    category: "editor",
    description: "Align selected nodes to their vertical center",
    descriptionKey: "alignSelectedNodesToTheirVerticalCenter",
    registerCombo: true
  },
  {
    title: "Align Bottom",
    slug: "alignBottom",
    keyCombo: ["Shift", "ArrowDown"],
    category: "editor",
    description: "Align selected nodes to the bottom edge",
    descriptionKey: "alignSelectedNodesToTheBottomEdge",
    registerCombo: true
  },
  {
    title: "Distribute Horizontally",
    slug: "distributeHorizontal",
    keyCombo: ["Shift", "D"],
    category: "editor",
    description: "Distribute selected nodes evenly horizontally",
    descriptionKey: "distributeSelectedNodesEvenlyHorizontally",
    registerCombo: true
  },
  {
    title: "Delete Selected",
    titleKey: "deleteSelected",
    slug: "deleteSelected",
    keyCombo: ["Delete"],
    keyComboMac: ["Backspace"],
    category: "editor",
    description: "Delete all selected nodes",
    descriptionKey: "deleteAllSelectedNodes",
    registerCombo: true,
    altKeyCombos: [["Backspace"]]
  },
  {
    title: "Node Info",
    titleKey: "nodeInfo",
    slug: "nodeInfo",
    keyCombo: ["Control", "I"],
    category: "editor",
    description: "Show/hide node information panel",
    descriptionKey: "showhideNodeInformationPanel",
    registerCombo: true
  },

  // ---------- PANEL -------------------------------------------------------
  {
    title: "Open Node Menu",
    titleKey: "openNodeMenu",
    slug: "openNodeMenu",
    keyCombo: [" "],
    category: "panel",
    description: "Open Node Menu - also double-click canvas",
    descriptionKey: "openNodeMenuAlsoDoubleclickCanvas",
    registerCombo: true
  },
  {
    title: "Workflows",
    slug: "toggleWorkflows",
    keyCombo: ["1"],
    category: "panel",
    description: "Toggle Workflows panel (left sidebar)",
    descriptionKey: "toggleWorkflowsPanelLeftSidebar",
    registerCombo: false
  },
  {
    title: "Assets",
    slug: "toggleAssets",
    keyCombo: ["2"],
    category: "panel",
    description: "Toggle Assets panel (left sidebar)",
    descriptionKey: "toggleAssetsPanelLeftSidebar",
    registerCombo: false
  },
  {
    title: "Inspector",
    slug: "toggleInspector",
    keyCombo: ["I"],
    category: "panel",
    description: "Show or hide Inspector panel",
    descriptionKey: "showOrHideInspectorPanel",
    registerCombo: true
  },
  {
    title: "Workflow Settings",
    slug: "toggleWorkflowSettings",
    keyCombo: ["W"],
    category: "panel",
    description: "Show or hide Workflow Settings panel",
    descriptionKey: "showOrHideWorkflowSettingsPanel",
    registerCombo: true
  },
  {
    title: "Operator",
    titleKey: "operator",
    slug: "toggleOperator",
    keyCombo: ["O"],
    category: "panel",
    description: "Show or hide Operator panel",
    descriptionKey: "showOrHideOperatorPanel",
    registerCombo: false
  },

  // ---------- CHAT --------------------------------------------------------
  // Grouped under "panel" because the shortcuts view's category filter only
  // offers Editor / Workflow / Panels / Assets.
  {
    title: "New Chat",
    titleKey: "newChat",
    slug: "newChat",
    keyCombo: ["Control", "Shift", "O"],
    keyComboMac: ["Meta", "Shift", "O"],
    category: "panel",
    description: "Start a new conversation in the focused chat",
    descriptionKey: "startANewConversationInTheFocusedChat",
    registerCombo: false
  },
  {
    title: "Focus Chat Composer",
    titleKey: "focusChatComposer",
    slug: "focusChatComposer",
    keyCombo: ["Control", "Shift", "L"],
    keyComboMac: ["Meta", "Shift", "L"],
    category: "panel",
    description: "Put the cursor in the focused chat's message box",
    descriptionKey: "putTheCursorInTheFocusedChatsMessageBox",
    registerCombo: false
  },
  {
    title: "Stop Generation",
    titleKey: "stopGeneration",
    slug: "stopChatGeneration",
    keyCombo: ["Escape"],
    category: "panel",
    description: "While a reply is in flight and the composer has focus",
    descriptionKey: "whileAReplyIsInFlightAndTheComposerHasFocus",
    registerCombo: false
  },

  // ---------- WORKFLOW ----------------------------------------------------
  {
    title: "Run Workflow",
    titleKey: "runWorkflow",
    slug: "runWorkflow",
    keyCombo: ["Control", "Enter"],
    category: "workflow" as const,
    description: "Execute the current workflow",
    descriptionKey: "executeTheCurrentWorkflow",
    registerCombo: false
  },
  {
    title: "Stop Workflow",
    titleKey: "stopWorkflow",
    slug: "stopWorkflow",
    keyCombo: ["Escape"],
    category: "workflow" as const,
    description: "Stop running workflow",
    descriptionKey: "stopRunningWorkflow",
    registerCombo: false
  },
  {
    title: "Save Workflow",
    titleKey: "saveWorkflow",
    slug: "saveWorkflow",
    keyCombo: ["Control", "S"],
    category: "workflow" as const,
    description: "Save current workflow",
    descriptionKey: "saveCurrentWorkflow",
    registerCombo: true
  },
  {
    title: "New Workflow",
    titleKey: "newWorkflow",
    slug: "newWorkflow",
    keyCombo: ["Control", "T"],
    category: "workflow" as const,
    description: "Create a new workflow tab",
    descriptionKey: "createANewWorkflowTab",
    registerCombo: true,
    electronOnly: true
  },
  {
    title: "Close Workflow",
    titleKey: "closeWorkflow",
    slug: "closeWorkflow",
    keyCombo: ["Control", "W"],
    category: "workflow" as const,
    description: "Close current workflow tab",
    descriptionKey: "closeCurrentWorkflowTab",
    registerCombo: true,
    electronOnly: true
  },
  {
    title: "Previous Tab",
    titleKey: "previousTab",
    slug: "prevTab",
    keyCombo: ["Control", "PageUp"],
    altKeyCombos: [
      ["Control", "Shift", "["],
      ["Control", "Alt", "ArrowLeft"]
    ],
    category: "workflow" as const,
    description: "Activate previous workflow tab",
    descriptionKey: "activatePreviousWorkflowTab",
    registerCombo: true
  },
  {
    title: "Next Tab",
    titleKey: "nextTab",
    slug: "nextTab",
    keyCombo: ["Control", "PageDown"],
    altKeyCombos: [
      ["Control", "Shift", "]"],
      ["Control", "Alt", "ArrowRight"]
    ],
    category: "workflow" as const,
    description: "Activate next workflow tab",
    descriptionKey: "activateNextWorkflowTab",
    registerCombo: true
  },
  // Direct tab switching (Ctrl/Cmd 1-9)
  ...([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map<Shortcut>((n) => ({
    title: `Switch to Tab ${n}`,
    slug: `switchToTab${n}`,
    keyCombo: ["Control", `${n}`],
    category: "workflow" as const,
    description: `Activate workflow tab ${n}`,
    registerCombo: true
  })),

  // ---------- ASSETS --------------------------------------------------------
  {
    title: "Rename Asset",
    titleKey: "renameAsset",
    slug: "renameAsset",
    keyCombo: ["F2"],
    category: "assets" as const,
    description: "Rename selected assets",
    registerCombo: false
  },
  {
    title: "Select Range",
    titleKey: "selectRange",
    slug: "assetSelectRange",
    keyCombo: ["Shift", "Click"],
    category: "assets" as const,
    description: "Extend selection from the last selected asset",
    descriptionKey: "extendSelectionFromTheLastSelectedAsset",
    registerCombo: false
  },
  {
    title: "Toggle Selection",
    titleKey: "toggleSelection",
    slug: "assetToggleSelect",
    keyCombo: ["Control", "Click"],
    category: "assets" as const,
    description: "Add or remove an asset from the selection",
    descriptionKey: "addOrRemoveAnAssetFromTheSelection",
    registerCombo: false
  },
  {
    title: "Previous Asset",
    titleKey: "previousAsset",
    slug: "assetViewerPrev",
    keyCombo: ["ArrowLeft"],
    category: "assets" as const,
    description: "Show the previous asset in the asset viewer",
    descriptionKey: "showThePreviousAssetInTheAssetViewer",
    registerCombo: false
  },
  {
    title: "Next Asset",
    titleKey: "nextAsset",
    slug: "assetViewerNext",
    keyCombo: ["ArrowRight"],
    category: "assets" as const,
    description: "Show the next asset in the asset viewer",
    descriptionKey: "showTheNextAssetInTheAssetViewer",
    registerCombo: false
  },
  {
    title: "Jump Back 5 Assets",
    titleKey: "jumpBack5Assets",
    slug: "assetViewerPrevJump",
    keyCombo: ["Control", "ArrowLeft"],
    keyComboMac: ["Control", "ArrowLeft"],
    category: "assets" as const,
    description: "Jump back five assets in the asset viewer",
    descriptionKey: "jumpBackFiveAssetsInTheAssetViewer",
    registerCombo: false
  },
  {
    title: "Jump Forward 5 Assets",
    titleKey: "jumpForward5Assets",
    slug: "assetViewerNextJump",
    keyCombo: ["Control", "ArrowRight"],
    keyComboMac: ["Control", "ArrowRight"],
    category: "assets" as const,
    description: "Jump forward five assets in the asset viewer",
    descriptionKey: "jumpForwardFiveAssetsInTheAssetViewer",
    registerCombo: false
  },
  {
    title: "Clear Asset Search",
    titleKey: "clearAssetSearch",
    slug: "clearAssetSearch",
    keyCombo: ["Control", "Backspace"],
    altKeyCombos: [["Control", "Delete"]],
    category: "assets" as const,
    description: "Clear the asset search field",
    descriptionKey: "clearTheAssetSearchField",
    registerCombo: false
  },

  // ---------- HELP ----------------------------------------------------------
  {
    title: "Show Keyboard Shortcuts",
    titleKey: "showKeyboardShortcuts",
    slug: "showKeyboardShortcuts",
    keyCombo: ["Control", "/"],
    keyComboMac: ["Meta", "/"],
    category: "editor",
    description: "Open keyboard shortcuts panel",
    descriptionKey: "openKeyboardShortcutsPanel",
    registerCombo: true
  },

  // ---------- SETTINGS ------------------------------------------------------
  {
    title: "Open Settings",
    slug: "openSettings",
    keyCombo: ["Control", ","],
    keyComboMac: ["Meta", ","],
    category: "editor",
    description: "Open settings in a workspace tab",
    descriptionKey: "openSettingsInAWorkspaceTab",
    registerCombo: true
  },

  // ---------- FIND IN WORKFLOW ---------------------------------------------
  {
    title: "Find in Workflow",
    titleKey: "findInWorkflow",
    slug: "findInWorkflow",
    keyCombo: ["Control", "F"],
    category: "editor" as const,
    description: "Find and navigate to nodes in the current workflow",
    descriptionKey: "findAndNavigateToNodesInTheCurrentWorkflow",
    registerCombo: true
  },
  {
    title: "Quick Add Node",
    slug: "quickAddNode",
    keyCombo: ["Control", "Shift", "A"],
    category: "editor" as const,
    description: "Quickly search and add a new node to the workflow",
    descriptionKey: "quicklySearchAndAddANewNodeToTheWorkflow",
    registerCombo: true
  },
  {
    title: "Reset Zoom",
    titleKey: "resetZoom",
    slug: "resetZoom",
    keyCombo: ["Control", "0"],
    category: "editor" as const,
    description: "Reset zoom to 50%",
    descriptionKey: "resetZoomTo50",
    registerCombo: true
  },
  {
    title: "Zoom In",
    titleKey: "zoomIn",
    slug: "zoomIn",
    keyCombo: ["Control", "="],
    category: "editor" as const,
    description: "Increase zoom level by 20%",
    descriptionKey: "increaseZoomLevelBy20",
    registerCombo: true
  },
  {
    title: "Zoom Out",
    titleKey: "zoomOut",
    slug: "zoomOut",
    keyCombo: ["Control", "-"],
    category: "editor" as const,
    description: "Decrease zoom level by 20%",
    descriptionKey: "decreaseZoomLevelBy20",
    registerCombo: true
  },
  {
    title: "Zoom to 50%",
    titleKey: "zoomTo50",
    slug: "zoom50",
    keyCombo: ["Control", "Alt", "5"],
    category: "editor" as const,
    description: "Set zoom to 50%",
    descriptionKey: "setZoomTo50",
    registerCombo: true
  },
  {
    title: "Zoom to 100%",
    titleKey: "zoomTo100",
    slug: "zoom100",
    keyCombo: ["Control", "Alt", "1"],
    category: "editor" as const,
    description: "Set zoom to 100%",
    descriptionKey: "setZoomTo100",
    registerCombo: true
  },
  {
    title: "Zoom to 200%",
    titleKey: "zoomTo200",
    slug: "zoom200",
    keyCombo: ["Control", "Alt", "2"],
    category: "editor" as const,
    description: "Set zoom to 200%",
    descriptionKey: "setZoomTo200",
    registerCombo: true
  },

  // ---------- NODE NAVIGATION ---------------------------------------------
  {
    title: "Navigate Next Node",
    titleKey: "navigateNextNode",
    slug: "navigateNextNode",
    keyCombo: ["Control", "Alt", "N"],
    category: "editor" as const,
    description: "Navigate focus to next node in the canvas",
    descriptionKey: "navigateFocusToNextNodeInTheCanvas",
    registerCombo: true
  },
  {
    title: "Navigate Previous Node",
    titleKey: "navigatePreviousNode",
    slug: "navigatePrevNode",
    keyCombo: ["Control", "Alt", "P"],
    category: "editor" as const,
    description: "Navigate focus to previous node in the canvas",
    descriptionKey: "navigateFocusToPreviousNodeInTheCanvas",
    registerCombo: true
  },
  {
    title: "Select Focused Node",
    titleKey: "selectFocusedNode",
    slug: "selectFocusedNode",
    keyCombo: ["Enter"],
    category: "editor" as const,
    description: "Select the currently focused node",
    descriptionKey: "selectTheCurrentlyFocusedNode",
    registerCombo: true
  },
  {
    title: "Exit Navigation Mode",
    titleKey: "exitNavigationMode",
    slug: "exitNavigationMode",
    keyCombo: ["Escape"],
    category: "editor" as const,
    description: "Exit keyboard navigation mode",
    descriptionKey: "exitKeyboardNavigationMode",
    registerCombo: true
  },
  {
    title: "Focus Node Above",
    titleKey: "focusNodeAbove",
    slug: "focusNodeUp",
    keyCombo: ["Alt", "ArrowUp"],
    category: "editor" as const,
    description: "Move focus to the nearest node above current",
    descriptionKey: "moveFocusToTheNearestNodeAboveCurrent",
    registerCombo: true
  },
  {
    title: "Focus Node Below",
    titleKey: "focusNodeBelow",
    slug: "focusNodeDown",
    keyCombo: ["Alt", "ArrowDown"],
    category: "editor" as const,
    description: "Move focus to the nearest node below current",
    descriptionKey: "moveFocusToTheNearestNodeBelowCurrent",
    registerCombo: true
  },
  {
    title: "Focus Node Left",
    titleKey: "focusNodeLeft",
    slug: "focusNodeLeft",
    keyCombo: ["Alt", "ArrowLeft"],
    category: "editor" as const,
    description: "Move focus to the nearest node to the left",
    descriptionKey: "moveFocusToTheNearestNodeToTheLeft",
    registerCombo: true
  },
  {
    title: "Focus Node Right",
    titleKey: "focusNodeRight",
    slug: "focusNodeRight",
    keyCombo: ["Alt", "ArrowRight"],
    category: "editor" as const,
    description: "Move focus to the nearest node to the right",
    descriptionKey: "moveFocusToTheNearestNodeToTheRight",
    registerCombo: true
  },
  {
    title: "Go Back",
    titleKey: "goBack",
    slug: "goBack",
    keyCombo: ["Control", "Alt", "B"],
    category: "editor" as const,
    description: "Go back to previously focused node",
    descriptionKey: "goBackToPreviouslyFocusedNode",
    registerCombo: true
  }
];

/**
 * A mapping of shortcut categories to their human-readable display names.
 * Used for grouping shortcuts in the UI.
 */
export const SHORTCUT_CATEGORIES = {
  workflow: "Workflows",
  panel: "Panels",
  editor: "Node Editor",
  assets: "Assets",
  "image-editor": "Image Editor"
} satisfies Record<Shortcut["category"], string>;
