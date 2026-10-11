/** @jsxImportSource @emotion/react */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Puck, useGetPuck, type Data, type Overrides } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import "./puckTheme.css";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import TabletMacIcon from "@mui/icons-material/TabletMac";
import AspectRatioIcon from "@mui/icons-material/AspectRatio";
import TuneIcon from "@mui/icons-material/Tune";

import { Workflow } from "../../../stores/ApiTypes";
import { NodeContext } from "../../../contexts/NodeContext";
import { useWorkflowManager } from "../../../contexts/WorkflowManagerContext";
import { extractWorkflowState, type WorkflowState } from "../workflowState";
import { useAppRuntime } from "../runtime/useAppRuntime";
import { AppRuntimeContext } from "../runtime/AppRuntimeContext";
import { BuilderWorkflowProvider } from "./BuilderWorkflowContext";
import { appConfig } from "./config";
import { localizeAppConfig } from "./localizeConfig";
import { tAttr } from "../i18nAttrs";
import { i18n } from "../../../i18n";
import PuckAgentBinder from "./PuckAgentBinder";
import {
  APP_SCHEMA_VERSION,
  BASE_APP_SCHEMA_VERSION,
  EMPTY_DOC_META,
  type AppDocMeta,
  type ApplicationDocument
} from "@nodetool-ai/app-runtime";
import {
  Box,
  EditorButton,
  ToggleGroup,
  ToggleOption
} from "../../ui_primitives";

interface PuckAppEditorProps {
  /** The application being edited — the id the agent's `ui_app_*` tools take. */
  applicationId: string;
  workflow: Workflow;
  data: Data;
  onPublish: (data: Data) => void;
  onChange?: (data: Data) => void;
  saving?: boolean;
  /** Omitted when the builder is embedded and there is nowhere to go back to. */
  onClose?: () => void;
  /**
   * The document's operations, variables, and resources. Puck does not own
   * them, so the page holds them and the agent tools edit them through
   * `onMetaChange`.
   */
  meta?: AppDocMeta;
  onMetaChange?: (next: AppDocMeta) => void;
  dataOpen?: boolean;
  onToggleData?: () => void;
  /**
   * The graph of every workflow the document's operations run, by workflow id.
   * An operation whose workflow is missing binds against nothing — the host
   * workflow's surface is not another operation's.
   */
  operationWorkflows?: Record<string, Workflow>;
}

/**
 * Replaces Puck's built-in "Publish" button with a "Save" button that reads
 * the current editor data via Puck's store and forwards it to onPublish.
 */
const SaveButton: React.FC<{ onSave: (data: Data) => void; saving?: boolean }> = ({ onSave, saving }) => {
  const getPuck = useGetPuck();
  const handleClick = useCallback(() => {
    const { appState } = getPuck();
    onSave(appState.data);
  }, [getPuck, onSave]);
  return (
    <EditorButton
      size="small"
      variant="contained"
      color="primary"
      startIcon={<SaveIcon sx={{ fontSize: 16 }} />}
      onClick={handleClick}
      disabled={saving}
    >
      {saving ? "Saving…" : "Save"}
    </EditorButton>
  );
};

type PreviewWidth = "phone" | "tablet" | "fit";

/**
 * Revision of the i18n language state. Bumped on EVERY languageChanged event —
 * including the same-language re-emit that fires when the lazy zh-CN bundles
 * finish loading at boot (R7-5): the localized config memo below must rebuild
 * then, or a builder mounted before the bundles landed would stay English.
 */
function useLanguageRevision(): number {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    i18n.on("languageChanged", bump);
    return () => {
      i18n.off("languageChanged", bump);
    };
  }, []);
  return revision;
}

/** Puck sidebars start closed. Header buttons still toggle them. */
const INITIAL_UI = {
  leftSideBarVisible: false,
  rightSideBarVisible: false
};

/**
 * Constrains the canvas preview width so container-query-driven widgets
 * (e.g. Columns) can be checked at narrow/wide breakpoints deliberately. The
 * chosen width becomes a class on `.appbuilder-editor`; puckTheme.css caps
 * `[data-puck-preview]` accordingly. "Fit" leaves the canvas unconstrained.
 */
const PreviewWidthToggle: React.FC<{
  value: PreviewWidth;
  onChange: (value: PreviewWidth) => void;
}> = ({ value, onChange }) => (
  <ToggleGroup
    segmented
    exclusive
    value={value}
    onChange={(_event, next: PreviewWidth | null) => {
      if (next) onChange(next);
    }}
  >
    <ToggleOption value="phone" icon={<PhoneIphoneIcon sx={{ fontSize: 16 }} />} />
    <ToggleOption value="tablet" icon={<TabletMacIcon sx={{ fontSize: 16 }} />} />
    <ToggleOption value="fit" icon={<AspectRatioIcon sx={{ fontSize: 16 }} />} />
  </ToggleGroup>
);

/**
 * Retitles the component-drawer categories when the language changes.
 * Category titles were frozen into the store's ui state at mount (puck
 * seeds `componentList` from config.categories once), so a config swap
 * alone does not retitle them. Rewrites them from the localized config —
 * deriving from the config (not the current ui titles) keeps the effect
 * idempotent and reversible when the language switches back to English.
 *
 * Must render INSIDE Puck (useGetPuck needs Puck's context), so it rides
 * the headerActions override like PuckAgentBinder and renders nothing.
 */
const DrawerTitleSync: React.FC<{
  config: ReturnType<typeof localizeAppConfig>;
  revision: number;
}> = ({ config, revision }) => {
  const getPuck = useGetPuck();
  useEffect(() => {
    const { appState, dispatch } = getPuck();
    const list = appState.ui.componentList;
    const categories = config.categories;
    if (!list || !categories || Object.keys(list).length === 0) return;
    const next: typeof list = {};
    let changed = false;
    for (const [id, category] of Object.entries(list)) {
      // Puck's synthetic "other" bucket has no config source; leave it be.
      const title = categories[id]?.title;
      if (!category || title === undefined) {
        next[id] = category;
        continue;
      }
      changed = changed || title !== category.title;
      next[id] = { ...category, title };
    }
    if (changed) {
      dispatch({ type: "setUi", ui: { componentList: next } });
    }
    // Runs on the same revision tick the localized config is pushed on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);
  return null;
};

/**
 * The WYSIWYG editor: Puck draws the editing chrome (component drawer, canvas,
 * field inspector) while our contexts supply the bindable workflow surface and
 * an inert design-mode runtime so widget previews render without running.
 */
const PuckAppEditor: React.FC<PuckAppEditorProps> = ({
  applicationId,
  workflow,
  data,
  onPublish,
  onChange,
  saving,
  onClose,
  meta = EMPTY_DOC_META,
  onMetaChange,
  dataOpen = false,
  onToggleData,
  operationWorkflows
}) => {
  const workflowState = useMemo(
    () => extractWorkflowState(workflow, meta.resources),
    [workflow, meta.resources]
  );

  // One bindable surface per declared operation, so a widget bound to the
  // second operation is offered that workflow's inputs and outputs.
  const operationStates = useMemo(() => {
    const states = new Map<string, WorkflowState>();
    for (const operation of meta.operations) {
      const target =
        operation.workflowId === workflow.id
          ? workflow
          : operationWorkflows?.[operation.workflowId];
      states.set(operation.id, extractWorkflowState(target, meta.resources));
    }
    return states;
  }, [meta.operations, meta.resources, operationWorkflows, workflow]);

  // The same surfaces keyed by workflow id, which is what the agent's
  // `ui_app_get_binding_targets` resolves an operation against.
  const workflowStates = useMemo(() => {
    const states = new Map<string, WorkflowState>();
    for (const [id, graph] of Object.entries(operationWorkflows ?? {})) {
      if (id === workflow.id) continue;
      states.set(id, extractWorkflowState(graph, meta.resources));
    }
    return states;
  }, [meta.resources, operationWorkflows, workflow.id]);

  // The design canvas resolves bindings against the document's real operations,
  // not an implicit one — otherwise a widget bound to `operation_1` renders as
  // unbound in the builder.
  const designDocument = useMemo<ApplicationDocument>(
    () => ({
      schemaVersion: meta.recipe ? APP_SCHEMA_VERSION : BASE_APP_SCHEMA_VERSION,
      ui: data as ApplicationDocument["ui"],
      operations: meta.operations,
      resources: meta.resources,
      variables: meta.variables,
      recipe: meta.recipe
    }),
    [data, meta]
  );
  const handleMetaChange = useCallback(
    (next: AppDocMeta) => onMetaChange?.(next),
    [onMetaChange]
  );
  const designRuntime = useAppRuntime(workflow, true, {
    document: designDocument,
    workflowOverrides: operationWorkflows
  });
  // The builder sits next to the graph, so its preview controls read the
  // workflow's live node store. They also work without one.
  const nodeStore = useWorkflowManager((s) => s.nodeStores[workflow.id]);
  const [previewWidth, setPreviewWidth] = useState<PreviewWidth>("fit");

  // English label strings are baked into the module-scope appConfig, so the
  // config handed to Puck is re-cloned with translated labels whenever the
  // language (or its lazy bundle load) lands. Puck swaps a changed config
  // into its live store, which re-renders field labels, select options, and
  // drawer items. The agent binder keeps the raw appConfig: agent-facing
  // labels stay English.
  const languageRevision = useLanguageRevision();
  const localizedConfig = useMemo(
    () => localizeAppConfig(appConfig),
    // Rebuild only on language events, not on every render: a new config
    // identity makes puck push a store update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [languageRevision]
  );

  // localizedConfig is handed to <Puck> below; DrawerTitleSync (rendered in
  // the headerActions override, inside Puck) consumes it there — useGetPuck
  // cannot run at this component's top level.
  const overrides = useMemo<Partial<Overrides>>(
    () => ({
      headerActions: () => (
        <>
          {/* Lets the agent's ui_app_* tools drive this editor. Renders nothing. */}
          <PuckAgentBinder
            config={appConfig}
            applicationId={applicationId}
            workflowId={workflow.id}
            meta={meta}
            onMetaChange={handleMetaChange}
            workflowState={workflowState}
            workflowStates={workflowStates}
          />
          <DrawerTitleSync config={localizedConfig} revision={languageRevision} />
          <PreviewWidthToggle value={previewWidth} onChange={setPreviewWidth} />
          {onToggleData && (
            <EditorButton
              size="small"
              variant={dataOpen ? "contained" : "text"}
              startIcon={<TuneIcon sx={{ fontSize: 16 }} />}
              onClick={onToggleData}
              aria-pressed={dataOpen}
            >
              {tAttr("App Data")}
            </EditorButton>
          )}
          {onClose && (
            <EditorButton
              size="small"
              variant="text"
              startIcon={<CloseIcon sx={{ fontSize: 16 }} />}
              onClick={onClose}
            >
              {tAttr("Back")}
            </EditorButton>
          )}
          <SaveButton onSave={onPublish} saving={saving} />
        </>
      )
    }),
    [
      applicationId,
      onClose,
      onPublish,
      saving,
      workflow,
      previewWidth,
      meta,
      handleMetaChange,
      workflowState,
      workflowStates,
      dataOpen,
      onToggleData,
      // DrawerTitleSync (in headerActions) takes these as props; the memo
      // must rebuild so the closure sees a new config/revision on language
      // switches.
      localizedConfig,
      languageRevision
    ]
  );

  return (
    <NodeContext.Provider value={nodeStore ?? null}>
      <BuilderWorkflowProvider
        value={workflowState}
        operations={meta.operations}
        states={operationStates}
        variables={meta.variables}
      >
        <AppRuntimeContext.Provider value={designRuntime}>
          <Box
            className={`appbuilder-editor${
              previewWidth !== "fit" ? ` preview-${previewWidth}` : ""
            }`}
            sx={{ width: "100%", height: "100%" }}
          >
            <Puck
              config={localizedConfig}
              data={data}
              ui={INITIAL_UI}
              onPublish={onPublish}
              onChange={onChange}
              overrides={overrides}
              iframe={{ enabled: false }}
            />
          </Box>
        </AppRuntimeContext.Provider>
      </BuilderWorkflowProvider>
    </NodeContext.Provider>
  );
};

export default PuckAppEditor;
