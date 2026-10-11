/**
 * Chip Component
 *
 * A themed chip/tag for displaying labels, categories, or status.
 * Wraps MUI Chip with consistent styling and semantic variants.
 */

import { i18n } from "../../i18n";
import React from "react";
import { Chip as MuiChip, ChipProps as MuiChipProps } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { CONTROL, TYPOGRAPHY } from "./tokens";

export interface ChipProps extends Omit<MuiChipProps, 'color'> {
  /** Semantic color variant */
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "error" | "info";
  /** Whether the chip is in a selected/active state */
  active?: boolean;
  /** Compact size for dense layouts */
  compact?: boolean;
}

/**
 * Chip - A themed label/tag component
 *
 * @example
 * // Basic chip
 * <Chip label={i18n.t("editor:ui.category", { defaultValue: "Category" })} />
 *
 * @example
 * // Deletable chip
 * <Chip label="Tag" onDelete={handleDelete} />
 *
 * @example
 * // Active/selected state
 * <Chip label="Selected" active onClick={handleToggle} />
 *
 * @example
 * // Compact chip for dense layouts
 * <Chip label="v1.2" compact color="info" />
 *
 * @example
 * // With icon
 * <Chip label={i18n.t("editor:ui.status", { defaultValue: "Status" })} color="success" icon={<CheckIcon />} />
 */
export const Chip: React.FC<ChipProps> = ({
  color = "default",
  active = false,
  compact = false,
  variant,
  sx,
  ...props
}) => {
  const theme = useTheme();

  const chipVariant = variant || (active ? "filled" : "outlined");

  return (
    <MuiChip
      color={color === "default" ? "default" : color}
      variant={chipVariant}
      size={compact ? "small" : props.size}
      sx={{
        fontWeight: active ? 600 : 400,
        ...(compact && {
          // F-38 (r20): minHeight floor + token caption lineHeight (not a
          // fixed 24px box) — a chip label under font inflation (browser
          // minimum font size) grows the chip instead of spilling out of it.
          minHeight: `${CONTROL.height.xs}px`,
          fontSize: theme.fontSizeSmaller,
          lineHeight: TYPOGRAPHY.sans.caption.lineHeight,
          "& .MuiChip-label": {
            px: 1,
            whiteSpace: "nowrap",
          },
        }),
        ...sx,
      }}
      {...props}
    />
  );
};

Chip.displayName = "Chip";
