import AddIcon from "@mui/icons-material/Add";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import { memo, useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  useCreateStoryboard,
  useStoryboards
} from "../../hooks/storyboard/useStoryboards";
import { usePanelStore } from "../../stores/PanelStore";
import {
  tabId,
  useWorkspaceTabsStore,
  creationProjectId
} from "../../stores/WorkspaceTabsStore";
import type { SidebarDocumentItem } from "../../stores/SidebarDocumentActionsStore";
import { useSidebarDocumentMenu } from "../../hooks/useSidebarDocumentMenu";
import { trpc } from "../../trpc/client";
import { notifyMutationError } from "../../utils/notifyMutationError";
import { downgradeScriptsLinkedToBoard } from "../../lib/scriptStoryboardDowngrade";
import { i18n } from "../../i18n";
import {
  DocumentListPanel,
  ListPanelItem,
  ToolbarIconButton,
  Tooltip
} from "../ui_primitives";
import { useTranslation } from "react-i18next";

export const CreateStoryboardButton = memo(function CreateStoryboardButton() {
  const { t } = useTranslation();
  const createStoryboard = useCreateStoryboard();
  const openTab = useWorkspaceTabsStore((state) => state.openTab);
  const setVisibility = usePanelStore((state) => state.setVisibility);
  const navigate = useNavigate();
  const location = useLocation();

  const handleCreate = useCallback(async () => {
    try {
      const created = await createStoryboard.mutateAsync({
        name: i18n.t("storyboard:attrs.untitledStoryboard", { defaultValue: "Untitled storyboard" }),
        projectId: creationProjectId()
      });
      openTab({
        type: "storyboard",
        ref: created.id,
        mode: "edit",
        title: created.name || i18n.t("storyboard:attrs.untitledStoryboard", { defaultValue: "Untitled storyboard" }),
        projectId: created.projectId
      });
      if (!location.pathname.startsWith("/workspace")) {
        navigate("/workspace");
      }
      setVisibility(false);
    } catch (error) {
      notifyMutationError("create the storyboard", error);
    }
  }, [createStoryboard, location.pathname, navigate, openTab, setVisibility]);

  return (
    <Tooltip title={t("storyboard:attrs.newStoryboard", { defaultValue: "New storyboard" })} placement="right-start">
      <ToolbarIconButton
        ariaLabel={t("storyboard:attrs.newStoryboard", { defaultValue: "New storyboard" })}
        onClick={() => void handleCreate()}
        disabled={createStoryboard.isPending}
        icon={<AddIcon />}
      />
    </Tooltip>
  );
});

interface StoryboardListPanelProps {
  readonly projectId: string;
}

const StoryboardListPanel = ({ projectId }: StoryboardListPanelProps) => {
  const { t } = useTranslation();
  const { data, isLoading, isError, error } = useStoryboards(projectId);
  const openTab = useWorkspaceTabsStore((state) => state.openTab);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const setVisibility = usePanelStore((state) => state.setVisibility);
  const navigate = useNavigate();
  const location = useLocation();

  const activeStoryboardId = activeTabId?.startsWith("storyboard:")
    ? activeTabId.slice("storyboard:".length)
    : null;

  const handleOpen = useCallback(
    (id: string, name: string) => {
      openTab({
        type: "storyboard",
        ref: id,
        mode: "edit",
        title: name || i18n.t("storyboard:attrs.untitledStoryboard", { defaultValue: "Untitled storyboard" }),
        projectId
      });
      if (!location.pathname.startsWith("/workspace")) {
        navigate("/workspace");
      }
      setVisibility(false);
    },
    [location.pathname, navigate, openTab, projectId, setVisibility]
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<SidebarDocumentItem | null>(
    null
  );
  const utils = trpc.useUtils();
  const createStoryboard = useCreateStoryboard();
  const updateStoryboard = trpc.storyboards.update.useMutation({
    onSuccess: (updated) => {
      utils.storyboards.get.setData({ id: updated.id }, updated);
      void utils.storyboards.list.invalidate();
    }
  });
  const deleteStoryboard = trpc.storyboards.delete.useMutation({
    onSuccess: () => {
      void utils.storyboards.list.invalidate();
    }
  });
  const handleCommitRename = useCallback(
    (id: string, newName: string) => {
      const trimmed = newName.trim();
      const current = (data ?? []).find((b) => b.id === id);
      setEditingId(null);
      if (trimmed && current && trimmed !== current.name) {
        updateStoryboard.mutate({ id, name: trimmed });
      }
    },
    [data, updateStoryboard]
  );

  const handleDuplicate = useCallback(
    async (item: SidebarDocumentItem) => {
      try {
        const source = await utils.storyboards.get.fetch({ id: item.id });
        const copy = await createStoryboard.mutateAsync({
          name: `${source.name} (copy)`.substring(0, 200),
          projectId: source.projectId
        });
        await updateStoryboard.mutateAsync({
          id: copy.id,
          document: source.document
        });
      } catch (error) {
        notifyMutationError("duplicate the storyboard", error);
      }
    },
    [utils, createStoryboard, updateStoryboard]
  );

  const handleRequestRename = useCallback((item: SidebarDocumentItem) => {
    setEditingId(item.id);
  }, []);

  const handleRequestDelete = useCallback((item: SidebarDocumentItem) => {
    setItemToDelete(item);
  }, []);

  const handleContextMenu = useSidebarDocumentMenu({
    onRename: handleRequestRename,
    onDuplicate: handleDuplicate,
    onDelete: handleRequestDelete
  });

  const handleConfirmDelete = useCallback(() => {
    if (!itemToDelete) {
      return;
    }
    const { id } = itemToDelete;
    deleteStoryboard.mutate(
      { id },
      {
        // Only once the board is gone: a failed delete keeps the scripts
        // linked, and an open tab would autosave the deleted board back.
        onSuccess: () => {
          useWorkspaceTabsStore.getState().closeTab(tabId("storyboard", id));
          // The script keeps its words; only its pointer at this board goes.
          void downgradeScriptsLinkedToBoard(id).then((scriptIds) => {
            if (scriptIds.length > 0) {
              void utils.scripts.list.invalidate();
            }
          });
        },
        onError: (error) => notifyMutationError("delete the storyboard", error)
      }
    );
  }, [itemToDelete, deleteStoryboard, utils]);

  return (
    <DocumentListPanel
      singular={t("editor:ui.storyboardNoun", { defaultValue: "storyboard" })}
      plural={t("editor:ui.storyboardsNoun", { defaultValue: "storyboards" })}
      documents={data}
      isLoading={isLoading}
      isError={isError}
      errorMessage={error?.message}
      emptyDescription={t("editor:ui.createANewStoryboardWithThe+ButtonAbove", { defaultValue: "Create a new storyboard with the + button above." })}
      deleteTarget={itemToDelete}
      onCancelDelete={() => setItemToDelete(null)}
      onConfirmDelete={handleConfirmDelete}
      renderItem={(board) => (
        <ListPanelItem
          id={board.id}
          name={board.name}
          fallbackName={t("storyboard:attrs.untitledStoryboard", { defaultValue: "Untitled storyboard" })}
          renameLabel={t("editor:ui.storyboardName", { defaultValue: "Storyboard name" })}
          icon={DashboardOutlinedIcon}
          active={board.id === activeStoryboardId}
          editing={board.id === editingId}
          onOpen={handleOpen}
          onContextMenu={handleContextMenu}
          onCommitRename={handleCommitRename}
          onCancelRename={() => setEditingId(null)}
        />
      )}
    />
  );
};

export default memo(StoryboardListPanel);
