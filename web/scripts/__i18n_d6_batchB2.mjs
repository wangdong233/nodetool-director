// Batch B2 — group 3: APIKeysTab + ClipMaskMatte + StoryboardBoard long-form sites.
import { readFileSync, writeFileSync } from "node:fs";

const edits = [
  // ───────────────────────── APIKeysTab.tsx ─────────────────────────
  ["src/components/menus/APIKeysTab.tsx",
   `{oauth.isConnecting
                  ? "Connecting…"
                  : \`Sign in with \${meta.name}\`}`,
   `{oauth.isConnecting
                  ? i18n.t("editor:ui.connecting", { defaultValue: "Connecting…" })
                  : i18n.t("editor:ui.signInWith", { defaultValue: "Sign in with {{name}}", name: meta.name })}`, 1],
  ["src/components/menus/APIKeysTab.tsx",
   `{testing ? "Testing…" : "Test"}`,
   `{testing ? i18n.t("editor:ui.testing", { defaultValue: "Testing…" }) : i18n.t("editor:ui.test", { defaultValue: "Test" })}`, 1],
  ["src/components/menus/APIKeysTab.tsx",
   `aria-label={\`Delete \${meta.name} API key\`}`,
   `aria-label={i18n.t("editor:ui.deleteNameApiKey", { defaultValue: "Delete {{name}} API key", name: meta.name })}`, 1],
  ["src/components/menus/APIKeysTab.tsx",
   `  advanced: "Services & Advanced"
} satisfies Record<string, string>;`,
   `  advanced: "Services & Advanced"
} satisfies Record<string, string>;

// labelKey pattern (registry §5): the English table stays as the defaultValue
// anchor; the consumer resolves per-language at render time.
const SECTION_TITLE_KEYS: Record<keyof typeof SECTION_TITLES, string> = {
  popular: "editor:ui.popular",
  language: "tools:menus.languageModels",
  media: "tools:menus.mediaGeneration",
  gateways: "tools:menus.gatewaysAndHubs",
  search: "tools:menus.webSearch",
  compute: "tools:menus.computeAndLocal",
  advanced: "tools:menus.servicesAndAdvanced"
};`, 1],
  ["src/components/menus/APIKeysTab.tsx",
   `const sectionTitle = SECTION_TITLES[sectionKey];`,
   `const sectionTitle = i18n.t(SECTION_TITLE_KEYS[sectionKey], { defaultValue: SECTION_TITLES[sectionKey] });`, 1],
  ["src/components/menus/APIKeysTab.tsx",
   `content: \`\${meta?.name || editingSecret.key} API key updated\`,`,
   `content: i18n.t("tools:menus.nameApiKeyUpdated", {
            defaultValue: "{{name}} API key updated",
            name: meta?.name || editingSecret.key
          }),`, 1],
  ["src/components/menus/APIKeysTab.tsx",
   "content: `Failed to update secret: ${err instanceof Error ? err.message : String(err)}`,",
   `content: i18n.t("tools:menus.failedToUpdateSecret", {
            defaultValue: "Failed to update secret: {{error}}",
            error: err instanceof Error ? err.message : String(err)
          }),`, 1],
  ["src/components/menus/APIKeysTab.tsx",
   `content: \`\${meta?.name || secretToDelete.key} API key deleted\`,`,
   `content: i18n.t("tools:menus.nameApiKeyDeleted", {
            defaultValue: "{{name}} API key deleted",
            name: meta?.name || secretToDelete.key
          }),`, 1],
  ["src/components/menus/APIKeysTab.tsx",
   "content: `Failed to delete secret: ${err instanceof Error ? err.message : String(err)}`,",
   `content: i18n.t("tools:menus.failedToDeleteSecret", {
            defaultValue: "Failed to delete secret: {{error}}",
            error: err instanceof Error ? err.message : String(err)
          }),`, 1],
  ["src/components/menus/APIKeysTab.tsx",
   'description={`No providers match "${searchTerm}"`}',
   'description={i18n.t("editor:ui.noProvidersMatch", { defaultValue: \'No providers match "{{term}}"\', term: searchTerm })}', 1],
  ["src/components/menus/APIKeysTab.tsx",
   `Paste the complete value copied from Higgsfield. The key
                      ID and secret will be encrypted and stored separately.`,
   `{i18n.t("editor:ui.pasteTheCompleteValueCopiedFromHiggsfield", { defaultValue: "Paste the complete value copied from Higgsfield. The key ID and secret will be encrypted and stored separately." })}`, 1],
  ["src/components/menus/APIKeysTab.tsx",
   `placeholder={\`Enter \${field.label.toLowerCase()}\`}`,
   `placeholder={i18n.t("editor:ui.enterLabel", { defaultValue: "Enter {{label}}", label: field.label.toLowerCase() })}`, 1],
  ["src/components/menus/APIKeysTab.tsx",
   `All fields will be encrypted and stored securely. Never
                      share them publicly.`,
   `{i18n.t("editor:ui.allFieldsWillBeEncryptedAndStoredSecurely", { defaultValue: "All fields will be encrypted and stored securely. Never share them publicly." })}`, 1],
  ["src/components/menus/APIKeysTab.tsx",
   `Your key will be encrypted and stored securely. Never
                      share it publicly.`,
   `{i18n.t("editor:ui.yourKeyWillBeEncryptedAndStoredSecurely", { defaultValue: "Your key will be encrypted and stored securely. Never share it publicly." })}`, 1],
  ["src/components/menus/APIKeysTab.tsx",
   "content={`Are you sure you want to delete the ${secretToDelete ? getParentProviderMeta(secretToDelete.key)?.name || secretToDelete.key : \"\"} API key?`}",
   `content={i18n.t("editor:ui.areYouSureYouWantToDeleteTheApiKey", {
          defaultValue: "Are you sure you want to delete the {{name}} API key?",
          name: secretToDelete ? getParentProviderMeta(secretToDelete.key)?.name || secretToDelete.key : ""
        })}`, 1],
  ["src/components/menus/APIKeysTab.tsx",
   `        confirmText="Delete"
        cancelText="Cancel"`,
   `        confirmText={i18n.t("common:action.delete", { defaultValue: "Delete" })}
        cancelText={i18n.t("common:action.cancel", { defaultValue: "Cancel" })}`, 1],
  ["src/components/menus/APIKeysTab.tsx",
   `All API keys are encrypted in the database and never exposed.`,
   `{i18n.t("editor:ui.allAPIKeysAreEncryptedInTheDatabaseAndNeverExposed", { defaultValue: "All API keys are encrypted in the database and never exposed." })}`, 1],
  ["src/components/menus/APIKeysTab.tsx",
   `            Learn more
          </EditorButton>`,
   `            {i18n.t("editor:ui.learnMore", { defaultValue: "Learn more" })}
          </EditorButton>`, 1],
  ["src/components/menus/APIKeysTab.tsx",
   `      title: "Troubleshooting",`,
   `      title: i18n.t("nav:settings.docsTopics.troubleshooting", { defaultValue: "Troubleshooting" }),`, 1],
  ["src/components/menus/APIKeysTab.tsx",
   `Get free credits and offers from our partner providers.`,
   `{i18n.t("editor:ui.getFreeCreditsAndOffersFromOurPartnerProviders", { defaultValue: "Get free credits and offers from our partner providers." })}`, 1],

  // ───────────────────────── ClipMaskMatte.tsx ─────────────────────────
  ["src/components/timeline/Inspector/ClipMaskMatte.tsx",
   `import { i18n } from "../../../i18n";`,
   `import { i18n, useAppLanguage } from "../../../i18n";`, 1],
  ["src/components/timeline/Inspector/ClipMaskMatte.tsx",
   `const MATTE_MODES = [
  { value: "alpha", label: "Alpha" },
  { value: "luma", label: "Luma" }
] as const;`,
   `const MATTE_MODES = [
  { value: "alpha", label: "Alpha" },
  { value: "luma", label: "Luma" }
] as const;

// labelKey pattern (registry §5): module tables keep their English labels as
// defaultValue anchors; consumers resolve per-language at render time.
const MASK_KIND_LABEL_KEYS: Record<(typeof MASK_KINDS)[number]["value"], string> = {
  rect: "catalog:snippets.rectangle",
  ellipse: "catalog:snippets.ellipse",
  path: "editor:ui.path"
};
const MATTE_MODE_LABEL_KEYS: Record<(typeof MATTE_MODES)[number]["value"], string> = {
  alpha: "timeline:attrs.alpha",
  luma: "timeline:attrs.luma"
};`, 1],
  ["src/components/timeline/Inspector/ClipMaskMatte.tsx",
   `    const [maskOpen, setMaskOpen] = usePersistedFold("mask");
    const [matteOpen, setMatteOpen] = usePersistedFold("matte");`,
   `    const [maskOpen, setMaskOpen] = usePersistedFold("mask");
    const [matteOpen, setMatteOpen] = usePersistedFold("matte");
    const { version: languageVersion } = useAppLanguage();`, 1],
  ["src/components/timeline/Inspector/ClipMaskMatte.tsx",
   `        { value: NO_MATTE, label: "None" },`,
   `        { value: NO_MATTE, label: i18n.t("catalog:dataTypes.none", { defaultValue: "None" }) },`, 1],
  ["src/components/timeline/Inspector/ClipMaskMatte.tsx",
   `      [clipNames]
    );`,
   `        [clipNames, languageVersion]
    );`, 1],
  ["src/components/timeline/Inspector/ClipMaskMatte.tsx",
   `                    options={MASK_KINDS}`,
   `                    options={MASK_KINDS.map((kind) => ({
                      value: kind.value,
                      label: i18n.t(MASK_KIND_LABEL_KEYS[kind.value], { defaultValue: kind.label })
                    }))}`, 1],
  ["src/components/timeline/Inspector/ClipMaskMatte.tsx",
   `                Enable the mask to cut this clip to a rectangle, an ellipse or
                an SVG path.`,
   `{i18n.t("timeline:attrs.enableTheMaskToCutThisClip", { defaultValue: "Enable the mask to cut this clip to a rectangle, an ellipse or an SVG path." })}`, 1],
  ["src/components/timeline/Inspector/ClipMaskMatte.tsx",
   `                      SVG path data in normalized 0..1 space. M, L, C, Q and Z.`,
   `{i18n.t("timeline:attrs.svgPathDataInNormalizedSpace", { defaultValue: "SVG path data in normalized 0..1 space. M, L, C, Q and Z." })}`, 1],
  ["src/components/timeline/Inspector/ClipMaskMatte.tsx",
   `                        options={MATTE_MODES}`,
   `                        options={MATTE_MODES.map((mode) => ({
                          value: mode.value,
                          label: i18n.t(MATTE_MODE_LABEL_KEYS[mode.value], { defaultValue: mode.label })
                        }))}`, 1],
  ["src/components/timeline/Inspector/ClipMaskMatte.tsx",
   `                  The source clip drives this layer&apos;s alpha and stops
                  drawing itself.`,
   `{i18n.t("timeline:attrs.theSourceClipDrivesThisLayersAlpha", { defaultValue: "The source clip drives this layer's alpha and stops drawing itself." })}`, 1],
  ["src/components/timeline/Inspector/ClipMaskMatte.tsx",
   `    const [open, setOpen] = usePersistedFold("subjectMatte");`,
   `    const [open, setOpen] = usePersistedFold("subjectMatte");
    const { version: languageVersion } = useAppLanguage();`, 1],
  ["src/components/timeline/Inspector/ClipMaskMatte.tsx",
   `        { value: result.assetId, label: "Current" },`,
   `        { value: result.assetId, label: i18n.t("editor:ui.current", { defaultValue: "Current" }) },`, 1],
  ["src/components/timeline/Inspector/ClipMaskMatte.tsx",
   `    }, [result]);`,
   `    }, [result, languageVersion]);`, 1],
  ["src/components/timeline/Inspector/ClipMaskMatte.tsx",
   `                  Cuts a mask from this clip&apos;s own source, so it stays
                  aligned through every trim and split.`,
   `{i18n.t("timeline:attrs.cutsAMaskFromThisClipsOwnSource", { defaultValue: "Cuts a mask from this clip's own source, so it stays aligned through every trim and split." })}`, 1],
  ["src/components/timeline/Inspector/ClipMaskMatte.tsx",
   `                    The clip has moved past what this matte covers. Regenerate
                    to cut it again.`,
   `{i18n.t("timeline:attrs.theClipHasMovedPastWhatThisMatteCovers", { defaultValue: "The clip has moved past what this matte covers. Regenerate to cut it again." })}`, 1],
  ["src/components/timeline/Inspector/ClipMaskMatte.tsx",
   `                  Regenerate runs the model again and keeps this result as a
                  version.`,
   `{i18n.t("timeline:attrs.regenerateRunsTheModelAgain", { defaultValue: "Regenerate runs the model again and keeps this result as a version." })}`, 1],

  // ───────────────────────── StoryboardBoard.tsx ─────────────────────────
  ["src/components/storyboard/StoryboardBoard.tsx",
   `import { i18n } from "../../i18n";`,
   `import { i18n, useAppLanguage } from "../../i18n";`, 1],
  ["src/components/storyboard/StoryboardBoard.tsx",
   `      captions.set(shot.id, \`Scene \${sceneIndex + 1} | Shot \${shotIndex + 1}\`);`,
   `      captions.set(
        shot.id,
        i18n.t("storyboard:attrs.sceneShotCaption", {
          defaultValue: "Scene {{scene}} | Shot {{shot}}",
          scene: sceneIndex + 1,
          shot: shotIndex + 1
        })
      );`, 1],
  ["src/components/storyboard/StoryboardBoard.tsx",
   `  useStoryboardShotFocus(boardId);`,
   `  useStoryboardShotFocus(boardId);
  const { version: languageVersion } = useAppLanguage();`, 1],
  ["src/components/storyboard/StoryboardBoard.tsx",
   `  const captions = useMemo(() => captionsByShotId(sceneGroups), [sceneGroups]);`,
   `  const captions = useMemo(
    () => captionsByShotId(sceneGroups),
    [sceneGroups, languageVersion]
  );`, 1],
  ["src/components/storyboard/StoryboardBoard.tsx",
   `            {priced
              ? \`\${requestCount} request\${requestCount === 1 ? "" : "s"} · about \${formatUsd(cost)}\${
                  partial
                    ? \` (\${pricedRequestCount} of \${requestCount} priced — the rest are not in any catalog)\`
                    : ""
                }\`
              : \`\${requestCount} request\${requestCount === 1 ? "" : "s"}, none of them priced.\`}`,
   `            {priced
              ? (requestCount === 1
                  ? i18n.t("storyboard:attrs.oneRequestAboutCost", {
                      defaultValue: "1 request · about {{cost}}",
                      cost: formatUsd(cost)
                    })
                  : i18n.t("storyboard:attrs.nRequestsAboutCost", {
                      defaultValue: "{{count}} requests · about {{cost}}",
                      count: requestCount,
                      cost: formatUsd(cost)
                    })) +
                (partial
                  ? i18n.t("storyboard:attrs.partialPricedSuffix", {
                      defaultValue: " ({{priced}} of {{total}} priced — the rest are not in any catalog)",
                      priced: pricedRequestCount,
                      total: requestCount
                    })
                  : "")
              : requestCount === 1
                ? i18n.t("storyboard:attrs.oneRequestNonePriced", {
                    defaultValue: "1 request, none of them priced."
                  })
                : i18n.t("storyboard:attrs.nRequestsNonePriced", {
                    defaultValue: "{{count}} requests, none of them priced.",
                    count: requestCount
                  })}`, 1],
  ["src/components/storyboard/StoryboardBoard.tsx",
   `              List price from the provider catalog. The render is billed by the
              provider at its own rates.`,
   `{i18n.t("storyboard:attrs.listPriceFromTheProviderCatalog", { defaultValue: "List price from the provider catalog. The render is billed by the provider at its own rates." })}`, 1],
  ["src/components/storyboard/StoryboardBoard.tsx",
   `        {priced
          ? \`Estimated cost: about \${formatUsd(cost)}\${
              pricedRequestCount < requestCount
                ? \` (\${pricedRequestCount} of \${requestCount} requests priced)\`
                : ""
            }\`
          : "Select a priced model to see the batch estimate."}`,
   `        {priced
          ? i18n.t("storyboard:attrs.estimatedCostAbout", {
              defaultValue: "Estimated cost: about {{cost}}",
              cost: formatUsd(cost)
            }) +
            (pricedRequestCount < requestCount
              ? i18n.t("storyboard:attrs.partialRequestsPricedSuffix", {
                  defaultValue: " ({{priced}} of {{total}} requests priced)",
                  priced: pricedRequestCount,
                  total: requestCount
                })
              : "")
          : i18n.t("storyboard:attrs.selectAPricedModelToSeeTheBatchEstimate", { defaultValue: "Select a priced model to see the batch estimate." })}`, 1],
  ["src/components/storyboard/StoryboardBoard.tsx",
   `    return [
      \`\${shots.length} shot\${shots.length === 1 ? "" : "s"}\`,
      style.trim().length > 0 ? \`\${style.trim()} style\` : null,
      entityNames.length > 0 ? \`entity: \${entityNames.join(", ")}\` : null
    ]
      .filter((part): part is string => part !== null)
      .join(" · ");
  }, [shots.length, style, entityIds, allEntities]);`,
   `    return [
      shots.length === 1
        ? i18n.t("storyboard:attrs.oneShot", { defaultValue: "1 shot" })
        : i18n.t("storyboard:attrs.nShots", {
            defaultValue: "{{count}} shots",
            count: shots.length
          }),
      style.trim().length > 0
        ? i18n.t("storyboard:attrs.styleSummary", {
            defaultValue: "{{style}} style",
            style: style.trim()
          })
        : null,
      entityNames.length > 0
        ? i18n.t("storyboard:attrs.entitySummary", {
            defaultValue: "entity: {{names}}",
            names: entityNames.join(", ")
          })
        : null
    ]
      .filter((part): part is string => part !== null)
      .join(" · ");
  }, [shots.length, style, entityIds, allEntities, languageVersion]);`, 1],
  ["src/components/storyboard/StoryboardBoard.tsx",
   `          <Text size="big">{title || "Untitled film"}</Text>`,
   `          <Text size="big">{title || i18n.t("storyboard:attrs.untitledFilm", { defaultValue: "Untitled film" })}</Text>`, 1],
  ["src/components/storyboard/StoryboardBoard.tsx",
   `                undoTooltip="Undo (⌘Z)"
                redoTooltip="Redo (⌘⇧Z)"`,
   `                undoTooltip={i18n.t("storyboard:attrs.undoCmdZ", { defaultValue: "Undo (⌘Z)" })}
                redoTooltip={i18n.t("storyboard:attrs.redoCmdZ", { defaultValue: "Redo (⌘⇧Z)" })}`, 1],
  ["src/components/storyboard/StoryboardBoard.tsx",
   `          confirmText={\`Render stills\${
            stillsCost.pricedRequestCount > 0 && stillsCost.cost > 0
              ? \` · ~\${formatUsd(stillsCost.cost)}\`
              : ""
          }\`}`,
   `          confirmText={\`\${i18n.t("storyboard:attrs.renderStills", { defaultValue: "Render stills" })}\${
            stillsCost.pricedRequestCount > 0 && stillsCost.cost > 0
              ? \` · ~\${formatUsd(stillsCost.cost)}\`
              : ""
          }\`}`, 1],
  ["src/components/storyboard/StoryboardBoard.tsx",
   `              Pick the model for this batch. The choice is remembered on every
              shot for one-click regeneration.`,
   `{i18n.t("storyboard:attrs.pickTheModelForThisBatch", { defaultValue: "Pick the model for this batch. The choice is remembered on every shot for one-click regeneration." })}`, 1],
  ["src/components/storyboard/StoryboardBoard.tsx",
   `          confirmText={\`Render clips\${
            clipsCost.pricedRequestCount > 0 && clipsCost.cost > 0
              ? \` · ~\${formatUsd(clipsCost.cost)}\`
              : ""
          }\`}`,
   `          confirmText={\`\${i18n.t("storyboard:attrs.renderClips", { defaultValue: "Render clips" })}\${
            clipsCost.pricedRequestCount > 0 && clipsCost.cost > 0
              ? \` · ~\${formatUsd(clipsCost.cost)}\`
              : ""
          }\`}`, 1],
  ["src/components/storyboard/StoryboardBoard.tsx",
   `              Pick a model for each kind of clip in this batch. Each shot keeps
              its choice for fast re-renders.`,
   `{i18n.t("storyboard:attrs.pickAModelForEachKindOfClip", { defaultValue: "Pick a model for each kind of clip in this batch. Each shot keeps its choice for fast re-renders." })}`, 1],
  ["src/components/storyboard/StoryboardBoard.tsx",
   `            <Text>
              {\`Directing writes a new screenplay and replaces all \${shots.length} current shot\${shots.length === 1 ? "" : "s"}.\`}
            </Text>`,
   `            <Text>
              {shots.length === 1
                ? i18n.t("storyboard:attrs.directingWritesANewScreenplayAndReplacesTheShot", { defaultValue: "Directing writes a new screenplay and replaces all 1 current shot." })
                : i18n.t("storyboard:attrs.directingWritesANewScreenplayAndReplacesAllShots", {
                    defaultValue: "Directing writes a new screenplay and replaces all {{count}} current shots.",
                    count: shots.length
                  })}
            </Text>`, 1],
  ["src/components/storyboard/StoryboardBoard.tsx",
   `              Generated stills and clips stay in your asset library, but the
              shots on this board are rebuilt from scratch.`,
   `{i18n.t("storyboard:attrs.generatedStillsAndClipsStayInYourAssetLibrary", { defaultValue: "Generated stills and clips stay in your asset library, but the shots on this board are rebuilt from scratch." })}`, 1],
  ["src/components/storyboard/StoryboardBoard.tsx",
   `                : \`This replaces \${replacedClipCount} storyboard-owned clip\${replacedClipCount === 1 ? "" : "s"}, including trims and edits made to those clips.\`}`,
   `                : replacedClipCount === 1
                  ? i18n.t("storyboard:attrs.thisReplacesTheStoryboardOwnedClip", { defaultValue: "This replaces 1 storyboard-owned clip, including trims and edits made to those clips." })
                  : i18n.t("storyboard:attrs.thisReplacesAllStoryboardOwnedClips", {
                      defaultValue: "This replaces {{count}} storyboard-owned clips, including trims and edits made to those clips.",
                      count: replacedClipCount
                    })}`, 1],
  ["src/components/storyboard/StoryboardBoard.tsx",
   `              Tracks and clips added outside this storyboard are preserved.
              {skippedAssemblyCount > 0
                ? \` \${skippedAssemblyCount} shot\${skippedAssemblyCount === 1 ? "" : "s"} without an accepted clip will be skipped.\`
                : ""}`,
   `              {i18n.t("storyboard:attrs.tracksAndClipsAddedOutsideThisStoryboardArePreserved", { defaultValue: "Tracks and clips added outside this storyboard are preserved." })}
              {skippedAssemblyCount > 0
                ? skippedAssemblyCount === 1
                  ? i18n.t("storyboard:attrs.oneShotWithoutAnAcceptedClipWillBeSkipped", { defaultValue: " 1 shot without an accepted clip will be skipped." })
                  : i18n.t("storyboard:attrs.nShotsWithoutAnAcceptedClipWillBeSkipped", {
                      defaultValue: " {{count}} shots without an accepted clip will be skipped.",
                      count: skippedAssemblyCount
                    })
                : ""}`, 1],
  ["src/components/storyboard/StoryboardBoard.tsx",
   `              Downloading now would use the older version currently stored on
              the server.`,
   `{i18n.t("storyboard:attrs.downloadingNowWouldUseTheOlderVersion", { defaultValue: "Downloading now would use the older version currently stored on the server." })}`, 1],
  ["src/components/storyboard/StoryboardBoard.tsx",
   `fallback={<LoadingSpinner size="small" text="Loading preview" />}`,
   `fallback={<LoadingSpinner size="small" text={i18n.t("appbuilder:attrs.loadingPreview", { defaultValue: "Loading preview" })} />}`, 1],
  ["src/components/storyboard/StoryboardBoard.tsx",
   "aria-label={`Scene ${sceneIndex + 1}`}",
   `aria-label={i18n.t("storyboard:attrs.sceneLabel", { defaultValue: "Scene {{n}}", n: sceneIndex + 1 })}`, 1],
  ["src/components/storyboard/StoryboardBoard.tsx",
   "label={`after ${captions.get(shot.id) ?? \"\"}`}",
   `label={i18n.t("storyboard:attrs.afterCaption", { defaultValue: "after {{caption}}", caption: captions.get(shot.id) ?? "" })}`, 1],
  ["src/components/storyboard/StoryboardBoard.tsx",
   `                        options={SHOT_COUNT_OPTIONS}`,
   `                        options={SHOT_COUNT_OPTIONS.map((option) => ({
                          value: option.value,
                          label: i18n.t("storyboard:attrs.nShots", {
                            defaultValue: "{{count}} shots",
                            count: option.value
                          })
                        }))}`, 1],
  ["src/components/storyboard/StoryboardBoard.tsx",
   `                {hasUnselectedClip
                  ? "Set a clip take as current to create a timeline."
                  : "Render a clip to create a timeline."}`,
   `                {hasUnselectedClip
                  ? i18n.t("storyboard:attrs.setAClipTakeAsCurrentToCreateATimeline", { defaultValue: "Set a clip take as current to create a timeline." })
                  : i18n.t("storyboard:attrs.renderAClipToCreateATimeline", { defaultValue: "Render a clip to create a timeline." })}`, 1],
];

let applied = 0;
const touched = new Set();
for (const [file, find, replace0, expected] of edits) {
  const replace = find.endsWith("}") && replace0.endsWith(")") ? replace0 + "}" : replace0;
  let src = readFileSync(file, "utf8");
  if (src.includes(replace)) {
    console.log(`skip (already applied): ${file} :: ${find.slice(0, 48).replace(/\n/g, "\\n")}`);
    continue;
  }
  const count = src.split(find).length - 1;
  if (count !== expected) {
    console.error(`FAIL ${file}: expected ${expected}, found ${count}\n--- find ---\n${find}`);
    process.exit(1);
  }
  src = src.split(find).join(replace);
  writeFileSync(file, src);
  applied += expected;
  touched.add(file);
}
console.log(`applied ${applied} edits across ${touched.size} files`);
