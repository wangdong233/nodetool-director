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
import { useTranslation } from "react-i18next";

const NodeContextMenu: React.FC = () => {
  const { t } = useTranslation();
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
        label={t("editor:node.removeFromGroup", { defaultValue: "Remove from Group" })}
        IconComponent={<GroupRemoveIcon />}
        tooltip={t("editor:node.removeFromGroupTip", { defaultValue: "Remove this node from the group" })}
      />
    ),
    <ContextMenuItem
      key="copy"
      onClick={handlers.handleCopy}
      label={t("common:action.copy", { defaultValue: "Copy" })}
      IconComponent={<ContentCopyIcon />}
      tooltip={
        <div className="tooltip-span">
          <div className="tooltip-title">{t("common:action.copy", { defaultValue: "Copy" })}</div>
          <div className="tooltip-key">
            <kbd>CTRL</kbd>+<kbd>C</kbd> / <kbd>⌘</kbd>+<kbd>C</kbd>
          </div>
        </div>
      }
    />,
    <ContextMenuItem
      key="cut"
      onClick={handlers.handleCut}
      label={t("common:action.cut", { defaultValue: "Cut" })}
      IconComponent={<ContentCutIcon />}
      tooltip={
        <div className="tooltip-span">
          <div className="tooltip-title">{t("common:action.cut", { defaultValue: "Cut" })}</div>
          <div className="tooltip-key">
            <kbd>CTRL</kbd>+<kbd>X</kbd> / <kbd>⌘</kbd>+<kbd>X</kbd>
          </div>
        </div>
      }
    />,
    <ContextMenuItem
      key="copy-nodedata"
      onClick={handlers.handleCopyMetadataToClipboard}
      label={t("editor:node.copyJson", { defaultValue: "Copy Node as JSON" })}
      IconComponent={<DataArrayIcon />}
      tooltip={t("editor:node.copyJsonTip", { defaultValue: "Copy this node's data as JSON to the clipboard" })}
    />,
    <ContextMenuItem
      key="duplicate"
      onClick={handlers.handleDuplicate}
      label={t("common:action.duplicate", { defaultValue: "Duplicate" })}
      IconComponent={<QueueIcon />}
      tooltip={
        <div className="tooltip-span">
          <div className="tooltip-title">{t("common:action.duplicate", { defaultValue: "Duplicate" })}</div>
          <div className="tooltip-key">
            <kbd>CTRL</kbd>+<kbd>D</kbd> / <kbd>⌘</kbd>+<kbd>D</kbd>
          </div>
        </div>
      }
    />,
    <ContextMenuItem
      key="duplicate-vertical"
      onClick={handlers.handleDuplicateVertical}
      label={t("editor:node.duplicateVertical", { defaultValue: "Duplicate Vertical" })}
      IconComponent={<SouthIcon />}
      tooltip={
        <div className="tooltip-span">
          <div className="tooltip-title">{t("editor:node.duplicateVertical", { defaultValue: "Duplicate Vertical" })}</div>
          <div className="tooltip-key">
            <kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>D</kbd> / <kbd>⌘</kbd>+<kbd>SHIFT</kbd>+<kbd>D</kbd>
          </div>
        </div>
      }
    />,
    <ContextMenuItem
      key="run-from-here"
      onClick={handlers.handleRunFromHere}
      label={conditions.isWorkflowRunning ? t("editor:node.running", { defaultValue: "Running…" }) : t("editor:node.runNode", { defaultValue: "Run Node" })}
      IconComponent={<PlayArrowIcon />}
      tooltip={t("editor:node.runNodeTip", { defaultValue: "Run this node as its own job, using previous results as inputs" })}
      addButtonClassName={conditions.isWorkflowRunning ? "disabled" : ""}
    />,
    <ContextMenuItem
      key="toggle-bypass"
      onClick={handlers.handleToggleBypass}
      label={conditions.isBypassed ? t("editor:node.enableNode", { defaultValue: "Enable Node" }) : t("editor:node.disableNode", { defaultValue: "Disable Node" })}
      IconComponent={conditions.isBypassed ? <PowerSettingsNewIcon /> : <BlockIcon />}
      tooltip={
        <div className="tooltip-span">
          <div className="tooltip-title">
            {conditions.isBypassed ? t("editor:node.enableNode", { defaultValue: "Enable Node" }) : t("editor:node.disableNode", { defaultValue: "Disable Node" })}
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
      label={conditions.isCollapsed ? t("editor:node.expandNode", { defaultValue: "Expand Node" }) : t("editor:node.collapseNode", { defaultValue: "Collapse Node" })}
      IconComponent={
        conditions.isCollapsed ? <UnfoldMoreIcon /> : <UnfoldLessIcon />
      }
      tooltip={
        <div className="tooltip-span">
          <div className="tooltip-title">
            {conditions.isCollapsed ? t("editor:node.expandNode", { defaultValue: "Expand Node" }) : t("editor:node.collapseNode", { defaultValue: "Collapse Node" })}
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
      label={conditions.hasCommentTitle ? t("editor:node.removeComment", { defaultValue: "Remove Comment" }) : t("editor:node.addComment", { defaultValue: "Add Comment" })}
      IconComponent={<EditIcon />}
      tooltip={
        conditions.hasCommentTitle
          ? t("editor:node.removeCommentTip", { defaultValue: "Remove the comment from this node" })
          : t("editor:node.addCommentTip", { defaultValue: "Add a comment to this node" })
      }
    />,
    <ContextMenuItem
      key="group-into-subgraph"
      onClick={handleGroupIntoSubgraph}
      label={t("editor:node.groupIntoSubgraph", { defaultValue: "Group into Subgraph" })}
      IconComponent={<AccountTreeIcon />}
      tooltip={t("editor:node.groupIntoSubgraphTip", { defaultValue: "Move the selected nodes into a new subgraph node" })}
    />,
    conditions.canConvertToInput && (
      <ContextMenuItem
        key="convert-to-input"
        onClick={handlers.handleConvertToInput}
        label={t("editor:node.toInputNode", { defaultValue: "Convert to Input Node" })}
        IconComponent={<SwapHorizIcon />}
        tooltip={t("editor:node.toInputNodeTip", { defaultValue: "Convert this constant node to an input node" })}
      />
    ),
    conditions.canConvertToConstant && (
      <ContextMenuItem
        key="convert-to-constant"
        onClick={handlers.handleConvertToConstant}
        label={t("editor:node.toConstantNode", { defaultValue: "Convert to Constant Node" })}
        IconComponent={<SwapHorizIcon />}
        tooltip={t("editor:node.toConstantNodeTip", { defaultValue: "Convert this input node to a constant node" })}
      />
    ),
    <ContextMenuItem
      key="show-templates"
      onClick={handlers.handleFindTemplates}
      label={t("editor:node.showTemplates", { defaultValue: "Show Templates" })}
      IconComponent={<SearchIcon />}
      tooltip={t("editor:node.showTemplatesTip", { defaultValue: "Find Templates using this node" })}
    />,
    <ContextMenuItem
      key="select-all"
      onClick={handlers.handleSelectAllSameType}
      label={
        node?.type
          ? t("editor:node.selectAllOfTypeTyped", { defaultValue: "Select all {{type}} nodes", type: node.type.split(".").pop() || "" })
          : t("editor:node.selectAllOfType", { defaultValue: "Select all nodes of this type" })
      }
      IconComponent={<FilterListIcon />}
      tooltip={t("editor:node.selectAllOfTypeTip", { defaultValue: "Select all nodes of the same type" })}
    />,
    <Divider key="divider-before-delete" />,
    <ContextMenuItem
      key="delete-node"
      onClick={handlers.handleDeleteNode}
      label={t("editor:node.deleteNode", { defaultValue: "Delete Node" })}
      IconComponent={<DeleteIcon />}
      tooltip={t("editor:node.deleteNodeTip", { defaultValue: "Delete this node" })}
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
