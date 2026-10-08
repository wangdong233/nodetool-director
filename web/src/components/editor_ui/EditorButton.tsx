/** @jsxImportSource @emotion/react */
/**
 * EditorButton
 *
 * A Button primitive for editor/node UI that applies consistent styling
 * via sx and maintains nodrag behavior.
 *
 * Accepts semantic props for state-based styling:
 * - `density`: Controls compact vs normal sizing
 */

import { memo, type Ref } from "react";
import { Button, ButtonProps } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useEditorScope } from "./EditorUiContext";
import { editorClassNames, cn } from "./editorUtils";

import { BORDER_RADIUS, CONTROL, TYPOGRAPHY } from "../ui_primitives";
export interface EditorButtonProps extends Omit<ButtonProps, "size"> {
  /**
   * Density variant
   */
  density?: "compact" | "normal";
  /**
   * MUI button size. When provided, overrides the density-based height.
   */
  size?: "small" | "medium" | "large";
  /**
   * Link target (for use as an anchor element)
   */
  href?: string;
  target?: string;
  rel?: string;
  /** Saves the href instead of navigating to it; "" keeps the server's name. */
  download?: string;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * A styled Button for use in node properties and editor UI.
 * Applies editor tokens for consistent styling and maintains nodrag behavior.
 *
 * @example
 * <EditorButton
 *   onClick={handleClick}
 *   density="compact"
 * >
 *   Click me
 * </EditorButton>
 */
export function EditorButton({
  density = "compact",
  size,
  href,
  target,
  rel,
  sx,
  className,
  ref,
  ...props
}: EditorButtonProps) {
  const theme = useTheme();
  const scope = useEditorScope();

  const fontSize =
    scope === "inspector" ? theme.fontSizeSmall : theme.fontSizeSmaller;
  const densityHeight =
    density === "compact" ? CONTROL.height.xs : CONTROL.height.sm;
  const sizeHeights = {
    small: CONTROL.height.sm,
    medium: CONTROL.height.md,
    large: CONTROL.height.lg
  } as const;
  const height = size ? sizeHeights[size] : densityHeight;
  const paddingX =
    density === "compact" ? CONTROL.paddingX.compact : CONTROL.paddingX.normal;
  // F-38 (r20, user ruling): single-line controls ADAPT to their text — the
  // CONTROL height is a minHeight floor on the 4px grid, never a fixed box.
  // A fixed height plus MUI's default `typography.button` lineHeight of 1.75
  // made the line box (1.75 × fontSize) taller than the box; CJK ink fills
  // the full em box (zh fonts have no short Latin ink) and font metrics set a
  // ~1.33×fontSize floor no smaller line box can undercut, so under a browser
  // minimum-font-size setting or a surface-level font-size blanket the glyphs
  // spilled past the border with `overflow: visible`. Compressing the line
  // box into a fixed height is a pseudo-fix (the metrics floor always wins);
  // minHeight + a sane single-line lineHeight + auto width is the standard
  // shape. The label itself stays on one line and keeps its natural width
  // (nowrap + flexShrink 0): letting a flex parent squeeze the button below
  // its content width only moves the overflow into a two-line wrap. Default
  // pixels are unchanged: the token line box (11-13px × 1.35-1.4 ≈ 15-18px)
  // stays under the grid floor (content = floor − 8px padding), and the box
  // only grows when the content genuinely needs it.
  const lineHeight =
    scope === "inspector"
      ? TYPOGRAPHY.sans.label.lineHeight // 1.35 — pairs with fontSizeSmall (label tier)
      : TYPOGRAPHY.sans.caption.lineHeight; // 1.4 — pairs with fontSizeSmaller (caption tier)

  return (
    <Button
      ref={ref}
      size={size ?? "small"}
      className={cn(editorClassNames.nodrag, className)}
      {...(href ? { href, target, rel, component: "a" as const } : {})}
      sx={{
        fontSize,
        minHeight: height,
        lineHeight,
        minWidth: "auto",
        flexShrink: 0,
        whiteSpace: "nowrap",
        padding: `${CONTROL.paddingY}px ${paddingX}px`,
        borderRadius: BORDER_RADIUS.md,
        textTransform: "none",
        ...sx
      }}
      {...props}
    />
  );
}

export default memo(EditorButton);
