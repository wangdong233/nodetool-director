/** @jsxImportSource @emotion/react */
import React, { useCallback, memo } from "react";
import { shallow } from "zustand/shallow";
import { ContextMenu } from "../ui_primitives";
import ContextMenuItem from "./ContextMenuItem";
import { REROUTE_NODE_TYPE } from "../../constants/nodeTypes";
import useContextMenuStore from "../../stores/ContextMenuStore";
import { useNodes } from "../../contexts/NodeContext";
import { useReactFlow } from "@xyflow/react";
import useMetadataStore from "../../stores/MetadataStore";
import DeleteIcon from "@mui/icons-material/Delete";
import RouteIcon from "@mui/icons-material/Route";
import { i18n } from "../../i18n";

interface EdgeContextMenuProps {
  edgeId?: string;
}

const EdgeContextMenuComponent: React.FC<EdgeContextMenuProps> = () => {
  const menuPosition = useContextMenuStore((state) => state.menuPosition);
  const closeContextMenu = useContextMenuStore(
    (state) => state.closeContextMenu
  );
  const edgeId = useContextMenuStore((state) => state.nodeId); // Reusing nodeId field for edgeId

  const { deleteEdge, findEdge, createNode, addNode, addEdge } = useNodes(
    (state) => ({
      deleteEdge: state.deleteEdge,
      findEdge: state.findEdge,
      createNode: state.createNode,
      addNode: state.addNode,
      addEdge: state.addEdge
    }),
    shallow
  );

  const getMetadata = useMetadataStore((state) => state.getMetadata);
  const reactFlowInstance = useReactFlow();

  const handleDeleteEdge = useCallback(() => {
    if (edgeId) {
      deleteEdge(edgeId);
    }
    closeContextMenu();
  }, [edgeId, deleteEdge, closeContextMenu]);

  const handleInsertReroute = useCallback(() => {
    if (!edgeId || !menuPosition) {
      closeContextMenu();
      return;
    }

    const edge = findEdge(edgeId);
    if (!edge) {
      closeContextMenu();
      return;
    }

    const flowPosition = reactFlowInstance.screenToFlowPosition({
      x: menuPosition.x,
      y: menuPosition.y
    });

    const rerouteMetadata = getMetadata(REROUTE_NODE_TYPE);
    if (!rerouteMetadata) {
      console.error("Reroute node metadata not found");
      closeContextMenu();
      return;
    }

    const rerouteNode = createNode(rerouteMetadata, flowPosition);
    addNode(rerouteNode);
    deleteEdge(edgeId);

    // Create new edges: source -> reroute -> target
    const sourceToReroute = {
      id: `${edge.source}-${rerouteNode.id}`,
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: rerouteNode.id,
      targetHandle: "input_value"
    };

    const rerouteToTarget = {
      id: `${rerouteNode.id}-${edge.target}`,
      source: rerouteNode.id,
      sourceHandle: "output",
      target: edge.target,
      targetHandle: edge.targetHandle
    };

    addEdge(sourceToReroute);
    addEdge(rerouteToTarget);

    closeContextMenu();
  }, [
    edgeId,
    menuPosition,
    findEdge,
    createNode,
    addNode,
    addEdge,
    deleteEdge,
    getMetadata,
    reactFlowInstance,
    closeContextMenu
  ]);

  if (!menuPosition) {return null;}

  return (
    <ContextMenu
      open={true}
      onClose={closeContextMenu}
      position={menuPosition}
      maxHeight="400px"
      minWidth="200px"
    >
      <ContextMenuItem
        onClick={handleInsertReroute}
        IconComponent={<RouteIcon />}
        label={i18n.t("editor:edge.insertReroute", { defaultValue: "Insert Reroute" })}
        tooltip={i18n.t("editor:edge.insertRerouteTip", { defaultValue: "Insert a reroute node at this position" })}
      />
      <ContextMenuItem
        onClick={handleDeleteEdge}
        IconComponent={<DeleteIcon />}
        label={i18n.t("editor:edge.deleteEdge", { defaultValue: "Delete Edge" })}
        tooltip={
          <span
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
          >
            <span>{i18n.t("editor:edge.deleteTip1", { defaultValue: "Delete this connection" })}</span>
            <span style={{ textAlign: "center" }}>
              {i18n.t("editor:edge.deleteTip2", { defaultValue: "Middle Mouse Button or select the edge and press Delete or Backspace. Select many edges by holding CTRL or Meta while clicking." })}
            </span>
          </span>
        }
      />
    </ContextMenu>
  );
};

export default memo(EdgeContextMenuComponent);
