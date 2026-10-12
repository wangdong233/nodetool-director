/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { useTheme, type Theme } from "@mui/material/styles";
import { lazy, memo, Suspense, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { ExampleGameSummary } from "@nodetool-ai/protocol/game.js";
import {
  useExampleGames,
  useInstallExampleGame
} from "../../hooks/useExampleGames";
import { useNotificationStore } from "../../stores/NotificationStore";
import {
  creationProjectId,
  useWorkspaceTabsStore
} from "../../stores/WorkspaceTabsStore";
import {
  Box,
  FlexRow,
  BORDER_RADIUS,
  Caption,
  EditorButton,
  EmptyState,
  FlexColumn,
  LoadingSpinner,
  PADDING,
  ResponsiveImage,
  SPACING,
  Text,
  getSpacingPx
} from "../ui_primitives";
import { SectionHeader, useSectionWrap } from "./dashboardChrome";

const ExampleGamePlayView = lazy(() => import("./ExampleGamePlayView"));

const styles = (theme: Theme) =>
  css({
    paddingTop: getSpacingPx(SPACING.xxl),
    paddingBottom: getSpacingPx(SPACING.xxxl),
    ".game-grid": {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
      gap: getSpacingPx(SPACING.md)
    },
    ".game-card": {
      minWidth: 0,
      overflow: "hidden",
      border: `1px solid ${theme.vars.palette.divider}`,
      borderRadius: BORDER_RADIUS.lg,
      background: theme.vars.palette.c_node_bg
    },
    ".game-poster": { background: theme.vars.palette.common.black }
  });

interface GameCardProps {
  game: ExampleGameSummary;
  installing: boolean;
  onPlay: (game: ExampleGameSummary) => void;
  onInstall: (game: ExampleGameSummary) => void;
}

const GameCard = memo(function GameCard({
  game,
  installing,
  onInstall,
  onPlay
}: GameCardProps) {
  const { t } = useTranslation();
  const handleClick = useCallback(() => onInstall(game), [game, onInstall]);
  return (
    <article className="game-card">
      <ResponsiveImage
        className="game-poster"
        locator={game.posterUri}
        alt={t("editor:ui.gameplayAria", { defaultValue: "{{name}} gameplay", name: game.name })}
        aspectRatio="16/9"
        loading="lazy"
      />
      <FlexColumn gap={SPACING.xs} padding={PADDING.normal}>
        <Text size="normal">{game.name}</Text>
        <Caption size="smaller" color="secondary">
          {game.description}
        </Caption>
        <Caption size="smaller" color="muted">
          {game.controls}
        </Caption>
        <FlexRow gap={SPACING.sm}>
          <EditorButton
            density="compact"
            variant="contained"
            onClick={() => onPlay(game)}
          >
            {t("game:toolbar.play", { defaultValue: "Play" })}
          </EditorButton>
          <EditorButton
            variant="outlined"
            density="compact"
            disabled={installing}
            onClick={handleClick}
            sx={{ alignSelf: "flex-start" }}
          >
            {installing
              ? t("editor:ui.addingGame", { defaultValue: "Adding game…" })
              : t("editor:ui.installGame", { defaultValue: "Install game" })}
          </EditorButton>
        </FlexRow>
      </FlexColumn>
    </article>
  );
});

const DashboardExampleGames = () => {
  const { t } = useTranslation();
  const [playingGame, setPlayingGame] = useState<ExampleGameSummary | null>(
    null
  );
  const handlePlay = useCallback(
    (game: ExampleGameSummary) => setPlayingGame(game),
    []
  );
  const theme = useTheme();
  const sectionWrap = useSectionWrap();
  const navigate = useNavigate();
  const openTab = useWorkspaceTabsStore((state) => state.openTab);
  const addNotification = useNotificationStore(
    (state) => state.addNotification
  );
  const { data, isLoading, isError, refetch } = useExampleGames();
  const install = useInstallExampleGame();

  const handleInstall = useCallback(
    (game: ExampleGameSummary) => {
      if (install.isPending) return;
      install.mutate(
        { slug: game.slug, projectId: creationProjectId() },
        {
          onSuccess: (created) => {
            openTab({
              type: "game",
              ref: created.game.id,
              mode: "view",
              title: created.game.name,
              projectId: created.game.projectId
            });
            navigate("/workspace");
          },
          onError: (error) => {
            addNotification({
              type: "error",
              alert: true,
              content: t("editor:ui.couldntAddNameError", {
                defaultValue: "Couldn't add {{name}}: {{error}}",
                name: game.name,
                error: error.message
              })
            });
          }
        }
      );
    },
    [addNotification, install, navigate, openTab, t]
  );

  const games = data ?? [];
  return (
    <section css={styles(theme)} aria-label={t("editor:ui.exampleGames", { defaultValue: "Example games" })}>
      <div css={sectionWrap}>
        <SectionHeader
          title={t("editor:ui.startFromAGame", { defaultValue: "Start from a game" })}
          count={t("editor:ui.gamesCount", { defaultValue: "{{count}} games", count: String(games.length) })}
        />
        <Caption
          size="small"
          color="secondary"
          sx={{ marginBottom: getSpacingPx(SPACING.sm) }}
        >
          {t("editor:ui.playAGameDirectlyOrInstallACopyToChangeItsArtLevelsAndRules", {
            defaultValue:
              "Play a game directly, or install a copy to change its art, levels and rules."
          })}
        </Caption>
        {playingGame && (
          <FlexColumn gap={SPACING.md} sx={{ mb: SPACING.xl }}>
            <EditorButton
              onClick={() => setPlayingGame(null)}
              sx={{ alignSelf: "flex-end" }}
            >
              {t("editor:ui.closeGame", { defaultValue: "Close game" })}
            </EditorButton>
            <Box sx={{ aspectRatio: "16 / 9", position: "relative" }}>
              <Box sx={{ position: "absolute", inset: 0 }}>
                <Suspense fallback={<LoadingSpinner text={t("editor:ui.loadingGame", { defaultValue: "Loading game" })} />}>
                  <ExampleGamePlayView
                    key={playingGame.slug}
                    slug={playingGame.slug}
                  />
                </Suspense>
              </Box>
            </Box>
          </FlexColumn>
        )}
        {playingGame ? null : isLoading ? (
          <FlexColumn align="center" padding={PADDING.spacious}>
            <LoadingSpinner size="medium" text={t("editor:ui.loadingGames", { defaultValue: "Loading games" })} />
          </FlexColumn>
        ) : isError ? (
          <EmptyState
            variant="error"
            title={t("editor:ui.couldntLoadGames", { defaultValue: "Couldn't load games" })}
            description={t("editor:ui.tryAgainInAMoment", { defaultValue: "Try again in a moment." })}
            actionText={t("editor:explorer.retry", { defaultValue: "Retry" })}
            onAction={() => refetch()}
          />
        ) : games.length === 0 ? (
          <EmptyState
            variant="no-data"
            title={t("editor:ui.noGamesAvailable", { defaultValue: "No games available" })}
            description={t("editor:ui.exampleGamesWillAppearHereWhenThisInstallShipsThem", {
              defaultValue: "Example games will appear here when this install ships them."
            })}
          />
        ) : (
          <div className="game-grid">
            {games.map((game) => (
              <GameCard
                key={game.slug}
                game={game}
                installing={
                  install.isPending && install.variables?.slug === game.slug
                }
                onInstall={handleInstall}
                onPlay={handlePlay}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default memo(DashboardExampleGames);
