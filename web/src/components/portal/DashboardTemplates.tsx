/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import type { Theme } from "@mui/material/styles";
import { useTheme } from "@mui/material/styles";
import { memo, useMemo, useRef, useState } from "react";
import { formatUsd } from "@nodetool-ai/model-pricing";
import type { WorkflowCostEstimateDetail } from "@nodetool-ai/node-sdk/cost-estimate";
import { useGlobalCombo } from "../../stores/KeyPressedStore";
import { useQuery } from "@tanstack/react-query";
import type { NodeMetadata, Workflow, WorkflowList as WorkflowListType } from "../../stores/ApiTypes";
import useMetadataStore from "../../stores/MetadataStore";
import { useWorkflowManager } from "../../contexts/WorkflowManagerContext";
import { useWorkflowActions } from "../../hooks/useWorkflowActions";
import { BASE_URL } from "../../stores/BASE_URL";
import { estimateGraphCost } from "../../hooks/useGraphCostEstimate";
import { i18n, useAppLanguage } from "../../i18n";
import {
  workflowTemplateCopy,
  workflowTemplateSearchAlias
} from "../../i18n/workflowTemplateCopy";
import {
  TOP_CATEGORIES,
  workflowsForCategory,
  isGettingStarted,
  getCategoryForWorkflow
} from "../../utils/templateCategories";
import {
  EmptyState,
  LoadingSpinner,
  MOTION,
  BORDER_RADIUS,
  SPACING,
  Z_INDEX,
  getSpacingPx
} from "../ui_primitives";
import {
  useSectionWrap,
  SectionHeader,
  DashboardSearchBox,
  SectionLink
} from "./dashboardChrome";
import {
  CompatibilityDetails,
  getWorkflowCompatibility
} from "./entryCompatibility";
import { useTranslation } from "react-i18next";

/** Rows shown on the dashboard before the user searches or opens /examples. */
const MAX_VISIBLE = 18;

/** Anchor the dashboard checklist scrolls to for its "open a template" step. */
const DASHBOARD_TEMPLATES_SECTION_ID = "dashboard-templates";

const styles = (theme: Theme) =>
  css({
    paddingTop: getSpacingPx(SPACING.md),
    ".cats": {
      display: "flex",
      flexWrap: "wrap",
      gap: getSpacingPx(SPACING.micro),
      paddingBottom: getSpacingPx(SPACING.sm)
    },
    ".cat": {
      display: "inline-flex",
      alignItems: "center",
      gap: getSpacingPx(SPACING.xs),
      height: 26,
      padding: `0 ${getSpacingPx(SPACING.sm)}`,
      background: theme.vars.palette.c_node_bg,
      border: `1px solid ${theme.vars.palette.divider}`,
      borderRadius: BORDER_RADIUS.pill,
      color: theme.vars.palette.text.secondary,
      fontSize: "var(--fontSizeSmaller)",
      cursor: "pointer",
      transition: `background ${MOTION.fast}, color ${MOTION.fast}, border-color ${MOTION.fast}`,
      "&:hover": { color: theme.vars.palette.text.primary },
      // Neutral "All" active state; category pills override colours inline.
      "&.on": {
        background: theme.vars.palette.c_node_bg_group,
        borderColor: `rgba(${theme.vars.palette.primary.mainChannel} / 0.5)`,
        color: theme.vars.palette.text.primary
      }
    },
    ".cat-dot": {
      width: 7,
      height: 7,
      borderRadius: BORDER_RADIUS.circle,
      flexShrink: 0
    },
    ".tpl-list": {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))",
      gap: getSpacingPx(SPACING.md),
      paddingBottom: getSpacingPx(SPACING.sm)
    },
    ".tpl-row": {
      display: "flex",
      flexDirection: "column",
      alignItems: "stretch",
      minWidth: 0,
      textAlign: "left",
      padding: 0,
      background: theme.vars.palette.c_node_bg,
      border: `1px solid ${theme.vars.palette.divider}`,
      borderRadius: BORDER_RADIUS.lg,
      cursor: "pointer",
      overflow: "hidden",
      transition: `border-color ${MOTION.fast}, background ${MOTION.fast}`,
      "&:hover": {
        borderColor: `rgba(${theme.vars.palette.primary.mainChannel} / 0.5)`,
        background: theme.vars.palette.action.hover
      },
      "&.loading": { cursor: "wait", pointerEvents: "none" }
    },
    ".tpl-icon": {
      display: "grid",
      placeItems: "center",
      width: "100%",
      aspectRatio: "16 / 9",
      background: `rgba(${theme.vars.palette.primary.mainChannel} / 0.12)`,
      color: theme.vars.palette.primary.main,
      overflow: "hidden"
    },
    ".tpl-glyph": { width: 28, height: 28 },
    ".tpl-thumb": {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    },
    ".tpl-title": {
      display: "block",
      fontSize: "var(--fontSizeNormal)",
      color: theme.vars.palette.text.primary,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    },
    ".tpl-desc": {
      fontSize: "var(--fontSizeSmaller)",
      color: theme.vars.palette.text.secondary,
      overflow: "hidden",
      textOverflow: "ellipsis",
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      whiteSpace: "normal"
    },
    ".tpl-copy": {
      display: "flex",
      flexDirection: "column",
      gap: getSpacingPx(SPACING.xs),
      flex: 1,
      minWidth: 0,
      width: "100%",
      padding: getSpacingPx(SPACING.md)
    },
    ".tpl-compat": {
      display: "grid",
      gap: getSpacingPx(SPACING.micro),
      paddingTop: getSpacingPx(SPACING.xs),
      fontFamily: theme.fontFamily2,
      fontSize: "var(--fontSizeSmaller)",
      lineHeight: 1.4,
      color: theme.vars.palette.text.disabled,
      "& .entry-compat": {
        display: "grid",
        gap: getSpacingPx(SPACING.micro)
      }
    },
    ".tpl-cat": {
      flexShrink: 0,
      display: "inline-flex",
      alignSelf: "flex-start",
      alignItems: "center",
      gap: getSpacingPx(SPACING.xs),
      fontFamily: theme.fontFamily2,
      fontSize: "var(--fontSizeSmaller)",
      color: theme.vars.palette.text.disabled
    },
    ".tpl-loading, .tpl-empty": {
      display: "flex",
      justifyContent: "center",
      padding: `${getSpacingPx(SPACING.xxl)} 0`,
      color: theme.vars.palette.text.secondary,
      fontSize: "var(--fontSizeNormal)"
    }
  });

// In full-page (/examples) mode the section flows inline in the padded
// manager layout, which owns the scroll. The viewport-owning variant
// (flex:1 + minHeight:0 + inner overflow) collapses to a sliver when a
// sibling section sits above it inside the scrolling content area.
// The controls band (title + search + category pills) pins to the top of
// that scroll container once scrolled past. Sticky `top: 0` alone lands at
// the container's CONTENT-box top — the padded scroll container keeps its
// 12px (SPACING.lg, = ManagerPageLayout's theme.spacing(3) top padding)
// visible above the pin, and rows would peek through that strip above the
// band. So the sticky offset goes negative to own that strip, and the space
// comes back as internal padding: pinned flush with the visible top edge,
// opaque over the full strip, divider separating band from list. Dashboard
// (non-fullPage) rendering never sees these styles — the .tpl-head wrapper
// is an inert plain div there.
const fullPageStyles = (theme: Theme) =>
  css({
    paddingTop: getSpacingPx(SPACING.xxl),
    paddingBottom: getSpacingPx(SPACING.xxxl),
    ".tpl-head": {
      position: "sticky",
      // Sticky `top: 0` pins at the scroll container's CONTENT-box top
      // (Chrome keeps the padded container's 12px top padding above the
      // pin), which would leave rows peeking through that strip above the
      // band. Offset the pin up through the padding so the opaque band owns
      // the strip, and hand the space back as internal padding. SPACING.lg
      // (12px) = ManagerPageLayout's theme.spacing(3) top padding; expressed
      // through the --spacing-lg token because stylis drops literal negative
      // `top` values while var()-based ones compile (verified in-browser).
      top: "calc(-1 * var(--spacing-lg))",
      paddingTop: getSpacingPx(SPACING.lg),
      zIndex: Z_INDEX.sticky,
      background: theme.vars.palette.background.default,
      borderBottom: `1px solid ${theme.vars.palette.divider}`
    }
  });

/** Stand-in when a template ships no thumbnail (or it fails to load). */
const templateGlyph = (
  <svg
    width="13"
    height="13"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
    <path d="M2.5 6.5h11M6.5 6.5v7" />
  </svg>
);

interface TemplateRowProps {
  workflow: Workflow;
  metadata: Record<string, NodeMetadata>;
  isLoading: boolean;
  onClick: (workflow: Workflow) => void;
}

const formatTemplateCost = (estimate: WorkflowCostEstimateDetail): string => {
  if (estimate.unknown_count === 0) {
    return i18n.t("editor:ui.estimatedCost", { v: formatUsd(estimate.total) });
  }

  const unknownNodes = i18n.t(
    estimate.unknown_count === 1
      ? "editor:ui.nodeHasNoPublishedPrice"
      : "editor:ui.nodesHaveNoPublishedPrice",
    { n: estimate.unknown_count }
  );
  return estimate.total > 0
    ? i18n.t("editor:ui.estimatedCostAtLeast", { cost: formatUsd(estimate.total), unknown: unknownNodes })
    : i18n.t("editor:ui.estimatedCostUnknown", { unknown: unknownNodes });
};

const TemplateRow = memo(function TemplateRow({
  workflow,
  metadata,
  isLoading,
  onClick
}: TemplateRowProps) {
  const { t } = useTranslation();
  const [thumbFailed, setThumbFailed] = useState(false);
  const category = getCategoryForWorkflow(workflow);
  // Render-time zh overlay resolution (r28): English and zh-missing ids fall
  // back to the backend values; the useTranslation subscription above is the
  // re-render anchor that re-reads this on a language switch (F-26).
  const copy = workflowTemplateCopy(workflow);

  // The server sets thumbnail_url only when the image exists (with an
  // md5-based ?v=<hash> cache buster), so a missing one means there is
  // nothing to request — guessing a URL just logs a 404 per row.
  const thumbUrl = useMemo(() => {
    const url = workflow.thumbnail_url;
    if (!url) {
      return null;
    }
    return url.startsWith("http") ? url : `${BASE_URL}${url}`;
  }, [workflow.thumbnail_url]);
  const compatibility = useMemo(
    () => getWorkflowCompatibility(workflow, metadata),
    [workflow, metadata]
  );
  const costEstimate = useMemo(
    () =>
      estimateGraphCost(workflow.graph.nodes, (nodeType) => metadata[nodeType]),
    [workflow.graph.nodes, metadata]
  );

  return (
    <button
      type="button"
      className={isLoading ? "tpl-row loading" : "tpl-row"}
      title={copy.description || copy.name}
      onClick={() => onClick(workflow)}
    >
      <span
        className="tpl-icon"
        aria-hidden
        style={
          category && (!thumbUrl || thumbFailed)
            ? { background: `${category.color}24`, color: category.color }
            : undefined
        }
      >
        {isLoading ? (
          <LoadingSpinner size="small" />
        ) : !thumbUrl || thumbFailed ? (
          <span className="tpl-glyph">{templateGlyph}</span>
        ) : (
          <img
            className="tpl-thumb"
            src={thumbUrl}
            alt=""
            loading="lazy"
            onError={() => setThumbFailed(true)}
          />
        )}
      </span>
      <span className="tpl-copy">
        <span className="tpl-title">{copy.name}</span>
        <span className="tpl-desc">{copy.description}</span>
        <span className="tpl-compat">
          <CompatibilityDetails compatibility={compatibility} />
          {workflow.graph.nodes.length > 0 && (
            <>
              <span>{t("editor:ui.durationUnknownExecutionTimeIsNotDeclared", { defaultValue: "Duration: unknown — execution time is not declared" })}</span>
              <span>{formatTemplateCost(costEstimate)}</span>
            </>
          )}
        </span>
        {category && (
          <span className="tpl-cat">
            <span className="cat-dot" style={{ background: category.color }} />
            {category.label}
          </span>
        )}
      </span>
      {category && (
        <span className="tpl-cat">
          <span className="cat-dot" style={{ background: category.color }} />
          {category.labelKey
            ? t(category.labelKey, { defaultValue: category.label })
            : category.label}
        </span>
      )}
    </button>
  );
});

interface DashboardTemplatesProps {
  /**
   * Render as the standalone /examples page: show every example (no cap),
   * and drop the dashboard-only "Browse all"/"More…" links.
   */
  fullPage?: boolean;
}

const DashboardTemplates: React.FC<DashboardTemplatesProps> = ({
  fullPage = false
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const sectionWrap = useSectionWrap();
  const { version: languageVersion } = useAppLanguage();
  const metadata = useMetadataStore((state) => state.metadata);
  const loadTemplates = useWorkflowManager((state) => state.loadTemplates);
  const { handleExampleClick, handleViewAllTemplates, loadingExampleId } =
    useWorkflowActions();

  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // The search box advertises "/" as a shortcut; make it work. The store gates
  // it: nothing editable focused, and this input can actually take focus.
  useGlobalCombo("/", () => searchRef.current?.focus(), {
    target: () => searchRef.current
  });

  const { data, isLoading, isError, refetch } = useQuery<WorkflowListType>({
    queryKey: ["templates"],
    queryFn: loadTemplates
  });

  const allTemplates = useMemo(() => data?.workflows ?? [], [data]);

  const filtered = useMemo(() => {
    const base =
      category === "all"
        ? allTemplates
        : workflowsForCategory(allTemplates, category);

    const q = query.trim().toLowerCase();
    const searched = q
      ? base.filter((w) => {
          // Bilingual search: the English fields keep their original weights,
          // and the zh overlay copy joins as an alias field (F-32 rule ③).
          const haystack = [w.name, w.description, ...(w.tags ?? [])]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          const alias = workflowTemplateSearchAlias(w.id).toLowerCase();
          return `${haystack} ${alias}`.includes(q);
        })
      : base;

    // Surface getting-started picks first when browsing everything unfiltered.
    return [...searched].sort((a, b) => {
      if (category === "all" && !q) {
        const ga = isGettingStarted(a) ? 0 : 1;
        const gb = isGettingStarted(b) ? 0 : 1;
        if (ga !== gb) return ga - gb;
      }
      return a.name.localeCompare(b.name);
    });
  }, [allTemplates, category, query, languageVersion]);

  const visible = fullPage ? filtered : filtered.slice(0, MAX_VISIBLE);
  const countLabel = fullPage
    ? t("editor:ui.nExamples", { n: filtered.length })
    : visible.length === filtered.length
      ? `${filtered.length}`
      : t("editor:ui.nOfMExamples", { shown: visible.length, total: filtered.length });

  return (
    <section
      id={DASHBOARD_TEMPLATES_SECTION_ID}
      css={fullPage ? [styles(theme), fullPageStyles(theme)] : styles(theme)}
    >
      <div css={sectionWrap}>
        {/* The header + search + category pills travel together as one
            band so the fullPage sticky scope can pin all three rows. */}
        <div className="tpl-head">
          <SectionHeader title={t("editor:ui.startFromATemplate", { defaultValue: "Start from a template" })} count={countLabel}>
            <DashboardSearchBox
              ref={searchRef}
              value={query}
              onChange={setQuery}
              placeholder={t("editor:ui.searchTemplatesByNameTag", { defaultValue: "Search templates by name, tag…" })}
              kbd="/"
              aria-label={t("editor:ui.searchTemplates", { defaultValue: "Search templates" })}
            />
            {!fullPage && (
              <SectionLink onClick={handleViewAllTemplates}>
                {t("editor:ui.browseAll", { defaultValue: "Browse all" })}
              </SectionLink>
            )}
          </SectionHeader>

          <div className="cats" role="group" aria-label={t("editor:ui.filterByCategory", { defaultValue: "Filter by category" })}>
            <button
              type="button"
              className={`cat${category === "all" ? " on" : ""}`}
              aria-pressed={category === "all"}
              onClick={() => setCategory("all")}
            >
              {t("editor:ui.catAll")}
            </button>
            {TOP_CATEGORIES.map((cat) => {
              const active = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`cat${active ? " on" : ""}`}
                  aria-pressed={active}
                  onClick={() => setCategory(cat.id)}
                  style={
                    active
                      ? {
                          background: `${cat.color}24`,
                          borderColor: `${cat.color}73`,
                          color: cat.color
                        }
                      : undefined
                  }
                >
                  <span className="cat-dot" style={{ background: cat.color }} />
                  {cat.labelKey
                    ? t(cat.labelKey, { defaultValue: cat.label })
                    : cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="tpl-loading">
            <LoadingSpinner size="medium" text={t("editor:ui.loadingTemplates")} />
          </div>
        ) : isError ? (
          <div className="tpl-empty">
            <EmptyState
              variant="error"
              title={t("editor:ui.couldntLoadTemplates", { defaultValue: "Couldn't load templates" })}
              description={t("editor:ui.tryAgainInAMoment")}
              actionText={t("editor:explorer.retry", { defaultValue: "Retry" })}
              onAction={() => refetch()}
            />
          </div>
        ) : visible.length === 0 ? (
          <div className="tpl-empty">
            {query.trim() ? (
              <EmptyState
                variant="no-results"
                title={t("editor:ui.noTemplatesMatchYourSearch", { defaultValue: "No templates match your search" })}
                description={t("editor:ui.tryADifferentSearchTerm")}
                actionText={t("editor:ui.clearSearch", { defaultValue: "Clear search" })}
                onAction={() => setQuery("")}
              />
            ) : category !== "all" ? (
              <EmptyState
                variant="no-results"
                title={t("editor:ui.noTemplatesInThisCategory", { defaultValue: "No templates in this category" })}
                actionText={t("editor:ui.showAllTemplates", { defaultValue: "Show all templates" })}
                onAction={() => setCategory("all")}
              />
            ) : (
              <EmptyState
                variant="no-data"
                title={t("editor:ui.noTemplatesAvailable", { defaultValue: "No templates available" })}
                description={t("editor:ui.templatesWillAppearHereWhenAvailable")}
              />
            )}
          </div>
        ) : (
          <div className="tpl-list">
            {visible.map((workflow: Workflow) => (
              <TemplateRow
                key={workflow.id}
                workflow={workflow}
                metadata={metadata}
                isLoading={loadingExampleId === workflow.id}
                onClick={handleExampleClick}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default memo(DashboardTemplates);
