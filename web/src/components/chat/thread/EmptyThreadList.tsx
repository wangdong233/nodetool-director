/** @jsxImportSource @emotion/react */
import React from "react";
import { useTheme } from "@mui/material/styles";
import { createStyles } from "./EmptyThreadList.styles";
import { EmptyState } from "../../ui_primitives";
import { useTranslation } from "react-i18next";

export const EmptyThreadList: React.FC<{ isFiltered?: boolean }> = ({
  isFiltered = false
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <li css={createStyles(theme)}>
      <EmptyState
        variant="empty"
        title={isFiltered ? t("editor:ui.noMatchingConversations", { defaultValue: "No matching conversations" }) : t("editor:chat.noneYet", { defaultValue: "No conversations yet" })}
        description={
          isFiltered
            ? "Try a different search term."
            : "Start a conversation to explore AI workflows with natural language."
        }
        size="small"
      />
    </li>
  );
};
