/** @jsxImportSource @emotion/react */
import React from "react";
import { useTheme } from "@mui/material/styles";
import { createStyles } from "./EmptyThreadList.styles";
import { useTranslation } from "react-i18next";
import { EmptyState } from "../../ui_primitives";

export const EmptyThreadList: React.FC<{ isFiltered?: boolean }> = ({
  isFiltered = false
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <li css={createStyles(theme)}>
      <EmptyState
        variant="empty"
        title={isFiltered ? t("editor:ui.noMatchingConversations") : t("editor:ui.noConversationsYet")}
        description={
          isFiltered
            ? t("editor:ui.tryADifferentSearchTerm")
            : t("editor:ui.startAConversationToExploreAiWorkflowsWithNaturalLanguage")
        }
        size="small"
      />
    </li>
  );
};
