/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { useTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import { memo } from "react";
import {
  Text,
  Caption,
  Box,
  ExternalLink,
  BORDER_RADIUS,
  SPACING,
  getSpacingPx
} from "./ui_primitives";
import GoogleAuthButton from "./buttons/GoogleAuthButton";
import Logo from "./Logo";
import { i18n } from "../i18n";

const STUDIO_URL = "https://nodetool.ai/studio";

const styles = (theme: Theme) =>
  css({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: getSpacingPx(SPACING.xxl),
    minHeight: "100vh",
    padding: getSpacingPx(SPACING.xxl),
    ".hero": {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: getSpacingPx(SPACING.lg),
      maxWidth: "420px",
      textAlign: "center"
    },
    ".alpha-badge": {
      color: theme.vars.palette.warning.main,
      border: `1px solid ${theme.vars.palette.warning.main}`,
      borderRadius: BORDER_RADIUS.pill,
      padding: `${getSpacingPx(SPACING.micro)} ${getSpacingPx(SPACING.lg)}`,
      textTransform: "uppercase",
      letterSpacing: "0.08em"
    },
    ".headline": {
      color: theme.vars.palette.grey[0]
    },
    ".subhead": {
      color: theme.vars.palette.grey[200]
    },
    ".footnotes": {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: getSpacingPx(SPACING.md),
      maxWidth: "420px",
      textAlign: "center"
    },
    // The Google button ships a fixed-width, uppercase label that clipped to
    // "SIGN IN WITH GOO…". Let it size to its own text.
    ".gsi-material-button": {
      minWidth: "260px",
      height: "48px",
      border: "none",
      background: theme.vars.palette.grey[0]
    },
    ".gsi-material-button:hover": {
      background: theme.vars.palette.grey[100]
    }
  });

function Login() {
  const theme = useTheme();

  return (
    <Box css={styles(theme)}>
      <div className="hero">
        <Logo
          width="150px"
          height="150px"
          fontSize="48px"
          borderRadius={BORDER_RADIUS.xl}
          small={false}
          enableText
        />
        <Caption className="alpha-badge" size="smaller" color="warning">
          {i18n.t("editor:ui.cloudAlpha")}
        </Caption>
        <Text component="h1" size="giant" className="headline">
          {i18n.t("editor:ui.youDirectTheVisionTheAgentBuildsTheFilm")}
        </Text>
        <Text component="p" size="normal" className="subhead">
          Describe your idea. The agent writes the script, boards every scene,
          generates the footage, and cuts a multi-track timeline you can still
          edit.
        </Text>
      </div>

      <GoogleAuthButton />

      <div className="footnotes">
        <Caption size="small" color="secondary">
          {i18n.t("editor:ui.bringYourOwnKeysYouPayEveryProviderDirectlyAtTheirPublishedPrices")}
        </Caption>
        <Caption size="small" color="secondary">
          {i18n.t("editor:ui.cloudIsInAlphaExpectRoughEdgesAndOccasionalDowntime")}{" "}
          <ExternalLink href={STUDIO_URL} size="small" iconVariant="arrow">
            {i18n.t("editor:ui.runNodeToolStudioOnYourOwnMachine")}
          </ExternalLink>
          .
        </Caption>
      </div>
    </Box>
  );
}

export default memo(Login);
