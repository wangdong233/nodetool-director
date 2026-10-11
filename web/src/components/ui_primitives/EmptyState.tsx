/** @jsxImportSource @emotion/react */
import React, { memo } from "react";
import { css } from "@emotion/react";
import { useTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import { Box, Typography, Button } from "@mui/material";
import InboxIcon from "@mui/icons-material/Inbox";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import FolderOffIcon from "@mui/icons-material/FolderOff";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useTranslation } from "react-i18next";

const styles = (theme: Theme, size: string) =>
  css({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: size === "small" ? theme.spacing(2) : size === "large" ? theme.spacing(6) : theme.spacing(4),
    textAlign: "center",
    ".empty-icon": {
      color: theme.vars.palette.text.disabled,
      marginBottom: theme.spacing(2),
      fontSize: size === "small" ? 40 : size === "large" ? 80 : 60
    },
    ".empty-title": {
      color: theme.vars.palette.text.primary,
      marginBottom: theme.spacing(1),
      fontWeight: 500
    },
    ".empty-description": {
      color: theme.vars.palette.text.secondary,
      maxWidth: 400,
      marginBottom: theme.spacing(2)
    },
    ".empty-action": {
      marginTop: theme.spacing(1)
    }
  });

export type EmptyStateVariant = "empty" | "no-results" | "no-data" | "offline" | "error";

export interface EmptyStateProps {
  /** Visual variant */
  variant?: EmptyStateVariant;
  /** Custom icon to display */
  icon?: React.ReactNode;
  /** Title text */
  title?: string;
  /** Description text or element */
  description?: React.ReactNode;
  /** Action button text */
  actionText?: string;
  /** Action button callback */
  onAction?: () => void;
  /** Size of the empty state */
  size?: "small" | "medium" | "large";
  /** Custom class name */
  className?: string;
}

const defaultContent = {
  empty: {
    icon: <InboxIcon className="empty-icon" />,
    title: "Nothing here yet",
    titleKey: "editor:ui.nothingHereYet",
    description: "Get started by creating your first item.",
    descriptionKey: "editor:ui.getStartedByCreatingFirstItem"
  },
  "no-results": {
    icon: <SearchOffIcon className="empty-icon" />,
    title: "No results found",
    titleKey: "editor:ui.noResultsFound",
    description: "Try adjusting your search or filters.",
    descriptionKey: "editor:ui.tryAdjustingSearchOrFilters"
  },
  "no-data": {
    icon: <FolderOffIcon className="empty-icon" />,
    title: "No data available",
    titleKey: "editor:ui.noDataAvailable",
    description: "Data will appear here when available.",
    descriptionKey: "editor:ui.dataWillAppearWhenAvailable"
  },
  offline: {
    icon: <CloudOffIcon className="empty-icon" />,
    title: "You're offline",
    titleKey: "editor:ui.youAreOffline",
    description: "Check your internet connection and try again.",
    descriptionKey: "editor:ui.checkInternetAndRetry"
  },
  error: {
    icon: <ErrorOutlineIcon className="empty-icon" />,
    title: "Something went wrong",
    titleKey: "editor:ui.somethingWentWrong",
    description: "An error occurred. Please try again.",
    descriptionKey: "editor:explorer.errorGeneric"
  }
} satisfies Record<
  EmptyStateVariant,
  {
    icon: React.ReactNode;
    title: string;
    titleKey?: string;
    description: string;
    descriptionKey?: string;
  }
>;

export const EmptyState: React.FC<EmptyStateProps> = memo(({
  variant = "empty",
  icon,
  title,
  description,
  actionText,
  onAction,
  size = "medium",
  className
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const defaults = defaultContent[variant];

  const displayIcon = icon || defaults.icon;
  const displayTitle =
    title ||
    ("titleKey" in defaults && defaults.titleKey
      ? t(defaults.titleKey, { defaultValue: defaults.title })
      : defaults.title);
  const displayDescription =
    description ||
    ("descriptionKey" in defaults && defaults.descriptionKey
      ? t(defaults.descriptionKey, {
          defaultValue: defaults.description
        })
      : defaults.description);

  const titleVariant = size === "small" ? "body1" : size === "large" ? "h5" : "h6";
  const descriptionVariant = size === "small" ? "caption" : "body2";

  return (
    <Box
      css={styles(theme, size)}
      className={`empty-state ${className || ""}`}
      role="status"
      aria-live="polite"
    >
      {displayIcon}
      <Typography variant={titleVariant} className="empty-title">
        {displayTitle}
      </Typography>
      {displayDescription && (
        <Typography variant={descriptionVariant} className="empty-description" component="div">
          {displayDescription}
        </Typography>
      )}
      {actionText && onAction && (
        <Button
          variant="outlined"
          onClick={onAction}
          className="empty-action"
          size={size === "large" ? "large" : size === "small" ? "small" : "medium"}
        >
          {actionText}
        </Button>
      )}
    </Box>
  );
});

EmptyState.displayName = "EmptyState";

export default EmptyState;
