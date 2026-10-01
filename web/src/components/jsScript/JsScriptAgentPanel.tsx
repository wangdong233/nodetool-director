import { memo, useMemo } from "react";
import type { UiDocumentRef } from "@nodetool-ai/protocol";
import { useTranslation } from "react-i18next";

import AssistantChatPanel from "../chat/assistant/AssistantChatPanel";
import { jsScriptSystemPrompt } from "./jsScriptBodyContract";
import { useJsScriptName } from "../../stores/jsScript/JsScriptStore";

interface JsScriptAgentPanelProps {
  scriptId: string;
}

const JsScriptAgentPanel = ({ scriptId }: JsScriptAgentPanelProps) => {
  // Language anchor for a memo'd panel (F-26).
  const { t } = useTranslation();
  const name = useJsScriptName(scriptId);

  const focused = useMemo<UiDocumentRef>(
    () => ({ type: "jsscript", id: scriptId, title: name || null }),
    [scriptId, name]
  );

  const systemPrompt = useMemo(
    () => jsScriptSystemPrompt(scriptId),
    [scriptId]
  );

  return (
    <AssistantChatPanel
      chatSource="jsscript_assistant"
      focused={focused}
      workflowId={scriptId}
      systemPrompt={systemPrompt}
      welcomeTitle={t("editor:ui.jsScriptAssistant", { defaultValue: "JS Script Assistant" })}
      welcomeBody={t("editor:ui.jsScriptAssistantWelcome", { defaultValue: 'Ask me to write or change this script — e.g. "parse the CSV and emit one row per line", "add an error output", or "write a test for the empty case".' })}
    />
  );
};

export default memo(JsScriptAgentPanel);
