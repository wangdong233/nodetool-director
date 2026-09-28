/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { alpha, type Theme } from "@mui/material/styles";
import { useTheme } from "@mui/material/styles";
import { memo, useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNotificationStore } from "../../stores/NotificationStore";
import { i18n, useAppLanguage } from "../../i18n";
import {
  creationProjectId,
  useWorkspaceTabsStore
} from "../../stores/WorkspaceTabsStore";
import { BASE_URL } from "../../stores/BASE_URL";
import {
  installExampleApp,
  listExampleApps,
  type ExampleAppSummary
} from "../../utils/exampleApps";
import {
  BORDER_RADIUS,
  EditorButton,
  EmptyState,
  GAP,
  LoadingSpinner,
  MOTION,
  SPACING,
  getSpacingPx
} from "../ui_primitives";
import { useSectionWrap, SectionHeader } from "./dashboardChrome";

/** Query key for the shipped example apps, shared with any invalidation. */
export const EXAMPLE_APPS_QUERY_KEY = ["applications", "examples"] as const;

const styles = (theme: Theme, compact: boolean) =>
  css({
    paddingTop: compact ? 0 : getSpacingPx(SPACING.xxl),
    ".sec-title h2": compact ? { fontSize: "var(--fontSizeNormal)" } : {},
    ".apps-lede": {
      margin: `0 0 ${getSpacingPx(SPACING.sm)}`,
      fontSize: "var(--fontSizeSmall)",
      color: theme.vars.palette.text.secondary
    },
    ".apps-strip": {
      display: "grid",
      gridTemplateColumns: compact
        ? "repeat(auto-fill, minmax(min(100%, 190px), 1fr))"
        : "repeat(auto-fit, minmax(220px, 1fr))",
      gap: getSpacingPx(compact ? GAP.comfortable : SPACING.md),
      paddingBottom: getSpacingPx(SPACING.sm)
    },
    ".app-card": {
      display: "flex",
      flexDirection: "column",
      textAlign: "left",
      padding: 0,
      background: theme.vars.palette.c_node_bg,
      border: `1px solid ${theme.vars.palette.divider}`,
      borderRadius: BORDER_RADIUS.lg,
      color: theme.vars.palette.text.primary,
      cursor: "pointer",
      overflow: "hidden",
      minWidth: 0,
      ...(compact && { position: "relative", aspectRatio: "16 / 9" }),
      transition: `border-color ${MOTION.fast}, background ${MOTION.fast}`,
      "&:hover": {
        borderColor: `rgba(${theme.vars.palette.primary.mainChannel} / 0.5)`,
        background: theme.vars.palette.action.hover
      },
      "&.installing": { cursor: "wait", pointerEvents: "none" }
    },
    ".app-thumb": {
      position: "relative",
      display: "grid",
      placeItems: "center",
      width: "100%",
      aspectRatio: "16 / 9",
      background: theme.vars.palette.c_node_bg_group,
      color: theme.vars.palette.primary.main,
      overflow: "hidden",
      ...(compact && { position: "absolute", inset: 0, height: "100%" }),
      img: {
        width: "100%",
        height: "100%",
        objectFit: "cover"
      }
    },
    ".app-body": {
      display: "flex",
      flexDirection: "column",
      gap: getSpacingPx(SPACING.xs),
      padding: getSpacingPx(SPACING.md),
      ...(compact && {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        color: theme.vars.palette.common.white,
        background: `linear-gradient(to top, ${alpha(theme.palette.common.black, 0.82)}, ${alpha(theme.palette.common.black, 0)})`
      })
    },
    ".app-name": {
      fontSize: "var(--fontSizeNormal)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      ...(compact && { color: "inherit" })
    },
    ".app-desc": {
      fontSize: "var(--fontSizeSmaller)",
      color: compact ? "inherit" : theme.vars.palette.text.secondary,
      display: "-webkit-box",
      WebkitLineClamp: compact ? 1 : 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden"
    },
    ".app-meta": {
      fontFamily: theme.fontFamily2,
      fontSize: "var(--fontSizeSmaller)",
      color: theme.vars.palette.text.disabled,
      ...(compact && { display: "none" })
    },
    ".apps-loading, .apps-empty": {
      display: "flex",
      justifyContent: "center",
      padding: `${getSpacingPx(SPACING.xl)} 0`,
      color: theme.vars.palette.text.secondary,
      fontSize: "var(--fontSizeNormal)"
    }
  });

/** Stand-in when an app's first workflow ships no gallery art. */
const appGlyph = (
  <svg
    width="28"
    height="28"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
  >
    <rect x="2" y="2" width="12" height="12" rx="2" />
    <path d="M2 6h12M6 6v8" />
  </svg>
);

const thumbSrc = (url: string | null): string | null => {
  if (!url) return null;
  return url.startsWith("http") ? url : `${BASE_URL}${url}`;
};

interface ExampleAppCardProps {
  app: ExampleAppSummary;
  installing: boolean;
  onInstall: (app: ExampleAppSummary) => void;
}

const ExampleAppCard = memo(function ExampleAppCard({
  app,
  installing,
  onInstall
}: ExampleAppCardProps) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const src = thumbSrc(app.thumbnailUrl);
  const workflows = app.workflows.length;
  return (
    <button
      type="button"
      className={installing ? "app-card installing" : "app-card"}
      title={i18n.t("home:apps.addTitle", { defaultValue: "Add {{name}} to your apps", name: app.name })}
      aria-busy={installing}
      onClick={() => onInstall(app)}
    >
      <span className="app-thumb" aria-hidden>
        {installing ? (
          <LoadingSpinner size="medium" />
        ) : src && !thumbFailed ? (
          <img
            src={src}
            alt=""
            loading="lazy"
            onError={() => setThumbFailed(true)}
          />
        ) : (
          appGlyph
        )}
      </span>
      <span className="app-body">
        <span className="app-name">{app.name}</span>
        <span className="app-desc">{app.description}</span>
        <span className="app-meta">
          {workflows} workflow{workflows === 1 ? "" : "s"}
        </span>
      </span>
    </button>
  );
});

interface DashboardExampleAppsProps {
  /** Show a small entry-point selection instead of the full catalog. */
  compact?: boolean;
  onBrowseAll?: () => void;
}

/**
 * The shipped example apps. Clicking one installs it (the app plus the
 * workflows it binds) and opens it.
 */
const DashboardExampleApps: React.FC<DashboardExampleAppsProps> = ({
  compact = false,
  onBrowseAll
}) => {
  const theme = useTheme();
  const sectionWrap = useSectionWrap();
  const queryClient = useQueryClient();
  const openTab = useWorkspaceTabsStore((state) => state.openTab);
  const addNotification = useNotificationStore(
    (state) => state.addNotification
  );

  // Subscribe so catalog reads re-render on language change.
  useAppLanguage();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: EXAMPLE_APPS_QUERY_KEY,
    queryFn: listExampleApps,
    staleTime: Infinity
  });

  const install = useMutation({
    mutationFn: async (app: ExampleAppSummary) => {
      const projectId = creationProjectId();
      return { projectId, created: await installExampleApp(app.slug, projectId) };
    },
    onSuccess: async ({ projectId, created }) => {
      await queryClient.invalidateQueries({ queryKey: ["applications"] });
      await queryClient.invalidateQueries({ queryKey: ["workflows"] });
      openTab({
        type: "application",
        ref: created.id,
        mode: "view",
        title: created.name,
        projectId
      });
      addNotification({
        type: "success",
        alert: true,
        content: i18n.t("home:apps.added", { defaultValue: "Added \"{{name}}\" to your apps", name: created.name })
      });
    },
    onError: (error: unknown, app) => {
      addNotification({
        type: "error",
        alert: true,
        content: i18n.t("home:apps.addFailed", { defaultValue: "Couldn't add {{name}}: {{error}}", name: app.name, error: error instanceof Error ? error.message : i18n.t("editor:ui.unknownError", { defaultValue: "Unknown error" }) })
      });
    }
  });

  const handleInstall = useCallback(
    (app: ExampleAppSummary) => {
      if (install.isPending) return;
      install.mutate(app);
    },
    [install]
  );

  const apps = data ?? [];
  const installingSlug = install.isPending ? install.variables?.slug : null;
  const countLabel = i18n.t(
    apps.length === 1 ? "home:apps.countOne" : "home:apps.countMany",
    { defaultValue: `${apps.length} app${apps.length === 1 ? "" : "s"}`, count: String(apps.length) }
  );
  const visibleApps = compact ? apps.slice(0, 4) : apps;

  return (
    <section css={styles(theme, compact)} aria-labelledby="dashboard-example-apps-title">
      <div css={compact ? css({ maxWidth: "none", padding: 0 }) : sectionWrap}>
        <SectionHeader title={i18n.t("home:apps.title", { defaultValue: "Start from an app" })} count={countLabel}>
          {compact && onBrowseAll && apps.length > visibleApps.length && (
            <EditorButton variant="text" density="compact" onClick={onBrowseAll}>
              {i18n.t("home:apps.seeAll", { defaultValue: "See all apps" })}
            </EditorButton>
          )}
        </SectionHeader>
        <p className="apps-lede">
          {i18n.t("home:apps.lede", { defaultValue: "One upload, a few choices, one result. Adding an app also adds the workflows it runs, so you can open the graph behind any of them." })}
        </p>
        {isLoading ? (
          <div className="apps-loading">
            <LoadingSpinner size="medium" text={i18n.t("editor:ui.loadingApps")} />
          </div>
        ) : isError ? (
          <div className="apps-empty">
            <EmptyState
              variant="error"
              title={i18n.t("editor:ui.couldntLoadApps", { defaultValue: "Couldn't load apps" })}
              description={i18n.t("editor:ui.tryAgainInAMoment")}
              actionText={i18n.t("editor:explorer.retry", { defaultValue: "Retry" })}
              onAction={() => refetch()}
            />
          </div>
        ) : apps.length === 0 ? (
          <div className="apps-empty">
            <EmptyState
              variant="no-data"
              title={i18n.t("editor:ui.noAppsAvailable", { defaultValue: "No apps available" })}
              description={i18n.t("editor:ui.exampleAppsWillAppearHereWhenTheServerShipsThem")}
            />
          </div>
        ) : (
          <div className="apps-strip">
            {visibleApps.map((app) => (
              <ExampleAppCard
                key={app.slug}
                app={app}
                installing={installingSlug === app.slug}
                onInstall={handleInstall}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default memo(DashboardExampleApps);
