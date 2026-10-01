import { memo, useCallback, useMemo } from "react";
import type { UiDocumentRef } from "@nodetool-ai/protocol";
import { useTranslation } from "react-i18next";

import AssistantChatPanel from "../chat/assistant/AssistantChatPanel";
import { useSketchSessionStore } from "../../stores/sketch/SketchSessionStore";
import { useSketchStore } from "./state/useSketchStore";

/**
 * Chat surface for the image / sketch editor. The shared assistant panel
 * sends `ui_context` with this document, the active layers, and
 * `source: sketch_assistant`.
 */
const SketchAgentPanel = () => {
  // Language anchor for a memo'd panel (F-26).
  const { t } = useTranslation();
  const documentId = useSketchSessionStore((s) => s.documentId);
  const name = useSketchSessionStore((s) => s.name);

  const focused = useMemo<UiDocumentRef | null>(
    () =>
      documentId
        ? { type: "sketch", id: documentId, title: name || null }
        : null,
    [documentId, name]
  );

  const getSelection = useCallback(() => {
    const { selectedLayerIds, document } = useSketchStore.getState();
    const ids =
      selectedLayerIds.length > 0
        ? selectedLayerIds
        : document.activeLayerId
          ? [document.activeLayerId]
          : [];
    return ids.length > 0 ? { layer_ids: ids } : null;
  }, []);

  return (
    <AssistantChatPanel
      chatSource="sketch_assistant"
      focused={focused}
      getSelection={getSelection}
      workflowId={documentId}
      docsTopic="sketches"
      docsLabel={t("sketch:attrs.docsLabel", { defaultValue: "Sketch editor" })}
      welcomeTitle={t("sketch:attrs.editorAssistant", { defaultValue: "Editor Assistant" })}
      welcomeBody={t("sketch:attrs.editorAssistantWelcome", { defaultValue: "Describe an image to generate, or ask for an edit to your layers." })}
    />
  );
};

export default memo(SketchAgentPanel);
