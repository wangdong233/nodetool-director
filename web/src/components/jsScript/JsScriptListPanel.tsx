/** @jsxImportSource @emotion/react */
import { useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import DataObjectOutlinedIcon from "@mui/icons-material/DataObjectOutlined";
import { memo, useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useCreateJsScript, useJsScripts } from "../../hooks/jsScript/useJsScripts";
import { usePanelStore } from "../../stores/PanelStore";
import {
  useWorkspaceTabsStore,
  creationProjectId
} from "../../stores/WorkspaceTabsStore";
import { notifyMutationError } from "../../utils/notifyMutationError";
import CategorySearchBar from "../node_menu/CategorySearchBar";
import { useTranslation } from "react-i18next";
import { i18n } from "../../i18n";
import {
  EmptyState,
  FlexColumn,
  FlexRow,
  LoadingSpinner,
  Text,
  ToolbarIconButton,
  Tooltip,
  TruncatedText,
  SPACING,
  listPanelStyles
} from "../ui_primitives";

const DEFAULT_NAME = "Untitled JS script";

export const CreateJsScriptButton = memo(function CreateJsScriptButton() {
  const { t } = useTranslation();
  const createJsScript = useCreateJsScript();
  const openTab = useWorkspaceTabsStore((state) => state.openTab);
  const setVisibility = usePanelStore((state) => state.setVisibility);
  const navigate = useNavigate();
  const location = useLocation();

  const handleCreate = useCallback(async () => {
    try {
      const created = await createJsScript.mutateAsync({
        name: i18n.t("editor:ui.untitledJsScript", { defaultValue: DEFAULT_NAME }),
        projectId: creationProjectId()
      });
      openTab({
        type: "jsscript",
        ref: created.id,
        mode: "edit",
        title: created.name || DEFAULT_NAME,
        projectId: created.projectId
      });
      if (!location.pathname.startsWith("/workspace")) {
        navigate("/workspace");
      }
      setVisibility(false);
    } catch (error) {
      notifyMutationError("create the JS script", error);
    }
  }, [createJsScript, location.pathname, navigate, openTab, setVisibility]);

  return (
    <Tooltip title={t("editor:ui.newJSScript", { defaultValue: "New JS script" })} placement="right-start">
      <ToolbarIconButton
        ariaLabel={t("editor:ui.newJSScript", { defaultValue: "New JS script" })}
        onClick={() => void handleCreate()}
        disabled={createJsScript.isPending}
        tabIndex={-1}
        icon={<AddIcon />}
      />
    </Tooltip>
  );
});

/**
 * The left-panel browser for JS script documents: filter, then open one as a
 * workspace tab. Deliberately thinner than ScriptListPanel — rename, duplicate
 * and delete arrive with the versions UI in a later pass.
 */
interface JsScriptListPanelProps {
  readonly projectId: string;
}

const JsScriptListPanel = ({ projectId }: JsScriptListPanelProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [filterValue, setFilterValue] = useState("");
  const { data, isLoading, isError, error } = useJsScripts(projectId);
  const openTab = useWorkspaceTabsStore((state) => state.openTab);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const setVisibility = usePanelStore((state) => state.setVisibility);
  const navigate = useNavigate();
  const location = useLocation();

  const activeScriptId = activeTabId?.startsWith("jsscript:")
    ? activeTabId.slice("jsscript:".length)
    : null;

  const scripts = useMemo(() => {
    const all = data ?? [];
    const needle = filterValue.trim().toLowerCase();
    const filtered = needle
      ? all.filter(
          (script) =>
            script.name.toLowerCase().includes(needle) ||
            script.description.toLowerCase().includes(needle)
        )
      : all;
    return [...filtered].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [data, filterValue]);

  const handleOpen = useCallback(
    (id: string, name: string) => {
      openTab({
        type: "jsscript",
        ref: id,
        mode: "edit",
        title: name || DEFAULT_NAME,
        projectId
      });
      if (!location.pathname.startsWith("/workspace")) {
        navigate("/workspace");
      }
      setVisibility(false);
    },
    [location.pathname, navigate, openTab, projectId, setVisibility]
  );

  return (
    <FlexColumn fullHeight fullWidth gap={0} css={listPanelStyles(theme)}>
      <div className="list-panel-search">
        <CategorySearchBar
          value={filterValue}
          onChange={setFilterValue}
          placeholder={t("editor:ui.searchJSScripts", { defaultValue: "Search JS scripts..." })}
        />
      </div>

      {isLoading ? (
        <FlexColumn gap={2} justify="center" align="center" sx={{ flex: 1 }}>
          <LoadingSpinner size="large" text={t("editor:ui.loadingJSScripts", { defaultValue: "Loading JS scripts" })} />
        </FlexColumn>
      ) : isError ? (
        <FlexColumn
          gap={2}
          justify="center"
          align="center"
          sx={{ flex: 1, px: 2 }}
        >
          <EmptyState
            variant="error"
            title={t("editor:ui.couldNotLoadJSScripts", { defaultValue: "Could not load JS scripts" })}
            description={error?.message ?? t("common:list.tryAgainLater", { defaultValue: "Try again later." })}
          />
        </FlexColumn>
      ) : scripts.length === 0 ? (
        <FlexColumn
          gap={2}
          justify="center"
          align="center"
          sx={{ flex: 1, px: 2 }}
        >
          <EmptyState
            title={filterValue ? t("editor:ui.noMatchingJSScripts", { defaultValue: "No matching JS scripts" }) : t("editor:ui.noJSScriptsYet", { defaultValue: "No JS scripts yet" })}
            description={
              filterValue
                ? t("editor:ui.tryADifferentSearchTerm", { defaultValue: "Try a different search term." })
                : t("editor:ui.createANewJSScriptWithThe+ButtonAbove", { defaultValue: "Create a new JS script with the + button above." })
            }
          />
        </FlexColumn>
      ) : (
        <FlexColumn className="list-panel-list" gap={SPACING.xs}>
          {scripts.map((script) => (
            <button
              key={script.id}
              type="button"
              className={`list-panel-item ${
                script.id === activeScriptId ? "active" : ""
              }`}
              onClick={() => handleOpen(script.id, script.name)}
              aria-current={script.id === activeScriptId ? "page" : undefined}
            >
              <FlexRow align="center" gap={1} fullWidth>
                <DataObjectOutlinedIcon className="list-panel-icon" />
                <FlexColumn gap={0.5} sx={{ minWidth: 0, flex: 1 }}>
                  <TruncatedText
                    component="span"
                    sx={{ fontSize: "var(--fontSizeSmall)", fontWeight: 600 }}
                  >
                    {script.name || t("editor:ui.untitledJsScript", { defaultValue: DEFAULT_NAME })}
                  </TruncatedText>
                  {script.description && (
                    <Text size="small" color="secondary" truncate>
                      {script.description}
                    </Text>
                  )}
                </FlexColumn>
              </FlexRow>
            </button>
          ))}
        </FlexColumn>
      )}
    </FlexColumn>
  );
};

export default memo(JsScriptListPanel);
