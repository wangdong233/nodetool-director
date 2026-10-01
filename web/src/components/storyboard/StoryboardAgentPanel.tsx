import { memo, useCallback, useMemo } from "react";
import type { UiDocumentRef } from "@nodetool-ai/protocol";
import { useTranslation } from "react-i18next";

import AssistantChatPanel from "../chat/assistant/AssistantChatPanel";
import { useStoryboardStore } from "../../stores/storyboard/StoryboardStore";

interface StoryboardAgentPanelProps {
  boardId: string;
}

const StoryboardAgentPanel = ({ boardId }: StoryboardAgentPanelProps) => {
  // Language anchor for a memo'd panel: the welcome strings below render
  // through `t` so the dock re-renders on a language switch (F-26).
  const { t } = useTranslation();
  const title = useStoryboardStore(
    (state) => state.boards[boardId]?.title ?? ""
  );

  const focused = useMemo<UiDocumentRef>(
    () => ({ type: "storyboard", id: boardId, title: title || null }),
    [boardId, title]
  );

  const getSelection = useCallback(() => {
    const shotId =
      useStoryboardStore.getState().boards[boardId]?.activeShotId ?? null;
    return shotId ? { shot_ids: [shotId] } : null;
  }, [boardId]);

  return (
    <AssistantChatPanel
      chatSource="storyboard_assistant"
      focused={focused}
      getSelection={getSelection}
      workflowId={boardId}
      docsTopic="storyboards"
      docsLabel={t("editor:ui.storyboards", { defaultValue: "Storyboards" })}
      welcomeTitle={t("storyboard:attrs.storyboardAssistant", { defaultValue: "Storyboard Assistant" })}
      welcomeBody={t("storyboard:attrs.storyboardAssistantWelcome", { defaultValue: 'Ask me to direct the board — e.g. "break this brief into six shots", "add a close-up after shot 3", "generate keyframes for every planned shot", or "assemble the shots into a timeline".' })}
    />
  );
};

export default memo(StoryboardAgentPanel);
