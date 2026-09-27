import React, { memo, useCallback } from "react";
import { Divider, ContextMenu, BORDER_RADIUS } from "../ui_primitives";
import ContextMenuItem from "./ContextMenuItem";
import { useNodeContextMenu } from "../../hooks/nodes/useNodeContextMenu";
import GroupRemoveIcon from "@mui/icons-material/GroupRemove";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import FilterListIcon from "@mui/icons-material/FilterList";
import DeleteIcon from "@mui/icons-material/Delete";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import BlockIcon from "@mui/icons-material/Block";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import DataArrayIcon from "@mui/icons-material/DataArray";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import QueueIcon from "@mui/icons-material/Queue";
import SouthIcon from "@mui/icons-material/South";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import { Node } from "@xyflow/react";
import { NodeData } from "../../stores/NodeData";
import { useRemoveFromGroup } from "../../hooks/nodes/useRemoveFromGroup";
import { useGroupIntoSubgraph } from "../../hooks/nodes/useGroupIntoSubgraph";
import { useNodes } from "../../contexts/NodeContext";
import { i18n } from "../../i18n";

const NodeContextMenu: React.FC = () => {
  const {
    menuPosition,
    closeContextMenu,
    node,
    handlers,
    conditions
  } = useNodeContextMenu();
  const removeFromGroup = useRemoveFromGroup();
  const handleRemoveFromGroup = useCallback(() => {
    removeFromGroup([node as Node<NodeData>]);
  }, [removeFromGroup, node]);

  const groupIntoSubgraph = useGroupIntoSubgraph();
  const getSelectedNodes = useNodes((s) => s.getSelectedNodes);
  const handleGroupIntoSubgraph = useCallback(() => {
    const selected = getSelectedNodes();
    const ids =
      selected.length > 0
        ? selected.map((n) => n.id)
        : node
        ? [node.id]
        : [];
    if (ids.length === 0) return;
    groupIntoSubgraph(ids);
    closeContextMenu();
  }, [groupIntoSubgraph, getSelectedNodes, node, closeContextMenu]);

  const menuItems = [
    conditions.isInGroup && (
      <ContextMenuItem
        key="remove-from-group"
        onClick={handleRemoveFromGroup}
        label={i18n.t("editor:node.removeFromGroup", { defaultValue: "Remove from Group" })}
        IconComponent={<GroupRemoveIcon />}
        tooltip={i18n.t("editor:node.removeFromGroupTip", { defaultValue: "Remove this node from the group" })}
      />
    ),
    <ContextMenuItem
      key="copy"
      onClick={handlers.handleCopy}
      label={i18n.t("common:action.copy", { defaultValue: "Copy" })}
      IconComponent={<ContentCopyIcon />}
      tooltip={
        <div className="tooltip-span">
          <div className="tooltip-title">Copy</div>
          <div className="tooltip-key">
            <kbd>CTRL</kbd>+<kbd>C</kbd> / <kbd>⌘</kbd>+<kbd>C</kbd>
          </div>
        </div>
      }
    />,
    <ContextMenuItem
      key="cut"
      onClick={handlers.handleCut}
      label={i18n.t("common:action.cut", { defaultValue: "Cut" })}
      IconComponent={<ContentCutIcon />}
      tooltip={
        <div className="tooltip-span">
          <div className="tooltip-title">Cut</div>
          <div className="tooltip-key">
            <kbd>CTRL</kbd>+<kbd>X</kbd> / <kbd>⌘</kbd>+<kbd>X</kbd>
          </div>
        </div>
      }
    />,
    <ContextMenuItem
      key="copy-nodedata"
      onClick={handlers.handleCopyMetadataToClipboard}
      label={i18n.t("editor:node.copyJson", { defaultValue: "Copy Node as JSON" })}
      IconComponent={<DataArrayIcon />}
      tooltip={i18n.t("editor:node.copyJsonTip", { defaultValue: "Copy this node's data as JSON to the clipboard" })}
    />,
    <ContextMenuItem
      key="duplicate"
      onClick={handlers.handleDuplicate}
      label={i18n.t("common:action.duplicate", { defaultValue: "Duplicate" })}
      IconComponent={<QueueIcon />}
      tooltip={
        <div className="tooltip-span">
          <div className="tooltip-title">Duplicate</div>
          <div className="tooltip-key">
            <kbd>CTRL</kbd>+<kbd>D</kbd> / <kbd>⌘</kbd>+<kbd>D</kbd>
          </div>
        </div>
      }
    />,
    <ContextMenuItem
      key="duplicate-vertical"
      onClick={handlers.handleDuplicateVertical}
      label={i18n.t("editor:node.duplicateVertical", { defaultValue: "Duplicate Vertical" })}
      IconComponent={<SouthIcon />}
      tooltip={
        <div className="tooltip-span">
          <div className="tooltip-title">Duplicate Vertical</div>
          <div className="tooltip-key">
            <kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>D</kbd> / <kbd>⌘</kbd>+<kbd>SHIFT</kbd>+<kbd>D</kbd>
          </div>
        </div>
      }
    />,
    <ContextMenuItem
      key="run-from-here"
      onClick={handlers.handleRunFromHere}
      label={conditions.isWorkflowRunning ? i18n.t("editor:node.running", { defaultValue: "Running..." }) : i18n.t("editor:node.runNode", { defaultValue: "Run Node" })}
      IconComponent={<PlayArrowIcon />}
      tooltip={i18n.t("editor:node.runNodeTip", { defaultValue: "Run this node as its own job, using previous results as inputs" })}
      addButtonClassName={conditions.isWorkflowRunning ? "disabled" : ""}
    />,
    <ContextMenuItem
      key="toggle-bypass"
      onClick={handlers.handleToggleBypass}
      label={conditions.isBypassed ? i18n.t("editor:node.enableNode", { defaultValue: "Enable Node" }) : i18n.t("editor:node.disableNode", { defaultValue: "Disable Node" })}
      IconComponent={conditions.isBypassed ? <PowerSettingsNewIcon /> : <BlockIcon />}
      tooltip={
        <div className="tooltip-span">
          <div className="tooltip-title">
            {conditions.isBypassed ? i18n.t("editor:node.enableNode", { defaultValue: "Enable Node" }) : i18n.t("editor:node.disableNode", { defaultValue: "Disable Node" })}
          </div>
          <div className="tooltip-key">
            <kbd>B</kbd>
          </div>
        </div>
      }
    />,
    <ContextMenuItem
      key="toggle-collapsed"
      onClick={handlers.handleToggleCollapsed}
      label={conditions.isCollapsed ? i18n.t("editor:node.expandNode", { defaultValue: "Expand Node" }) : i18n.t("editor:node.collapseNode", { defaultValue: "Collapse Node" })}
      IconComponent={
        conditions.isCollapsed ? <UnfoldMoreIcon /> : <UnfoldLessIcon />
      }
      tooltip={
        <div className="tooltip-span">
          <div className="tooltip-title">
            {conditions.isCollapsed ? i18n.t("editor:node.expandNode", { defaultValue: "Expand Node" }) : i18n.t("editor:node.collapseNode", { defaultValue: "Collapse Node" })}
          </div>
          <div className="tooltip-key">
            <kbd>C</kbd>
          </div>
        </div>
      }
    />,
    <ContextMenuItem
      key="toggle-comment"
      onClick={handlers.handleToggleComment}
      label={conditions.hasCommentTitle ? i18n.t("editor:node.removeComment", { defaultValue: "Remove Comment" }) : i18n.t("editor:node.addComment", { defaultValue: "Add Comment" })}
      IconComponent={<EditIcon />}
      tooltip={
        conditions.hasCommentTitle
          ? i18n.t("editor:node.removeCommentTip", { defaultValue: "Remove the comment from this node" })
          : i18n.t("editor:node.addCommentTip", { defaultValue: "Add a comment to this node" })
      }
    />,
    <ContextMenuItem
      key="group-into-subgraph"
      onClick={handleGroupIntoSubgraph}
      label={i18n.t("editor:node.groupIntoSubgraph", { defaultValue: "Group into Subgraph" })}
      IconComponent={<AccountTreeIcon />}
      tooltip={i18n.t("editor:node.groupIntoSubgraphTip", { defaultValue: "Move the selected nodes into a new subgraph node" })}
    />,
    conditions.canConvertToInput && (
      <ContextMenuItem
        key="convert-to-input"
        onClick={handlers.handleConvertToInput}
        label={i18n.t("editor:node.toInputNode", { defaultValue: "Convert to Input Node" })}
        IconComponent={<SwapHorizIcon />}
        tooltip={i18n.t("editor:node.toInputNodeTip", { defaultValue: "Convert this constant node to an input node" })}
      />
    ),
    conditions.canConvertToConstant && (
      <ContextMenuItem
        key="convert-to-constant"
        onClick={handlers.handleConvertToConstant}
        label={i18n.t("editor:node.toConstantNode", { defaultValue: "Convert to Constant Node" })}
        IconComponent={<SwapHorizIcon />}
        tooltip={i18n.t("editor:node.toConstantNodeTip", { defaultValue: "Convert this input node to a constant node" })}
      />
    ),
    <ContextMenuItem
      key="show-templates"
      onClick={handlers.handleFindTemplates}
      label={i18n.t("editor:node.showTemplates", { defaultValue: "Show Templates" })}
      IconComponent={<SearchIcon />}
      tooltip={i18n.t("editor:node.showTemplatesTip", { defaultValue: "Find Templates using this node" })}
    />,
    <ContextMenuItem
      key="select-all"
      onClick={handlers.handleSelectAllSameType}
      label={
        node?.type
          ? `Select all ${node.type.split(".").pop()} nodes`
          : i18n.t("editor:node.selectAllOfType", { defaultValue: "Select all nodes of this type" })
      }
      IconComponent={<FilterListIcon />}
      tooltip={i18n.t("editor:node.selectAllOfTypeTip", { defaultValue: "Select all nodes of the same type" })}
    />,
    <Divider key="divider-before-delete" />,
    <ContextMenuItem
      key="delete-node"
      onClick={handlers.handleDeleteNode}
      label={i18n.t("editor:node.deleteNode", { defaultValue: "Delete Node" })}
      IconComponent={<DeleteIcon />}
      tooltip={i18n.t("editor:node.deleteNodeTip", { defaultValue: "Delete this node" })}
    />
  ];

  return (
    <ContextMenu
      className="context-menu node-context-menu"
      open={menuPosition !== null}
      onClose={closeContextMenu}
      onContextMenu={(event) => event.preventDefault()}
      position={menuPosition}
      paperSx={{ borderRadius: BORDER_RADIUS.lg }}
    >
      {menuItems.filter(Boolean)}
    </ContextMenu>
  );
};

export default memo(NodeContextMenu);
